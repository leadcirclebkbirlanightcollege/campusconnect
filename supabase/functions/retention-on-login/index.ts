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

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  try {
    // 1) Validate JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json(401, { success: false, code: "UNAUTHORIZED", message: "Unauthorized" });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) {
      return json(401, { success: false, code: "INVALID_TOKEN", message: "Invalid token" });
    }

    const userId = String(claims.claims.sub);

    // 2) Service DB client
    const db = createClient(supabaseUrl, serviceKey);

    // 3) Idempotent streak update (date-boundary safe)
    const today = toISODate();

    const { data: existing, error: streakReadErr } = await db
      .from("student_streaks")
      .select("user_id,current_streak,longest_streak,last_login_date")
      .eq("user_id", userId)
      .maybeSingle();

    if (streakReadErr) {
      return json(500, { success: false, code: "STREAK_READ_FAILED", message: "Failed to read streak" });
    }

    let streakUpdated = false;
    let streakIncremented = false;
    let currentStreak = 0;
    let longestStreak = 0;

    if (!existing) {
      currentStreak = 1;
      longestStreak = 1;
      const { error: upsertErr } = await db
        .from("student_streaks")
        .upsert({
          user_id: userId,
          current_streak: 1,
          longest_streak: 1,
          last_login_date: today,
          updated_at: new Date().toISOString(),
        });
      if (upsertErr) {
        return json(500, { success: false, code: "STREAK_WRITE_FAILED", message: "Failed to update streak" });
      }
      streakUpdated = true;
      streakIncremented = true;
    } else {
      currentStreak = existing.current_streak ?? 0;
      longestStreak = existing.longest_streak ?? 0;

      const last = existing.last_login_date ? String(existing.last_login_date) : null;
      if (last === today) {
        // same-day login: no change (idempotent)
        streakUpdated = false;
      } else {
        const lastDate = last ? new Date(`${last}T00:00:00Z`) : null;
        const todayDate = new Date(`${today}T00:00:00Z`);
        const diffDays = lastDate ? Math.round((todayDate.getTime() - lastDate.getTime()) / 86_400_000) : 999;

        if (diffDays === 1) {
          currentStreak = Math.max(0, currentStreak) + 1;
          streakIncremented = true;
        } else {
          currentStreak = 1;
          streakIncremented = true;
        }

        longestStreak = Math.max(longestStreak, currentStreak);

        const { error: upsertErr } = await db
          .from("student_streaks")
          .update({
            current_streak: currentStreak,
            longest_streak: longestStreak,
            last_login_date: today,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId);

        if (upsertErr) {
          return json(500, { success: false, code: "STREAK_WRITE_FAILED", message: "Failed to update streak" });
        }

        streakUpdated = true;
      }
    }

    // 4) Daily reward: grant once/day; points failure must not break reward log
    let dailyRewardGranted = false;
    let pointsAwarded = 0;
    let rewardType: string | null = null;
    let rewardMessage: string | null = null;

    const rewardOptions = [
      { reward_type: "points", points: 2, message: "Mystery Reward: +2 points!" },
      { reward_type: "motivation", points: 0, message: "Keep going — consistency beats intensity." },
      { reward_type: "meme_unlock", points: 0, message: "Meme unlocked — check Daily for today’s surprise." },
      { reward_type: "badge", points: 0, message: "Badge unlocked — you’re building momentum." },
    ] as const;

    // Check if already granted today
    const { data: todayReward } = await db
      .from("daily_rewards_log")
      .select("id")
      .eq("user_id", userId)
      .eq("reward_date", today)
      .maybeSingle();

    if (!todayReward) {
      const chosen = pick([...rewardOptions]);
      rewardType = chosen.reward_type;
      rewardMessage = chosen.message;
      pointsAwarded = chosen.points;

      const { error: rewardInsertErr } = await db.from("daily_rewards_log").insert({
        user_id: userId,
        reward_date: today,
        reward_type: rewardType,
        points_awarded: pointsAwarded,
        message: rewardMessage,
      });

      if (!rewardInsertErr) {
        dailyRewardGranted = true;

        if (pointsAwarded > 0) {
          try {
            await db.from("points_ledger").insert({
              user_id: userId,
              points: pointsAwarded,
              source: "daily_reward",
              note: "Daily mystery reward",
              metadata: { reward_type: rewardType, reward_date: today },
            });
          } catch (e) {
            // non-blocking by requirement
            console.error("daily reward points insert failed (non-blocking)", e);
          }
        }
      } else {
        // Unique constraint race: treat as already granted (idempotent)
        const msg = String(rewardInsertErr.message || "");
        if (msg.toLowerCase().includes("duplicate") || msg.toLowerCase().includes("unique")) {
          dailyRewardGranted = false;
        } else {
          return json(500, { success: false, code: "REWARD_WRITE_FAILED", message: "Failed to grant daily reward" });
        }
      }
    }

    // 5) Achievement: 7-day login streak (immutable; best-effort)
    let achievementGranted = false;
    if (streakIncremented && currentStreak >= 7) {
      try {
        const { error: achErr } = await db.from("student_achievements").insert({
          user_id: userId,
          code: "streak_7",
          metadata: { current_streak: currentStreak, date: today },
        });

        if (!achErr) {
          achievementGranted = true;
        }
      } catch (e) {
        // ignore duplicates / best-effort
        console.error("achievement grant failed (non-blocking)", e);
      }
    }

    // 6) Recompute intelligence (best-effort, non-blocking for retention)
    try {
      await db.functions.invoke("recompute-intelligence", { body: { userId } });
    } catch (e) {
      console.error("recompute-intelligence failed (non-blocking)", e);
    }

    return json(200, {
      success: true,
      streak: {
        updated: streakUpdated,
        incremented: streakIncremented,
        current_streak: currentStreak,
        longest_streak: longestStreak,
      },
      daily_reward: {
        granted: dailyRewardGranted,
        reward_type: rewardType,
        points_awarded: pointsAwarded,
        message: rewardMessage,
      },
      achievements: {
        granted: achievementGranted,
      },
    });
  } catch (error) {
    console.error("retention-on-login error:", error);
    return json(500, { success: false, code: "INTERNAL", message: "Internal server error" });
  }
});
