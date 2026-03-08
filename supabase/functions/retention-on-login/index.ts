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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey     = Deno.env.get("SUPABASE_ANON_KEY")!;

  try {
    // 1) Validate JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json(401, { success: false, code: "UNAUTHORIZED", message: "Unauthorized" });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) {
      return json(401, { success: false, code: "INVALID_TOKEN", message: "Invalid token" });
    }

    const userId = String(claims.claims.sub);
    const db = createClient(supabaseUrl, serviceKey);

    // NOTE: Streak and daily rewards have been moved to the `daily-checkin` edge function.
    // This function now only handles session registration and intelligence recompute on login.

    // Recompute intelligence (best-effort, non-blocking)
    try {
      await db.functions.invoke("recompute-intelligence", { body: { userId } });
    } catch (e) {
      console.error("recompute-intelligence failed (non-blocking)", e);
    }

    return json(200, {
      success: true,
      message: "Login processed. Use the daily-checkin function for streak and reward.",
    });
  } catch (error) {
    console.error("retention-on-login error:", error);
    return json(500, { success: false, code: "INTERNAL", message: "Internal server error" });
  }
});
