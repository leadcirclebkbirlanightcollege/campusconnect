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

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json(401, { success: false, code: "UNAUTHORIZED", message: "Missing authorization" });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const serviceSupabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return json(401, { success: false, code: "UNAUTHORIZED", message: "Invalid session" });
    }

    // Verify role (admin, super_admin, or faculty)
    const { data: roleData, error: roleError } = await serviceSupabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    const isAuthorized = roleData?.role === "admin" || roleData?.role === "super_admin" || roleData?.role === "faculty";
    if (roleError || !roleData || !isAuthorized) {
      return json(403, { success: false, code: "FORBIDDEN", message: "Admin or Faculty access required" });
    }

    const body = await req.json().catch(() => null);
    const lectureId = body?.lectureId;

    if (!lectureId) {
      return json(400, { success: false, code: "MISSING_LECTURE", message: "lectureId is required" });
    }

    // If faculty, enforce that they created or manage this lecture
    if (roleData.role === "faculty") {
      const { data: lec, error: lecErr } = await serviceSupabase
        .from("lectures")
        .select("created_by")
        .eq("id", lectureId)
        .single();

      if (lecErr || !lec || lec.created_by !== user.id) {
        return json(403, { success: false, code: "UNAUTHORIZED_LECTURE", message: "Faculty can only generate attendance for their own lectures" });
      }
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Generate random token for QR code (using native crypto)
    const tokenBytes = new Uint8Array(32);
    crypto.getRandomValues(tokenBytes);
    const token = Array.from(tokenBytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Hash OTP with SHA-256 (native, no external deps)
    const otpHash = await sha256Hex(otp);

    // Set expiry to 10 minutes
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // Upsert token for this lecture using service client
    const { error: upsertError } = await serviceSupabase
      .from("attendance_tokens")
      .upsert(
        {
          lecture_id: lectureId,
          token,
          otp_hash: otpHash,
          expires_at: expiresAt,
          is_active: true,
          used_count: 0,
          created_by: user.id,
          created_at: new Date().toISOString(),
        },
        { onConflict: "lecture_id" },
      );

    if (upsertError) {
      console.error("admin-generate-attendance: upsert error", upsertError);
      return json(500, { success: false, code: "UPSERT_FAILED", message: "Failed to generate attendance token" });
    }

    // Set lecture status to live
    await serviceSupabase
      .from("lectures")
      .update({ status: "live", updated_at: new Date().toISOString() })
      .eq("id", lectureId);

    console.log("attendance token generated for lecture", lectureId, "by user", user.id);

    return json(200, {
      success: true,
      otp,
      token,
      expiresAt,
      message: "Attendance token generated. OTP and QR valid for 10 minutes.",
    });
  } catch (error) {
    console.error("admin-generate-attendance: unexpected error", error);
    return json(500, { success: false, code: "INTERNAL_ERROR", message: "Something went wrong" });
  }
});
