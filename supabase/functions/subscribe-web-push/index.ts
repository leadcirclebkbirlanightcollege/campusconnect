/**
 * subscribe-web-push
 * Saves or removes a browser PushSubscription for the authenticated user.
 * Also returns the VAPID public key so the client can call subscribe().
 *
 * POST { action: "subscribe", subscription: { endpoint, keys: { p256dh, auth } } }
 * POST { action: "unsubscribe", endpoint: string }
 * GET  → returns { vapidPublicKey }
 */
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

  const supabaseUrl  = Deno.env.get("SUPABASE_URL")!;
  const serviceKey   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey      = Deno.env.get("SUPABASE_ANON_KEY")!;
  const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");

  // GET → just return the public key (no auth needed)
  if (req.method === "GET") {
    if (!vapidPublicKey) {
      return json(503, { error: "VAPID not configured. Run the generate-vapid-keys function first." });
    }
    return json(200, { vapidPublicKey });
  }

  // All other methods require auth
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json(401, { error: "Unauthorized" });

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) return json(401, { error: "Invalid token" });

  const userId = authData.user.id;
  const db = createClient(supabaseUrl, serviceKey);

  const body = await req.json().catch(() => null);
  const action = body?.action;

  if (action === "subscribe") {
    const sub = body?.subscription;
    if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
      return json(400, { error: "Invalid subscription object" });
    }

    const { error } = await db
      .from("push_subscriptions")
      .upsert(
        {
          user_id:    userId,
          endpoint:   sub.endpoint,
          p256dh:     sub.keys.p256dh,
          auth:       sub.keys.auth,
          user_agent: req.headers.get("user-agent") ?? null,
        },
        { onConflict: "user_id,endpoint" }
      );

    if (error) {
      console.error("subscribe-web-push: upsert error", error);
      return json(500, { error: "Failed to save subscription" });
    }
    return json(200, { success: true });
  }

  if (action === "unsubscribe") {
    const endpoint = body?.endpoint;
    if (!endpoint) return json(400, { error: "endpoint required" });

    const { error } = await db
      .from("push_subscriptions")
      .delete()
      .eq("user_id", userId)
      .eq("endpoint", endpoint);

    if (error) {
      console.error("subscribe-web-push: delete error", error);
      return json(500, { error: "Failed to remove subscription" });
    }
    return json(200, { success: true });
  }

  return json(400, { error: "action must be subscribe or unsubscribe" });
});
