// Lovable Cloud backend function: lecture lifecycle + auto-notifications
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Action = "upsert_reminders" | "go_live" | "end";

type Body = {
  action: Action;
  lectureId: string;
};

type LectureRow = {
  id: string;
  topic: string;
  venue: string;
  start_at: string;
  end_at: string;
  status: "scheduled" | "live" | "ended";
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authedClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });

    const { data: userData, error: userError } = await authedClient.auth.getUser();
    if (userError) return json({ ok: false, error: userError.message }, 401);
    if (!userData.user) return json({ ok: false, error: "Not authenticated" }, 401);

    const { data: isAdmin, error: adminError } = await authedClient.rpc("is_admin", {
      check_user_id: userData.user.id,
    });
    if (adminError) return json({ ok: false, error: adminError.message }, 403);
    if (!isAdmin) return json({ ok: false, error: "Admin only" }, 403);

    const body = (await req.json()) as Body;
    if (!body?.lectureId || !body?.action) return json({ ok: false, error: "Missing lectureId/action" }, 400);

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: lecture, error: lectureError } = await adminClient
      .from("lectures")
      .select("id, topic, venue, start_at, end_at, status")
      .eq("id", body.lectureId)
      .maybeSingle<LectureRow>();

    if (lectureError) return json({ ok: false, error: lectureError.message }, 400);
    if (!lecture) return json({ ok: false, error: "Lecture not found" }, 404);

    const now = new Date();

    if (body.action === "go_live") {
      const { error } = await adminClient
        .from("lectures")
        .update({ status: "live", live_started_at: now.toISOString(), ended_at: null })
        .eq("id", lecture.id);
      if (error) return json({ ok: false, error: error.message }, 400);
      return json({ ok: true });
    }

    if (body.action === "end") {
      const { error: updateErr } = await adminClient
        .from("lectures")
        .update({ status: "ended", ended_at: now.toISOString() })
        .eq("id", lecture.id);
      if (updateErr) return json({ ok: false, error: updateErr.message }, 400);

      // Create "lecture ended" notification (sent immediately)
      const { data: notif, error: notifErr } = await adminClient
        .from("notifications")
        .insert({
          title: "Lecture ended",
          body: `Lecture “${lecture.topic}” has ended.`,
          status: "sent",
          sent_at: now.toISOString(),
          created_by: userData.user.id,
          target_role: "student",
          target_user_id: null,
          scheduled_for: null,
          lecture_id: lecture.id,
          kind: "lecture_ended",
        })
        .select("id")
        .maybeSingle<{ id: string }>();
      if (notifErr) return json({ ok: false, error: notifErr.message }, 400);

      // Fan-out to all active students (dedupe)
      const { data: studentUserIds, error: studentErr } = await adminClient
        .from("user_roles")
        .select("user_id")
        .eq("role", "student");
      if (studentErr) return json({ ok: false, error: studentErr.message }, 400);

      const ids = (studentUserIds ?? []).map((r) => r.user_id);
      if (ids.length === 0) return json({ ok: true, recipientsInserted: 0 });

      const { data: activeProfiles, error: profErr } = await adminClient
        .from("profiles")
        .select("user_id")
        .in("user_id", ids)
        .eq("is_deleted", false);
      if (profErr) return json({ ok: false, error: profErr.message }, 400);

      const activeIds = new Set((activeProfiles ?? []).map((p) => p.user_id));

      const { data: existing, error: existingErr } = await adminClient
        .from("notification_recipients")
        .select("user_id")
        .eq("notification_id", notif?.id ?? "");
      if (existingErr) return json({ ok: false, error: existingErr.message }, 400);

      const existingSet = new Set((existing ?? []).map((r) => r.user_id));

      const rows = Array.from(activeIds)
        .filter((id) => !existingSet.has(id))
        .map((id) => ({ notification_id: notif!.id, user_id: id }));

      let inserted = 0;
      if (rows.length > 0) {
        const { error: insErr } = await adminClient.from("notification_recipients").insert(rows);
        if (insErr) return json({ ok: false, error: insErr.message }, 400);
        inserted = rows.length;
      }

      return json({ ok: true, recipientsInserted: inserted });
    }

    // action === upsert_reminders
    const startAt = new Date(lecture.start_at);

    const offsets = [60, 30, 15, 10, 5, 1];
    let scheduled = 0;

    for (const minutes of offsets) {
      const scheduledFor = new Date(startAt.getTime() - minutes * 60_000);
      if (scheduledFor <= now) continue;

      const kind = `lecture_reminder_${minutes}`;
      const { error } = await adminClient.from("notifications").insert({
        title: `Lecture starts in ${minutes} min`,
        body: `“${lecture.topic}” starts in ${minutes} minute(s). Venue: ${lecture.venue}.`,
        status: "scheduled",
        scheduled_for: scheduledFor.toISOString(),
        created_by: userData.user.id,
        target_role: "student",
        target_user_id: null,
        lecture_id: lecture.id,
        kind,
      });

      // Ignore duplicates (unique index) but fail on other errors
      if (error) {
        const msg = (error as any).message ?? "";
        if (!msg.toLowerCase().includes("duplicate")) {
          return json({ ok: false, error: msg }, 400);
        }
      } else {
        scheduled += 1;
      }
    }

    return json({ ok: true, remindersScheduled: scheduled });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
