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

type Body = {
  userId: string;
  pointsDelta: number;
  reason: string;
};

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json(401, { error: "Unauthorized" });

  const jwt = authHeader.slice("Bearer ".length);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const caller = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const admin = createClient(supabaseUrl, serviceKey);

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }

  const userId = String(body?.userId ?? "").trim();
  const reason = String(body?.reason ?? "").trim();
  const pointsDelta = Number(body?.pointsDelta);

  if (!isUuid(userId)) return json(400, { error: "Select a valid student" });
  if (!Number.isFinite(pointsDelta) || !Number.isInteger(pointsDelta) || pointsDelta === 0) {
    return json(400, { error: "pointsDelta must be a non-zero integer" });
  }
  if (!reason || reason.length < 2) return json(400, { error: "Reason is required" });
  if (reason.length > 200) return json(400, { error: "Reason must be 200 characters or less" });

  try {
    const { data: claimsData, error: claimsError } = await caller.auth.getClaims(jwt);
    if (claimsError || !claimsData?.claims?.sub) return json(401, { error: "Unauthorized" });
    const adminUserId = claimsData.claims.sub;

    const { data: isAdmin, error: isAdminError } = await admin.rpc("is_admin", {
      check_user_id: adminUserId,
    });
    if (isAdminError) {
      console.error("admin-adjust-points: admin check failed", isAdminError);
      return json(500, { error: "Failed to verify admin role" });
    }
    if (!isAdmin) return json(403, { error: "Admin access required" });

    const { error: insertError } = await admin.from("points_ledger").insert({
      user_id: userId,
      points: pointsDelta,
      // Allowed by DB constraint points_ledger_source_check
      source: "manual",
      note: reason,
      created_by: adminUserId,
      metadata: {
        kind: pointsDelta > 0 ? "add" : "deduct",
        reason,
      },
    });
    if (insertError) {
      console.error("admin-adjust-points: insert failed", insertError);
      return json(400, { error: insertError.message });
    }

    return json(200, { success: true });
  } catch (err) {
    console.error("admin-adjust-points: unexpected error", err);
    return json(500, { error: "Unexpected error" });
  }
});
