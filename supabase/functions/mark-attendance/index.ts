import { createClient } from "npm:@supabase/supabase-js@2.90.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json(401, { success: false, code: "UNAUTHORIZED", message: "Missing authorization" });
  }

  const jwt = authHeader.slice("Bearer ".length);
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const userSupabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const db = createClient(supabaseUrl, serviceKey);

  try {
    // 1. Validate JWT
    const { data: claimsData, error: claimsError } = await userSupabase.auth.getClaims(jwt);
    if (claimsError || !claimsData?.claims?.sub) {
      return json(401, { success: false, code: "INVALID_TOKEN", message: "Invalid session" });
    }
    const userId = claimsData.claims.sub;

    // 2. Parse input
    let body: any;
    try {
      body = await req.json();
    } catch {
      return json(400, { success: false, code: "INVALID_BODY", message: "Invalid request body" });
    }

    const lectureId = String(body?.lectureId ?? "").trim();
    const otp = typeof body?.otp === "string" ? body.otp.trim() : undefined;
    const token = typeof body?.token === "string" ? body.token.trim() : undefined;

    if (!lectureId) {
      return json(400, { success: false, code: "MISSING_LECTURE", message: "Lecture ID is required" });
    }
    if (!otp && !token) {
      return json(400, { success: false, code: "MISSING_CREDENTIAL", message: "OTP or token is required" });
    }

    // 3. Verify student role
    const { data: isStudent } = await db.rpc("is_student", { check_user_id: userId });
    if (!isStudent) {
      return json(403, { success: false, code: "NOT_STUDENT", message: "Student access required" });
    }

    // 4. Verify lecture exists and is LIVE
    const { data: lecture, error: lectureError } = await db
      .from("lectures")
      .select("id, status")
      .eq("id", lectureId)
      .maybeSingle();

    if (lectureError || !lecture) {
      return json(404, { success: false, code: "LECTURE_NOT_FOUND", message: "Lecture not found" });
    }

    if (lecture.status !== "live") {
      return json(400, {
        success: false,
        code: "LECTURE_NOT_LIVE",
        message: "Attendance can only be marked for live lectures",
      });
    }

    // 5. Validate attendance token
    const { data: tokenRow, error: tokenError } = await db
      .from("attendance_tokens")
      .select("id, lecture_id, is_active, expires_at, token, otp_hash, used_count")
      .eq("lecture_id", lectureId)
      .maybeSingle();

    if (tokenError || !tokenRow || !tokenRow.is_active) {
      return json(400, {
        success: false,
        code: "NO_ACTIVE_TOKEN",
        message: "No active attendance session for this lecture",
      });
    }

    // 6. Check expiry
    const now = new Date();
    const expiresAt = new Date(tokenRow.expires_at);
    if (Number.isNaN(expiresAt.getTime()) || expiresAt <= now) {
      return json(410, {
        success: false,
        code: "OTP_EXPIRED",
        message: "Attendance window has closed. Contact your lecturer.",
      });
    }

    // 7. Validate OTP/token — use timing-safe SHA-256 comparison only (no string equality)
    let isValid = false;
    if (otp) {
      const hash = String(tokenRow.otp_hash ?? "");
      const otpHash = await sha256Hex(otp);
      // Timing-safe byte comparison via crypto.subtle.timingSafeEqual equivalent
      // Both sides are hex strings of equal length — compare encoded bytes
      const enc = new TextEncoder();
      const a = enc.encode(otpHash.padEnd(64, "\0"));
      const b = enc.encode(hash.padEnd(64, "\0"));
      let diff = 0;
      for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
      isValid = diff === 0 && otpHash.length === hash.length && hash.length > 0;
    } else if (token) {
      // QR token: timing-safe comparison
      const enc = new TextEncoder();
      const maxLen = Math.max(token.length, tokenRow.token?.length ?? 0);
      const a = enc.encode((token).padEnd(maxLen, "\0"));
      const b = enc.encode((tokenRow.token ?? "").padEnd(maxLen, "\0"));
      let diff = 0;
      for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
      isValid = diff === 0 && token.length === (tokenRow.token ?? "").length;
    }

    if (!isValid) {
      return json(400, {
        success: false,
        code: "INVALID_OTP",
        message: "Invalid OTP or token. Please check and try again.",
      });
    }

    // 8. Check for existing attendance (idempotent)
    const { data: existing } = await db
      .from("attendance")
      .select("id")
      .eq("lecture_id", lectureId)
      .eq("student_user_id", userId)
      .maybeSingle();

    if (existing) {
      return json(200, {
        success: true,
        attendance_marked: false,
        already_marked: true,
        points_awarded: false,
        message: "Attendance already recorded",
      });
    }

    // 9. INSERT attendance (primary source of truth)
    const pointsEarned = 10;
    const { error: attendanceError } = await db.from("attendance").insert({
      lecture_id: lectureId,
      student_user_id: userId,
      status: "present",
      points_earned: pointsEarned,
    });

    if (attendanceError) {
      // Handle unique constraint violation (duplicate)
      if (attendanceError.code === "23505") {
        return json(200, {
          success: true,
          attendance_marked: false,
          already_marked: true,
          points_awarded: false,
          message: "Attendance already recorded",
        });
      }
      console.error("mark-attendance: insert failed", attendanceError);
      return json(500, {
        success: false,
        code: "INSERT_FAILED",
        message: "Failed to record attendance. Please try again.",
      });
    }

    // 10. Insert points (best-effort, non-blocking — never rolls back attendance)
    let pointsAwarded = false;
    try {
      const { error: ledgerError } = await db.from("points_ledger").insert({
        user_id: userId,
        points: pointsEarned,
        source: "attendance",
        source_id: lectureId,
        note: "Attendance marked for lecture",
      });
      pointsAwarded = !ledgerError;
      if (ledgerError) console.error("mark-attendance: points insert failed (non-blocking)", ledgerError);
    } catch (e) {
      console.error("mark-attendance: points exception (non-blocking)", e);
    }

    // 11. Increment used count (best-effort)
    try {
      await db
        .from("attendance_tokens")
        .update({ used_count: (Number(tokenRow.used_count ?? 0)) + 1 })
        .eq("id", tokenRow.id);
    } catch (e) {
      console.error("mark-attendance: used_count update failed", e);
    }

    // 12. Trigger intelligence recompute (fire-and-forget)
    try {
      await fetch(`${supabaseUrl}/functions/v1/recompute-intelligence`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({ userId }),
      });
    } catch (e) {
      console.error("mark-attendance: intelligence recompute failed (non-blocking)", e);
    }

    console.log("mark-attendance: success", { userId, lectureId, pointsAwarded });

    return json(200, {
      success: true,
      attendance_marked: true,
      already_marked: false,
      points_awarded: pointsAwarded,
      message: "Attendance marked successfully",
    });
  } catch (error) {
    console.error("mark-attendance: unexpected error", error);
    return json(500, {
      success: false,
      code: "INTERNAL_ERROR",
      message: "Something went wrong. Please try again.",
    });
  }
});
