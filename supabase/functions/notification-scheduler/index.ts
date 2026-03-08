import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ScheduledNotificationRow = {
  id: string;
  status: "scheduled";
  title: string;
  body: string;
  kind: string;
  scheduled_for: string | null;
  target_role: "admin" | "student" | null;
  target_user_id: string | null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const oneSignalAppId = Deno.env.get("ONESIGNAL_APP_ID");
    const oneSignalApiKey = Deno.env.get("ONESIGNAL_REST_API_KEY");

    // ── Security: NOTIFICATION_CRON_SECRET is REQUIRED ──────────────────────
    // If the secret is not configured, reject all requests to prevent
    // unauthenticated execution with service-role privileges.
    const expected = Deno.env.get("NOTIFICATION_CRON_SECRET");
    if (!expected) {
      console.error("notification-scheduler: NOTIFICATION_CRON_SECRET env var is not set");
      return new Response(JSON.stringify({ error: "Scheduler misconfigured" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate secret from request body OR Authorization header
    let secretProvided: string | undefined;
    try {
      const body = await req.clone().json().catch(() => null);
      secretProvided = body?.secret as string | undefined;
    } catch { /* ignore parse errors */ }

    // Also accept secret as Bearer token for cron jobs that use auth headers
    if (!secretProvided) {
      const authHeader = req.headers.get("Authorization");
      if (authHeader?.startsWith("Bearer ")) {
        secretProvided = authHeader.slice("Bearer ".length);
      }
    }

    if (!secretProvided || secretProvided !== expected) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // ────────────────────────────────────────────────────────────────────────

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const nowIso = new Date().toISOString();

    const { data: due, error: dueError } = await supabase
      .from("notifications")
      .select("id,status,scheduled_for,target_role,target_user_id")
      .eq("status", "scheduled")
      .lte("scheduled_for", nowIso)
      .limit(50);

    if (dueError) {
      console.error("scheduler: due query error", dueError);
      return new Response(JSON.stringify({ error: "Failed to query scheduled notifications" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const dueRows = (due ?? []) as ScheduledNotificationRow[];
    if (dueRows.length === 0) {
      return new Response(JSON.stringify({ ok: true, processed: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let processed = 0;
    let recipientsInserted = 0;

    for (const n of dueRows) {
      const { error: updError } = await supabase
        .from("notifications")
        .update({ status: "sent", sent_at: nowIso })
        .eq("id", n.id)
        .eq("status", "scheduled");

      if (updError) {
        console.error("scheduler: update error", n.id, updError);
        continue;
      }

      let userIds: string[] = [];

      if (n.target_user_id) {
        userIds = [n.target_user_id];
      } else if (n.target_role) {
        const { data: roles, error: rolesError } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", n.target_role);
        if (rolesError) {
          console.error("scheduler: roles error", n.id, rolesError);
          processed += 1;
          continue;
        }
        const roleUserIds = (roles ?? []).map((r: any) => r.user_id) as string[];
        if (roleUserIds.length > 0) {
          const { data: profiles, error: profilesError } = await supabase
            .from("profiles")
            .select("user_id,is_deleted")
            .in("user_id", roleUserIds);
          if (profilesError) {
            console.error("scheduler: profiles error", n.id, profilesError);
            processed += 1;
            continue;
          }
          userIds = (profiles ?? []).filter((p: any) => !p.is_deleted).map((p: any) => p.user_id) as string[];
        }
      }

      if (userIds.length > 0) {
        const { data: existing, error: existingError } = await supabase
          .from("notification_recipients")
          .select("user_id")
          .eq("notification_id", n.id);
        if (existingError) {
          console.error("scheduler: existing recipients error", n.id, existingError);
          processed += 1;
          continue;
        }
        const existingSet = new Set((existing ?? []).map((e: any) => e.user_id) as string[]);
        const toInsert = userIds.filter((uid) => !existingSet.has(uid));

        if (toInsert.length > 0) {
          const { error: insError } = await supabase
            .from("notification_recipients")
            .insert(toInsert.map((uid) => ({ notification_id: n.id, user_id: uid })));
          if (insError) {
            console.error("scheduler: insert recipients error", n.id, insError);
          } else {
            recipientsInserted += toInsert.length;
          }
        }
      }

      processed += 1;
    }

    console.log("scheduler: done", { processed, recipientsInserted });

    return new Response(JSON.stringify({ ok: true, processed, recipientsInserted }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("scheduler: unexpected", error);
    return new Response(JSON.stringify({ error: "An unexpected error occurred" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
