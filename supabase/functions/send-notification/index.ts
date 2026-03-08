/**
 * send-notification edge function
 *
 * Sends an in-app notification AND fires Web Push to all subscribed recipients.
 * VAPID signing is done here using native Web Crypto (no external libraries).
 */
import { createClient } from "npm:@supabase/supabase-js@2.90.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type TargetType =
  | "all_colleges"
  | "college"
  | "admins_only"
  | "students_only"
  | "college_students"
  | "class"
  | "user";

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ── VAPID helpers ────────────────────────────────────────────────────────────

function toBase64Url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function fromBase64Url(str: string): Uint8Array {
  const padding = "=".repeat((4 - (str.length % 4)) % 4);
  const base64  = (str + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw     = atob(base64);
  const out     = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function buildVapidJwt(
  audience: string,
  subject: string,
  privateKeyPkcs8: Uint8Array
): Promise<string> {
  const header  = { alg: "ES256", typ: "JWT" };
  const payload = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: subject,
  };

  const enc       = new TextEncoder();
  const headerB64  = toBase64Url(enc.encode(JSON.stringify(header)));
  const payloadB64 = toBase64Url(enc.encode(JSON.stringify(payload)));
  const sigInput   = `${headerB64}.${payloadB64}`;

  const key = await crypto.subtle.importKey(
    "pkcs8",
    privateKeyPkcs8,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );
  const sigBuf  = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    enc.encode(sigInput)
  );

  return `${sigInput}.${toBase64Url(sigBuf)}`;
}

/** Encrypt the push payload using the content-encryption protocol (RFC 8188 / aes128gcm) */
async function encryptPayload(
  plaintext: string,
  p256dhBase64: string,
  authBase64: string
): Promise<{ ciphertext: Uint8Array; salt: Uint8Array; serverPublicKey: Uint8Array }> {
  const enc         = new TextEncoder();
  const plaintextBuf = enc.encode(plaintext);

  // Recipient public key
  const p256dhBytes = fromBase64Url(p256dhBase64);
  const recipientPublicKey = await crypto.subtle.importKey(
    "raw",
    p256dhBytes,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  // Auth secret
  const authBytes = fromBase64Url(authBase64);

  // Generate ephemeral key pair
  const senderKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey", "deriveBits"]
  );
  const senderPublicKeyRaw = new Uint8Array(
    await crypto.subtle.exportKey("raw", senderKeyPair.publicKey)
  );

  // ECDH shared secret
  const sharedSecret = await crypto.subtle.deriveBits(
    { name: "ECDH", public: recipientPublicKey },
    senderKeyPair.privateKey,
    256
  );

  // salt (16 bytes)
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // PRK via HKDF with auth as salt
  const prk = await crypto.subtle.importKey(
    "raw",
    await crypto.subtle.deriveBits(
      {
        name: "HKDF",
        hash: "SHA-256",
        salt: authBytes,
        info: new Uint8Array(
          (() => {
            const label = enc.encode("Content-Encoding: auth\0");
            return label;
          })()
        ),
      },
      await crypto.subtle.importKey("raw", sharedSecret, "HKDF", false, ["deriveBits"]),
      256
    ),
    "HKDF",
    false,
    ["deriveBits"]
  );

  // Build key + nonce via HKDF
  const keyInfo   = buildInfo("aesgcm", p256dhBytes, senderPublicKeyRaw);
  const nonceInfo = buildInfo("nonce", p256dhBytes, senderPublicKeyRaw);

  const contentKey = await crypto.subtle.importKey(
    "raw",
    await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info: keyInfo }, prk, 128),
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );
  const nonce = new Uint8Array(
    await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info: nonceInfo }, prk, 96)
  );

  // Add 2-byte padding (0x00 delimiter)
  const padded = new Uint8Array(2 + plaintextBuf.length);
  padded.set(plaintextBuf, 2);

  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, contentKey, padded)
  );

  return { ciphertext, salt, serverPublicKey: senderPublicKeyRaw };
}

function buildInfo(type: string, recipientPublicKey: Uint8Array, senderPublicKey: Uint8Array): Uint8Array {
  const enc  = new TextEncoder();
  const label = enc.encode(`Content-Encoding: ${type}\0`);
  // key_info = label || 0x00 || "P-256\0" || len(recipient) || recipient || len(sender) || sender
  const context = new Uint8Array(
    label.length + 1 + 6 + 2 + recipientPublicKey.length + 2 + senderPublicKey.length
  );
  let offset = 0;
  context.set(label, offset);              offset += label.length;
  context[offset++] = 0x00; // context type delimiter
  context.set(enc.encode("P-256\0"), offset); offset += 6;
  new DataView(context.buffer).setUint16(offset, recipientPublicKey.length, false); offset += 2;
  context.set(recipientPublicKey, offset); offset += recipientPublicKey.length;
  new DataView(context.buffer).setUint16(offset, senderPublicKey.length, false); offset += 2;
  context.set(senderPublicKey, offset);
  return context;
}

async function sendWebPush(
  endpoint: string,
  p256dh: string,
  auth: string,
  payload: object,
  vapidPublicKey: string,
  vapidPrivateKeyBytes: Uint8Array,
  subject: string
): Promise<void> {
  const url      = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;

  const jwt = await buildVapidJwt(audience, subject, vapidPrivateKeyBytes);

  const bodyStr = JSON.stringify(payload);
  const { ciphertext, salt, serverPublicKey } = await encryptPayload(bodyStr, p256dh, auth);

  // Build the encrypted body: salt (16) + rs (4) + keylen (1) + serverPublicKey + ciphertext
  const rs = 4096;
  const body = new Uint8Array(16 + 4 + 1 + serverPublicKey.length + ciphertext.length);
  let offset = 0;
  body.set(salt, offset);                          offset += 16;
  new DataView(body.buffer).setUint32(offset, rs, false); offset += 4;
  body[offset++] = serverPublicKey.length;
  body.set(serverPublicKey, offset);               offset += serverPublicKey.length;
  body.set(ciphertext, offset);

  await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "aes128gcm",
      TTL: "86400",
      Authorization: `vapid t=${jwt},k=${vapidPublicKey}`,
    },
    body,
  });
}

// ── Recipient resolution ─────────────────────────────────────────────────────

async function resolveRecipientIds(
  db: ReturnType<typeof createClient>,
  role: "admin" | "super_admin",
  callerCollegeId: string | null,
  targetType: TargetType,
  targetValue?: string | null,
): Promise<string[]> {
  const value = targetValue?.trim() || null;
  if (targetType === "user" && value) return [value];

  if (targetType === "all_colleges") {
    const { data, error } = await db.from("profiles").select("user_id").eq("is_deleted", false);
    if (error) throw error;
    return (data ?? []).map((r: any) => r.user_id);
  }
  if (targetType === "college") {
    if (!value) return [];
    const { data, error } = await db.from("user_roles").select("user_id").eq("college_id", value).in("role", ["student", "admin"]);
    if (error) throw error;
    return (data ?? []).map((r: any) => r.user_id);
  }
  if (targetType === "admins_only") {
    const { data, error } = await db.from("user_roles").select("user_id").eq("role", "admin");
    if (error) throw error;
    return (data ?? []).map((r: any) => r.user_id);
  }
  if (targetType === "students_only") {
    const { data, error } = await db.from("user_roles").select("user_id").eq("role", "student");
    if (error) throw error;
    return (data ?? []).map((r: any) => r.user_id);
  }
  if (targetType === "college_students") {
    const collegeId = role === "admin" ? callerCollegeId : value;
    if (!collegeId) return [];
    const { data, error } = await db.from("user_roles").select("user_id").eq("role", "student").eq("college_id", collegeId);
    if (error) throw error;
    return (data ?? []).map((r: any) => r.user_id);
  }
  if (targetType === "class") {
    if (!value || !callerCollegeId) return [];
    const { data, error } = await db.from("profiles").select("user_id").eq("college_id", callerCollegeId).eq("class_name", value).eq("is_deleted", false);
    if (error) throw error;
    return (data ?? []).map((r: any) => r.user_id);
  }
  return [];
}

// ── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey     = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json(401, { success: false, error: "Unauthorized" });

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData.user) return json(401, { success: false, error: "Invalid token" });

    const callerId = authData.user.id;
    const db       = createClient(supabaseUrl, serviceKey);

    const { data: roles, error: roleError } = await db
      .from("user_roles")
      .select("role,college_id")
      .eq("user_id", callerId)
      .in("role", ["admin", "super_admin"]);
    if (roleError) throw roleError;

    const caller = (roles ?? []).find((r: any) => r.role === "super_admin") ?? (roles ?? [])[0];
    if (!caller) return json(403, { success: false, error: "Admin access required" });

    const role           = caller.role as "admin" | "super_admin";
    const callerCollegeId = (caller.college_id as string | null) ?? null;

    const body = await req.json().catch(() => null) as {
      title?: string;
      message?: string;
      kind?: string;
      target_type?: TargetType;
      target_value?: string | null;
    } | null;

    const title       = body?.title?.trim();
    const message     = body?.message?.trim();
    const kind        = body?.kind?.trim() || "general";
    const targetType  = body?.target_type;
    const targetValue = body?.target_value ?? null;

    if (!title || !message || !targetType) {
      return json(400, { success: false, error: "title, message and target_type are required" });
    }

    const recipients = await resolveRecipientIds(db, role, callerCollegeId, targetType, targetValue);

    const preferenceColumnByKind: Record<string, string> = {
      announcement: "announcements",
      lecture_alert: "lecture_alerts",
      lecture_reminder: "lecture_alerts",
      achievement: "achievement_alerts",
      attendance_alert: "attendance_alerts",
      attendance_warning: "attendance_alerts",
      system_update: "system_updates",
    };

    const prefColumn = preferenceColumnByKind[kind] ?? null;

    let uniqRecipients = [...new Set(recipients)];

    if (prefColumn && uniqRecipients.length > 0) {
      const { data: prefRows, error: prefError } = await db
        .from("notification_preferences")
        .select(`user_id,${prefColumn}`)
        .in("user_id", uniqRecipients);

      if (prefError) throw prefError;

      const prefMap = new Map<string, boolean>();
      for (const row of prefRows ?? []) {
        const value = (row as Record<string, unknown>)[prefColumn];
        prefMap.set((row as { user_id: string }).user_id, value !== false);
      }

      uniqRecipients = uniqRecipients.filter((uid) => prefMap.get(uid) ?? true);
    }

    const nowIso = new Date().toISOString();
    const targetRole = targetType === "students_only" || targetType === "college_students" || targetType === "class"
      ? "student"
      : targetType === "admins_only"
        ? "admin"
        : null;
    const targetUserId = targetType === "user" ? targetValue : null;

    // ── 1. Create notification record ────────────────────────────────────────
    const { data: notification, error: notificationError } = await db
      .from("notifications")
      .insert({ title, body: message, kind, created_by: callerId, status: "sent", sent_at: nowIso, target_role: targetRole, target_user_id: targetUserId })
      .select("id")
      .single();
    if (notificationError) throw notificationError;

    // ── 2. Insert notification_recipients ────────────────────────────────────
    if (uniqRecipients.length > 0) {
      const { error: recipientError } = await db.from("notification_recipients").insert(
        uniqRecipients.map((userId) => ({ notification_id: notification.id, user_id: userId }))
      );
      if (recipientError) throw recipientError;
    }

    // ── 3. Web Push (fire-and-forget if VAPID keys configured) ───────────────
    const vapidPublicKey    = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKeyB64 = Deno.env.get("VAPID_PRIVATE_KEY");

    if (vapidPublicKey && vapidPrivateKeyB64 && uniqRecipients.length > 0) {
      try {
        const vapidPrivateKeyBytes = fromBase64Url(vapidPrivateKeyB64);

        // Fetch subscriptions for all recipients (batch, max 500)
        const { data: subs } = await db
          .from("push_subscriptions")
          .select("endpoint,p256dh,auth")
          .in("user_id", uniqRecipients.slice(0, 500));

        if (subs && subs.length > 0) {
          const pushPayload = { title, body: message, icon: "/pwa-512.png", data: { kind, notification_id: notification.id } };
          const subject     = `mailto:admin@campusconnect.app`;

          // Send all pushes concurrently (limit concurrency to 20)
          const chunks: any[][] = [];
          for (let i = 0; i < subs.length; i += 20) chunks.push(subs.slice(i, i + 20));
          for (const chunk of chunks) {
            await Promise.allSettled(
              chunk.map((sub: any) =>
                sendWebPush(sub.endpoint, sub.p256dh, sub.auth, pushPayload, vapidPublicKey, vapidPrivateKeyBytes, subject)
              )
            );
          }
          console.log(`send-notification: pushed to ${subs.length} device(s)`);
        }
      } catch (pushErr) {
        // Push failures are non-fatal — in-app notification was already saved
        console.error("send-notification: web push error (non-fatal)", pushErr);
      }
    }

    return json(200, { success: true, notification_id: notification.id, recipients: uniqRecipients.length });
  } catch (error) {
    console.error("send-notification error", error);
    return json(500, { success: false, error: "Internal server error" });
  }
});
