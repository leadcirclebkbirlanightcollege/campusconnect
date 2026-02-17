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

    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return json(401, { success: false, code: "UNAUTHORIZED", message: "Invalid session" });
    }

    // Verify admin role
    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (roleError || !roleData || roleData.role !== "admin") {
      return json(403, { success: false, code: "NOT_ADMIN", message: "Admin access required" });
    }

    const body = await req.json().catch(() => null);
    const lectureId = body?.lectureId;

    if (!lectureId) {
      return json(400, { success: false, code: "MISSING_LECTURE", message: "lectureId is required" });
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

    // Upsert token for this lecture
    const { data: upsertData, error: upsertError } = await supabase
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
      )
      .select("id, lecture_id")
      .maybeSingle();

    if (upsertError) {
      console.error("admin-generate-attendance: upsert error", upsertError);
      return json(500, { success: false, code: "UPSERT_FAILED", message: "Failed to generate attendance token" });
    }

    console.log("admin-generate-attendance: token generated for lecture", lectureId);

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
