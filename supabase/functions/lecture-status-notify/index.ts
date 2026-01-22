import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Body = {
  lecture_id: string;
  status: "live" | "ended";
};

function formatTimeRange(start: string | null, end: string | null) {
  if (!start && !end) return "";
  if (start && end) return `${start}–${end}`;
  return start ?? end ?? "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const authed = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userRes, error: userErr } = await authed.auth.getUser();
    if (userErr || !userRes.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: isAdmin, error: adminErr } = await authed.rpc("is_admin", {
      check_user_id: userRes.user.id,
    });
    if (adminErr || !isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json().catch(() => null)) as Body | null;
    if (!body?.lecture_id || (body.status !== "live" && body.status !== "ended")) {
      return new Response(JSON.stringify({ error: "Invalid request" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: lecture, error: lectureErr } = await admin
      .from("lectures")
      .select("id,topic,lecture_date,start_time,end_time,venue")
      .eq("id", body.lecture_id)
      .maybeSingle();

    if (lectureErr || !lecture) {
      return new Response(JSON.stringify({ error: "Lecture not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const timeRange = formatTimeRange(lecture.start_time ?? null, lecture.end_time ?? null);
    const when = [lecture.lecture_date, timeRange].filter(Boolean).join(" • ");

    const nowIso = new Date().toISOString();
    const title =
      body.status === "live" ? `Lecture is LIVE: ${lecture.topic}` : `Lecture ended: ${lecture.topic}`;
    const bodyText =
      body.status === "live"
        ? `Now live${lecture.venue ? ` at ${lecture.venue}` : ""}${when ? `. ${when}` : ""}.`
        : `This lecture has ended${when ? `. ${when}` : ""}.`;

    // Create notification record
    const { data: notif, error: notifErr } = await admin
      .from("notifications")
      .insert({
        title,
        body: bodyText,
        status: "sent",
        sent_at: nowIso,
        scheduled_for: null,
        target_role: "student",
        target_user_id: null,
      })
      .select("id")
      .single();

    if (notifErr || !notif) {
      console.error("lecture-status-notify: insert notification error", notifErr);
      return new Response(JSON.stringify({ error: "Failed to create notification" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve recipients (all active students)
    const { data: roles, error: rolesErr } = await admin
      .from("user_roles")
      .select("user_id")
      .eq("role", "student");

    if (rolesErr) {
      console.error("lecture-status-notify: roles error", rolesErr);
      return new Response(JSON.stringify({ error: "Failed to resolve recipients" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const roleUserIds = (roles ?? []).map((r: any) => r.user_id) as string[];
    if (roleUserIds.length === 0) {
      return new Response(JSON.stringify({ ok: true, notification_id: notif.id, recipientsInserted: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profiles, error: profilesErr } = await admin
      .from("profiles")
      .select("user_id,is_deleted")
      .in("user_id", roleUserIds);

    if (profilesErr) {
      console.error("lecture-status-notify: profiles error", profilesErr);
      return new Response(JSON.stringify({ error: "Failed to resolve recipients" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userIds = (profiles ?? [])
      .filter((p: any) => !p.is_deleted)
      .map((p: any) => p.user_id) as string[];

    if (userIds.length === 0) {
      return new Response(JSON.stringify({ ok: true, notification_id: notif.id, recipientsInserted: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: insErr } = await admin
      .from("notification_recipients")
      .insert(userIds.map((uid) => ({ notification_id: notif.id, user_id: uid })));

    if (insErr) {
      console.error("lecture-status-notify: insert recipients error", insErr);
      return new Response(JSON.stringify({ error: "Failed to create recipients" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ ok: true, notification_id: notif.id, recipientsInserted: userIds.length }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("lecture-status-notify: unexpected", error);
    return new Response(JSON.stringify({ error: "An unexpected error occurred" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
