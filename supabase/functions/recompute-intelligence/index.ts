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

/** Attendance Consistency (0–100) */
function calcAttendanceConsistency(attendedIds: string[], allIds: string[], limit = 10): number {
  if (allIds.length === 0) return 100;
  const recent = allIds.slice(-limit);
  const set = new Set(attendedIds);
  let score = 0, consec = 0, penalty = 0;
  for (const id of recent) {
    if (set.has(id)) { score++; consec = 0; }
    else { consec++; penalty += consec * 2; }
  }
  const pct = (score / recent.length) * 100;
  return Math.max(0, Math.min(100, Math.round(pct - penalty)));
}

/** Behaviour Reliability (0–100) */
function calcReliability(attended: number, total: number, overrides: number, penalties: number): number {
  const ratio = total > 0 ? attended / total : 1;
  let s = ratio * 70;
  s -= Math.min(15, overrides * 5);
  s -= Math.min(15, penalties * 3);
  s += 30 * ratio;
  return Math.max(0, Math.min(100, Math.round(s)));
}

/** Engagement Index (0–100) */
function calcEngagement(attPct: number, points: number, polls: number, programmes: number): number {
  return Math.max(0, Math.min(100, Math.round(
    attPct * 0.4 +
    Math.min(30, (points / 100) * 30) +
    Math.min(15, polls * 5) +
    Math.min(15, programmes * 7.5)
  )));
}

function determineTier(ac: number, br: number, ei: number): string {
  const avg = (ac + br + ei) / 3;
  if (avg >= 85) return "elite";
  if (avg >= 70) return "gold";
  if (avg >= 50) return "silver";
  return "bronze";
}

function detectFlags(attPct: number, ac: number, br: number, consec: number): string[] {
  const flags: string[] = [];
  if (attPct < 50) flags.push("Low attendance");
  if (br < 50) flags.push("Low reliability");
  if (consec >= 3) flags.push(`${consec} consecutive absences`);
  if (ac < 40) flags.push("Declining attendance trend");
  return flags;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const db = createClient(supabaseUrl, serviceKey);

  try {
    let body: any = {};
    try { body = await req.json(); } catch { /* empty body ok */ }

    const targetUserId = body?.userId;

    // Get list of student user_ids to recompute
    let userIds: string[] = [];
    if (targetUserId) {
      userIds = [targetUserId];
    } else {
      const { data: roles } = await db.from("user_roles").select("user_id").eq("role", "student");
      userIds = (roles ?? []).map((r: any) => r.user_id);
    }

    if (userIds.length === 0) return json(200, { success: true, computed: 0 });

    const { data: allLectures } = await db.from("lectures").select("id").order("lecture_date", { ascending: true });
    const allLectureIds = (allLectures ?? []).map((l: any) => l.id);

    let computed = 0;

    for (const userId of userIds) {
      const [
        { data: myAtt },
        { data: pts },
        { data: pollV },
        { data: progs },
        { data: penLedger },
      ] = await Promise.all([
        db.from("attendance").select("lecture_id").eq("student_user_id", userId).eq("status", "present"),
        db.from("points_ledger").select("points, source").eq("user_id", userId),
        db.from("poll_votes").select("id").eq("user_id", userId),
        db.from("student_programme_allotments").select("id").eq("student_user_id", userId),
        db.from("points_ledger").select("points").eq("user_id", userId).lt("points", 0),
      ]);

      const attendedIds = (myAtt ?? []).map((a: any) => a.lecture_id);
      const totalPoints = (pts ?? []).reduce((s: number, r: any) => s + r.points, 0);
      const overrides = (pts ?? []).filter((p: any) => p.source === "manual").length;
      const penalties = (penLedger ?? []).length;
      const attPct = allLectureIds.length > 0 ? (attendedIds.length / allLectureIds.length) * 100 : 100;

      let consec = 0;
      const attSet = new Set(attendedIds);
      for (let i = allLectureIds.length - 1; i >= 0; i--) {
        if (!attSet.has(allLectureIds[i])) consec++;
        else break;
      }

      const ac = calcAttendanceConsistency(attendedIds, allLectureIds);
      const br = calcReliability(attendedIds.length, allLectureIds.length, overrides, penalties);
      const ei = calcEngagement(attPct, totalPoints, (pollV ?? []).length, (progs ?? []).length);
      const tier = determineTier(ac, br, ei);
      const riskFlags = detectFlags(attPct, ac, br, consec);

      // Upsert intelligence
      await db.from("student_intelligence").upsert({
        user_id: userId,
        attendance_consistency: ac,
        behaviour_reliability: br,
        engagement_index: ei,
        tier,
        risk_flags: riskFlags,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

      // Manage flags: clear old unresolved, insert new
      await db.from("student_flags")
        .update({ resolved_at: new Date().toISOString() })
        .eq("user_id", userId)
        .is("resolved_at", null);

      if (riskFlags.length > 0) {
        await db.from("student_flags").insert(
          riskFlags.map((f) => ({ user_id: userId, flag_type: f, reason: f }))
        );
      }

      computed++;
    }

    console.log(`recompute-intelligence: computed ${computed} students`);
    return json(200, { success: true, computed });
  } catch (error) {
    console.error("recompute-intelligence: error", error);
    return json(500, { success: false, error: "Internal error" });
  }
});
