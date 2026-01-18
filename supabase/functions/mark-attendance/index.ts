import { createClient } from "npm:@supabase/supabase-js@2.90.1";
import { compareSync } from "https://esm.sh/bcryptjs@2.4.3";
import { crypto } from "https://deno.land/std@0.177.0/crypto/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function sha256Hex(input: string) {
  const encoder = new TextEncoder();
  return crypto.subtle.digest("SHA-256", encoder.encode(input)).then((hashBuffer) =>
    Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join(""),
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    console.warn("mark-attendance: missing/invalid Authorization header");
    return json(401, { error: "Unauthorized" });
  }

  const jwt = authHeader.slice("Bearer ".length);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const userSupabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const serviceSupabase = createClient(supabaseUrl, serviceKey);

  try {
    // 1) Authenticated user exists
    const { data: claimsData, error: claimsError } = await userSupabase.auth.getClaims(jwt);
    if (claimsError || !claimsData?.claims?.sub) {
      console.warn("mark-attendance: invalid JWT", claimsError);
      return json(401, { error: "Unauthorized" });
    }
    const userId = claimsData.claims.sub;

    console.log("mark-attendance: user", userId);

    // Parse + validate input
    let body: any;
    try {
      body = await req.json();
    } catch {
      return json(400, { error: "Invalid JSON body" });
    }

    const lectureId = String(body?.lectureId ?? "").trim();
    const otp = typeof body?.otp === "string" ? body.otp.trim() : undefined;
    const token = typeof body?.token === "string" ? body.token.trim() : undefined;

    if (!lectureId) return json(400, { error: "lectureId is required" });
    if (!otp && !token) return json(400, { error: "Either otp or token is required" });

    // 2) User role = student
    const { data: isStudent, error: roleError } = await serviceSupabase.rpc("is_student", {
      check_user_id: userId,
    });
    if (roleError) {
      console.error("mark-attendance: role check failed", roleError);
      return json(400, { error: "Failed to verify role" });
    }
    if (!isStudent) return json(403, { error: "Student access required" });

    // 3) Lecture exists
    const { data: lecture, error: lectureError } = await serviceSupabase
      .from("lectures")
      .select("id")
      .eq("id", lectureId)
      .maybeSingle();

    if (lectureError) {
      console.error("mark-attendance: lecture lookup failed", lectureError);
      return json(400, { error: "Failed to verify lecture" });
    }
    if (!lecture) return json(400, { error: "Lecture not found" });

    // 4) Attendance token exists, is_active=true
    const { data: tokenRow, error: tokenError } = await serviceSupabase
      .from("attendance_tokens")
      .select("id, lecture_id, is_active, expires_at, token, otp_hash, used_count")
      .eq("lecture_id", lectureId)
      .maybeSingle();

    if (tokenError) {
      console.error("mark-attendance: token lookup failed", tokenError);
      return json(400, { error: "Failed to verify attendance token" });
    }

    if (!tokenRow || !tokenRow.is_active) {
      return json(400, { error: "No active attendance token found for this lecture" });
    }

    // 5) expires_at > now()
    const now = new Date();
    const expiresAt = new Date(tokenRow.expires_at);
    if (Number.isNaN(expiresAt.getTime()) || expiresAt <= now) {
      return json(410, { error: "Attendance token has expired" });
    }

    // 6) OTP hash comparison using bcrypt (support legacy SHA-256)
    let isValid = false;
    if (otp) {
      const hash = String(tokenRow.otp_hash ?? "");
      if (hash.startsWith("$2")) {
        isValid = compareSync(otp, hash);
      } else {
        // legacy SHA-256
        const otpHash = await sha256Hex(otp);
        isValid = otpHash === hash;
      }
    } else if (token) {
      isValid = token === tokenRow.token;
    }

    if (!isValid) return json(400, { error: "Invalid OTP or token" });

    // 7) Ensure attendance not already marked
    const { data: existing, error: existingError } = await serviceSupabase
      .from("attendance")
      .select("id")
      .eq("lecture_id", lectureId)
      .eq("student_user_id", userId)
      .maybeSingle();

    if (existingError) {
      console.error("mark-attendance: existing attendance check failed", existingError);
      return json(400, { error: "Failed to verify existing attendance" });
    }

    if (existing) return json(400, { error: "Attendance already marked for this lecture" });

    // Mark attendance
    const pointsEarned = 10;

    const { error: attendanceError } = await serviceSupabase.from("attendance").insert({
      lecture_id: lectureId,
      student_user_id: userId,
      status: "present",
      points_earned: pointsEarned,
    });

    if (attendanceError) {
      console.error("mark-attendance: insert attendance failed", attendanceError);
      return json(400, { error: "Failed to mark attendance" });
    }

    // Points ledger (best-effort)
    const { error: ledgerError } = await serviceSupabase.from("points_ledger").insert({
      user_id: userId,
      points: pointsEarned,
      source: "attendance",
      source_id: lectureId,
      note: "Attendance marked for lecture",
    });
    if (ledgerError) console.error("mark-attendance: ledger insert failed", ledgerError);

    // Increment used count (best-effort)
    const usedCount = Number(tokenRow.used_count ?? 0);
    const { error: usedError } = await serviceSupabase
      .from("attendance_tokens")
      .update({ used_count: usedCount + 1 })
      .eq("id", tokenRow.id);
    if (usedError) console.error("mark-attendance: used_count update failed", usedError);

    console.log("mark-attendance: success", { userId, lectureId });
    return json(200, { success: true });
  } catch (error) {
    console.error("mark-attendance: unexpected error", error);
    // Keep contract limited to requested codes.
    return json(400, { error: "Unexpected error" });
  }
});
