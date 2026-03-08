import { createClient } from "npm:@supabase/supabase-js@2.90.1";

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

/**
 * Resolve a login identifier to an email.
 * - If identifier looks like an email, we return it as-is.
 * - Otherwise, treat it as a student_id and look up the associated profile email.
 *
 * NOTE: This endpoint intentionally does NOT reveal whether a user exists.
 * The client should show a generic "Invalid credentials" message on failures.
 */
type Body = {
  identifier: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    let body: Body | null = null;
    try {
      body = (await req.json()) as Body;
    } catch {
      return json(400, { error: "Invalid JSON body" });
    }

    const identifier = String(body?.identifier ?? "").trim();
    if (!identifier) return json(400, { error: "identifier is required" });

    // Email: return as-is
    if (EMAIL_RE.test(identifier)) {
      return json(200, { email: identifier.toLowerCase() });
    }

    // Student ID: resolve via profiles
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("email,is_deleted")
      .eq("student_id", identifier)
      .maybeSingle();

    // Always return HTTP 200 regardless of outcome to prevent student-ID enumeration.
    // The client should show a generic "Invalid credentials" message when email is null.
    if (error || !profile || profile.is_deleted || !profile.email) {
      return json(200, { email: null });
    }

    return json(200, { email: String(profile.email).toLowerCase() });
  } catch (e) {
    console.error("auth-resolve-identifier: unexpected", e);
    return json(500, { error: "Unexpected error" });
  }
});
