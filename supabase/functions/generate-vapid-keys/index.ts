/**
 * generate-vapid-keys  (one-time setup, super_admin only)
 *
 * Generates a VAPID key pair using Web Crypto and returns the keys.
 * The admin must then save VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY as secrets.
 *
 * Alternatively, if VAPID keys are already set as env vars, returns them
 * (private key masked for security).
 */
import { createClient } from "npm:@supabase/supabase-js@2.90.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Base64url encode a Uint8Array */
function toBase64Url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Check existing keys
  const existingPublic  = Deno.env.get("VAPID_PUBLIC_KEY");
  const existingPrivate = Deno.env.get("VAPID_PRIVATE_KEY");

  if (existingPublic && existingPrivate) {
    return new Response(
      JSON.stringify({
        already_set: true,
        vapidPublicKey: existingPublic,
        vapidPrivateKey: "***hidden***",
        message: "VAPID keys are already configured.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Require super_admin to generate new keys
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey     = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) {
    return new Response(JSON.stringify({ error: "Invalid token" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const db = createClient(supabaseUrl, serviceKey);
  const { data: roles } = await db
    .from("user_roles")
    .select("role")
    .eq("user_id", authData.user.id)
    .eq("role", "super_admin")
    .limit(1);

  if (!roles?.length) {
    return new Response(JSON.stringify({ error: "super_admin only" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Generate ECDH P-256 key pair for VAPID
  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey"]
  );

  const publicKeyBuffer  = await crypto.subtle.exportKey("raw", keyPair.publicKey);
  const privateKeyBuffer = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey);

  const vapidPublicKey  = toBase64Url(publicKeyBuffer);
  const vapidPrivateKey = toBase64Url(privateKeyBuffer);

  return new Response(
    JSON.stringify({
      generated: true,
      vapidPublicKey,
      vapidPrivateKey,
      instructions: [
        "Save these as secrets VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY.",
        "The private key is shown ONCE — store it securely.",
        "VAPID_PUBLIC_KEY is also needed in your frontend.",
      ],
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
