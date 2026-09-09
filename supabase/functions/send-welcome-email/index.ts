/// <reference path="../deno.d.ts" />

/**
 * send-welcome-email Edge Function
 *
 * Dispatches a professional, transactional Campus Connect "Profile Created / Welcome" email
 * via Zoho SMTP to the newly registered student.
 *
 * Requirements:
 * - NO CTA buttons, NO action links, NO onboarding URLs in email content.
 * - Purely informational transactional notification that account has been created.
 * - Server-side only: zero SMTP credentials exposed to frontend.
 * - Idempotency: database-backed deduplication (profiles.welcome_email_sent_at & welcome_email_logs).
 * - Non-blocking: failures are logged safely for diagnostics without interrupting student onboarding.
 * - Responsive HTML email + plain-text fallback.
 */
import { createClient } from "npm:@supabase/supabase-js@2.90.1";
import nodemailer from "npm:nodemailer@6.9.16";

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

function generateWelcomeHtml(studentName: string): string {
  const safeName = studentName.replace(/[&<>"']/g, (m) => {
    switch (m) {
      case "&": return "&amp;";
      case "<": return "&lt;";
      case ">": return "&gt;";
      case '"': return "&quot;";
      case "'": return "&#39;";
      default: return m;
    }
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Campus Connect — Your Account Has Been Created</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #0b0f17;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      -webkit-font-smoothing: antialiased;
    }
    table {
      border-collapse: collapse;
    }
    .wrapper {
      width: 100%;
      background-color: #0b0f17;
      padding: 40px 16px;
    }
    .card {
      max-width: 560px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.25);
    }
    .header-bar {
      background: linear-gradient(135deg, #0b1220 0%, #172554 100%);
      padding: 28px 32px;
      text-align: left;
    }
    .brand-table td {
      vertical-align: middle;
    }
    .brand-icon {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background-color: rgba(37, 99, 235, 0.2);
      border: 1px solid rgba(59, 130, 246, 0.4);
      display: inline-block;
      text-align: center;
      line-height: 40px;
    }
    .brand-title {
      font-size: 20px;
      font-weight: 800;
      color: #ffffff;
      letter-spacing: -0.02em;
      margin: 0;
      padding-left: 12px;
    }
    .brand-tagline {
      font-size: 11px;
      font-weight: 600;
      color: #93c5fd;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      margin: 2px 0 0 0;
      padding-left: 12px;
    }
    .content {
      padding: 36px 32px 28px 32px;
    }
    h1 {
      font-size: 22px;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 16px 0;
      letter-spacing: -0.01em;
    }
    p {
      font-size: 15px;
      line-height: 1.6;
      color: #334155;
      margin: 0 0 14px 0;
    }
    .highlight-box {
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-left: 4px solid #1a56db;
      border-radius: 8px;
      padding: 16px 18px;
      margin: 22px 0 16px 0;
    }
    .highlight-title {
      margin: 0 0 6px 0;
      font-size: 13px;
      font-weight: 700;
      color: #1e293b;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    .highlight-text {
      margin: 0;
      font-size: 14px;
      color: #334155;
      line-height: 1.55;
    }
    .footer {
      background-color: #f8fafc;
      padding: 24px 32px;
      border-top: 1px solid #e2e8f0;
      font-size: 12px;
      color: #475569;
      line-height: 1.5;
    }
    .footer-brand {
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 2px;
    }
    .footer-inst {
      color: #64748b;
    }
    .footer-motto {
      font-style: italic;
      color: #475569;
      margin-top: 4px;
    }
    .footer-note {
      font-size: 11px;
      color: #94a3b8;
      margin-top: 8px;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <div class="card">
            <!-- Header -->
            <div class="header-bar">
              <table role="presentation" cellpadding="0" cellspacing="0" class="brand-table">
                <tr>
                  <td>
                    <div class="brand-icon">
                      <img src="https://campusconnect.indevs.in/icons/icon-192.png" alt="Campus Connect" width="30" height="30" style="display:inline-block; vertical-align:middle; border-radius:6px;" onerror="this.style.display='none'" />
                    </div>
                  </td>
                  <td>
                    <p class="brand-title">Campus Connect</p>
                    <p class="brand-tagline">By Students For Students</p>
                  </td>
                </tr>
              </table>
            </div>

            <!-- Content (Strictly Informational — ZERO CTA buttons and ZERO action links) -->
            <div class="content">
              <h1>Hello ${safeName},</h1>
              <p>Welcome to Campus Connect.</p>
              <p>Your Campus Connect account has been successfully created.</p>
              <p>You can now continue completing your profile and onboarding directly inside the Campus Connect application.</p>
              
              <div class="highlight-box">
                <p class="highlight-title">IMPORTANT:</p>
                <p class="highlight-text">
                  Your college identity verification is still required before your account can receive full student access. Please complete the required onboarding information and submit your official college ID card for administrative verification.
                </p>
              </div>
            </div>

            <!-- Footer -->
            <div class="footer">
              <div class="footer-brand">Campus Connect</div>
              <div class="footer-inst">B. K. Birla Night Arts, Science &amp; Commerce College, Kalyan</div>
              <div class="footer-motto">&ldquo;By Students For Students&rdquo;</div>
              <div class="footer-note">This is an automated transactional message regarding your account creation.</div>
            </div>
          </div>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`;
}

function generateWelcomeText(studentName: string): string {
  return `Hello ${studentName},

Welcome to Campus Connect.

Your Campus Connect account has been successfully created.

You can now continue completing your profile and onboarding directly inside the Campus Connect application.

IMPORTANT:
Your college identity verification is still required before your account can receive full student access. Please complete the required onboarding information and submit your official college ID card for administrative verification.

--
Campus Connect
B. K. Birla Night Arts, Science & Commerce College, Kalyan
"By Students For Students"
`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // 1. Authenticate caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json(401, { success: false, error: "Unauthorized" });
    }

    const caller = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: callerUser }, error: authError } = await caller.auth.getUser();
    if (authError || !callerUser) {
      return json(401, { success: false, error: "Invalid session" });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);

    // 2. Parse request body
    const body = (await req.json().catch(() => ({}))) as {
      user_id?: string;
      email?: string;
      name?: string;
    };

    const targetUserId = (body.user_id || callerUser.id).trim();

    // Security: non-admin callers can only request welcome email for themselves
    if (targetUserId !== callerUser.id) {
      const { data: callerRole } = await admin
        .from("user_roles")
        .select("role")
        .eq("user_id", callerUser.id)
        .maybeSingle();
      const role = callerRole?.role;
      if (role !== "admin" && role !== "super_admin") {
        return json(403, { success: false, error: "Forbidden" });
      }
    }

    // 3. Persistent Idempotency Check in DB
    const { data: profile, error: profileErr } = await admin
      .from("profiles")
      .select("user_id, email, name, first_name, welcome_email_sent_at")
      .eq("user_id", targetUserId)
      .maybeSingle();

    if (profileErr) {
      console.error("[send-welcome-email] DB profile lookup error:", profileErr);
    }

    // A. Check profiles table sentinel
    if (profile?.welcome_email_sent_at) {
      return json(200, {
        success: true,
        status: "already_sent",
        sent_at: profile.welcome_email_sent_at,
        message: "Welcome email has already been sent to this user.",
      });
    }

    // B. Check dedicated welcome_email_logs table
    const { data: existingLog } = await admin
      .from("welcome_email_logs")
      .select("status, sent_at")
      .eq("user_id", targetUserId)
      .maybeSingle();

    if (existingLog?.status === "sent") {
      return json(200, {
        success: true,
        status: "already_sent",
        sent_at: existingLog.sent_at,
        message: "Welcome email has already been sent to this user.",
      });
    }

    // 4. Resolve recipient and display name
    const recipientEmail = (profile?.email || body.email || callerUser.email || "").trim().toLowerCase();
    if (!recipientEmail || !recipientEmail.includes("@")) {
      return json(400, { success: false, error: "Valid recipient email is required" });
    }

    const displayName =
      (profile?.first_name || profile?.name || body.name || recipientEmail.split("@")[0] || "Student").trim();

    const nowIso = new Date().toISOString();

    // 5. Check SMTP Configuration
    const smtpHost = Deno.env.get("ZOHO_SMTP_HOST") || "smtppro.zoho.in";
    const smtpPort = Number(Deno.env.get("ZOHO_SMTP_PORT") || 465);
    const smtpSecure = (Deno.env.get("ZOHO_SMTP_SECURE") ?? "true") === "true";
    const smtpUser = Deno.env.get("ZOHO_SMTP_USER") || "noreply@campusconnect.indevs.in";
    const smtpPassword = Deno.env.get("ZOHO_SMTP_PASSWORD");

    if (!smtpPassword) {
      console.warn(
        "[send-welcome-email] ZOHO_SMTP_PASSWORD secret is not configured in Supabase Edge Functions. Safely recording pending delivery without blocking user onboarding."
      );

      await admin.from("welcome_email_logs").upsert(
        {
          user_id: targetUserId,
          email: recipientEmail,
          status: "pending",
          error_message: "ZOHO_SMTP_PASSWORD secret is not configured in Supabase Edge Functions",
          updated_at: nowIso,
        },
        { onConflict: "user_id" }
      );

      return json(200, {
        success: false,
        status: "skipped_no_credentials",
        message: "ZOHO_SMTP_PASSWORD secret is not configured in Supabase Edge Functions",
      });
    }

    // 6. Dispatch Email via Zoho SMTP
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPassword,
      },
      connectionTimeout: 10000,
      greetingTimeout: 5000,
      socketTimeout: 10000,
    });

    const htmlContent = generateWelcomeHtml(displayName);
    const textContent = generateWelcomeText(displayName);

    try {
      await transporter.sendMail({
        from: `Campus Connect <${smtpUser}>`,
        to: recipientEmail,
        subject: "Welcome to Campus Connect — Your Account Has Been Created",
        text: textContent,
        html: htmlContent,
      });

      // 7. Mark as sent ONLY upon verified provider acceptance
      await admin.from("welcome_email_logs").upsert(
        {
          user_id: targetUserId,
          email: recipientEmail,
          status: "sent",
          sent_at: nowIso,
          error_message: null,
          updated_at: nowIso,
        },
        { onConflict: "user_id" }
      );

      await admin
        .from("profiles")
        .update({ welcome_email_sent_at: nowIso })
        .eq("user_id", targetUserId);

      try {
        await admin.from("audit_logs").insert({
          action: "welcome_email_sent",
          performed_by: callerUser.id,
          target_entity: "profiles",
          target_id: targetUserId,
          details: { to: recipientEmail, sent_at: nowIso },
        });
      } catch {
        // Audit log insert is non-fatal
      }

      console.log(`[send-welcome-email] Successfully delivered welcome email to ${recipientEmail}`);

      return json(200, {
        success: true,
        status: "sent",
        sent_at: nowIso,
        recipient: recipientEmail,
      });
    } catch (smtpErr: any) {
      console.error("[send-welcome-email] SMTP delivery failed:", smtpErr?.message);

      // Record failure in diagnostics log for server-side retry
      await admin.from("welcome_email_logs").upsert(
        {
          user_id: targetUserId,
          email: recipientEmail,
          status: "failed",
          error_message: smtpErr?.message || "Unknown SMTP error",
          updated_at: nowIso,
        },
        { onConflict: "user_id" }
      );

      return json(200, {
        success: false,
        status: "failed",
        error: smtpErr?.message || "SMTP error",
      });
    }
  } catch (err: any) {
    console.error("[send-welcome-email] Unexpected error:", err);
    return json(200, {
      success: false,
      status: "unexpected_error",
      error: err?.message || "Internal error",
    });
  }
});
