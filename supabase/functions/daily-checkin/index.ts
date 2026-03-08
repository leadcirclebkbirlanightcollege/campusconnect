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

function toISODate(d = new Date()) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

const CHECKIN_POINTS = 10;
const MILESTONE_REWARDS: { streak: number; bonus: number; code: string; label: string }[] = [
  { streak: 7,   bonus: 20, code: "streak_7_days",   label: "7-Day Streak Champion" },
  { streak: 14,  bonus: 30, code: "streak_14_days",  label: "2-Week Warrior" },
  { streak: 30,  bonus: 50, code: "streak_30_days",  label: "Monthly Master" },
  { streak: 100, bonus: 100, code: "streak_100_days", label: "Century Legend" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey     = Deno.env.get("SUPABASE_ANON_KEY")!;

  try {
    // 1) Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json(401, { success: false, code: "UNAUTHORIZED" });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) {
      return json(401, { success: false, code: "INVALID_TOKEN" });
    }

    const userId = String(claims.claims.sub);
    const db = createClient(supabaseUrl, serviceKey);
    const today = toISODate();

    // 2) Check already checked-in today (idempotent)
    const { data: existing } = await db
      .from("daily_checkins")
      .select("id")
      .eq("user_id", userId)
      .eq("checkin_date", today)
      .maybeSingle();

    if (existing) {
      // Already checked in — return current streak info
      const { data: streakRow } = await db
        .from("student_streaks")
        .select("current_streak, longest_streak")
        .eq("user_id", userId)
        .maybeSingle();

      return json(200, {
        success: true,
        already_checked_in: true,
        points_awarded: 0,
        current_streak: (streakRow as any)?.current_streak ?? 0,
        longest_streak: (streakRow as any)?.longest_streak ?? 0,
        milestone: null,
      });
    }

    // 3) Get profile college_id
    const { data: profile } = await db
      .from("profiles")
      .select("college_id")
      .eq("user_id", userId)
      .maybeSingle();
    const collegeId = (profile as any)?.college_id ?? null;

    // 4) Insert check-in
    const { error: checkinErr } = await db.from("daily_checkins").insert({
      user_id: userId,
      college_id: collegeId,
      checkin_date: today,
    });

    if (checkinErr) {
      // Race condition — another request already inserted
      if (
        checkinErr.message?.toLowerCase().includes("unique") ||
        checkinErr.message?.toLowerCase().includes("duplicate")
      ) {
        return json(200, {
          success: true,
          already_checked_in: true,
          points_awarded: 0,
          current_streak: 0,
          longest_streak: 0,
          milestone: null,
        });
      }
      return json(500, { success: false, code: "CHECKIN_INSERT_FAILED", message: checkinErr.message });
    }

    // 5) Update streak
    const { data: streakRow } = await db
      .from("student_streaks")
      .select("current_streak, longest_streak, last_login_date")
      .eq("user_id", userId)
      .maybeSingle();

    let currentStreak = 1;
    let longestStreak = 1;

    if (streakRow) {
      const last = (streakRow as any).last_login_date ? String((streakRow as any).last_login_date) : null;
      const prevStreak = (streakRow as any).current_streak ?? 0;
      const prevLongest = (streakRow as any).longest_streak ?? 0;

      if (last) {
        const lastDate  = new Date(`${last}T00:00:00Z`);
        const todayDate = new Date(`${today}T00:00:00Z`);
        const diffDays  = Math.round((todayDate.getTime() - lastDate.getTime()) / 86_400_000);

        if (diffDays === 1) {
          // Consecutive day
          currentStreak = prevStreak + 1;
        } else {
          // Streak broken
          currentStreak = 1;
        }
      } else {
        currentStreak = 1;
      }

      longestStreak = Math.max(prevLongest, currentStreak);

      await db.from("student_streaks").update({
        current_streak: currentStreak,
        longest_streak: longestStreak,
        last_login_date: today,
        updated_at: new Date().toISOString(),
      }).eq("user_id", userId);
    } else {
      // First ever check-in
      await db.from("student_streaks").upsert({
        user_id: userId,
        current_streak: 1,
        longest_streak: 1,
        last_login_date: today,
        updated_at: new Date().toISOString(),
      });
    }

    // 6) Award base points
    await db.from("points_ledger").insert({
      user_id: userId,
      points: CHECKIN_POINTS,
      source: "daily_checkin",
      note: `Daily check-in — ${today}`,
      college_id: collegeId,
      metadata: { checkin_date: today, streak: currentStreak },
    });

    // 7) Milestone rewards (bonus points + achievement)
    let milestone: { streak: number; bonus: number; code: string; label: string } | null = null;

    for (const m of MILESTONE_REWARDS) {
      if (currentStreak === m.streak) {
        milestone = m;
        // Check if achievement already granted
        const { data: existingAch } = await db
          .from("student_achievements")
          .select("id")
          .eq("user_id", userId)
          .eq("code", m.code)
          .maybeSingle();

        if (!existingAch) {
          // Grant achievement
          await db.from("student_achievements").insert({
            user_id: userId,
            code: m.code,
            metadata: { streak: currentStreak, date: today, label: m.label },
          }).catch(() => {}); // best-effort

          // Bonus points
          if (m.bonus > 0) {
            await db.from("points_ledger").insert({
              user_id: userId,
              points: m.bonus,
              source: "daily_checkin",
              note: `Streak milestone: ${m.label}`,
              college_id: collegeId,
              metadata: { milestone: m.code, streak: currentStreak },
            }).catch(() => {});
          }
        }
        break;
      }
    }

    // 8) Recompute intelligence (best-effort)
    db.functions.invoke("recompute-intelligence", { body: { userId } }).catch(() => {});

    return json(200, {
      success: true,
      already_checked_in: false,
      points_awarded: CHECKIN_POINTS + (milestone?.bonus ?? 0),
      current_streak: currentStreak,
      longest_streak: longestStreak,
      milestone: milestone
        ? { code: milestone.code, label: milestone.label, bonus: milestone.bonus }
        : null,
    });
  } catch (error) {
    console.error("daily-checkin error:", error);
    return json(500, { success: false, code: "INTERNAL", message: "Internal server error" });
  }
});
