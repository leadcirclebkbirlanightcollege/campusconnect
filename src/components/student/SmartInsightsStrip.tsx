/**
 * SMART INSIGHTS STRIP — rotating motivational insights for the student dashboard.
 * Pulls from growth data, tier progress, and streak info to show personalised nudges.
 */

import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, TrendingUp, Flame, Zap, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

const TIER_THRESHOLDS = { bronze: 0, silver: 100, gold: 250, elite: 500 } as const;
const TIER_NEXT: Record<string, string | null> = { bronze: "silver", silver: "gold", gold: "elite", elite: null };

function buildInsights(
  totalPts: number,
  tier: string,
  streak: number,
  attendancePct: number,
): Array<{ text: string; icon: React.ReactNode; color: string; href?: string }> {
  const insights: Array<{ text: string; icon: React.ReactNode; color: string; href?: string }> = [];
  const next = TIER_NEXT[tier] as keyof typeof TIER_THRESHOLDS | null;

  if (next) {
    const toGo = TIER_THRESHOLDS[next] - totalPts;
    if (toGo > 0) {
      insights.push({
        text: `${toGo} more pts to reach ${next.charAt(0).toUpperCase() + next.slice(1)} tier 🏆`,
        icon: <Zap className="h-3.5 w-3.5" />,
        color: "text-primary",
        href: "/app/leaderboard",
      });
    }
  }

  if (streak > 0 && streak < 7) {
    const left = 7 - streak;
    insights.push({
      text: `${left} more day${left > 1 ? "s" : ""} to unlock the 7-Day Streak badge! 🔥`,
      icon: <Flame className="h-3.5 w-3.5" />,
      color: "text-warning",
      href: "/app/achievements",
    });
  } else if (streak >= 7 && streak < 30) {
    insights.push({
      text: `${30 - streak} days away from the Monthly Master badge 🎯`,
      icon: <Flame className="h-3.5 w-3.5" />,
      color: "text-warning",
      href: "/app/achievements",
    });
  }

  if (attendancePct >= 90) {
    insights.push({
      text: `Outstanding! You have ${attendancePct}% attendance this term 🌟`,
      icon: <TrendingUp className="h-3.5 w-3.5" />,
      color: "text-success",
      href: "/app/attendance",
    });
  } else if (attendancePct > 0 && attendancePct < 75) {
    insights.push({
      text: `Your attendance is ${attendancePct}% — attending more boosts your tier faster`,
      icon: <TrendingUp className="h-3.5 w-3.5" />,
      color: "text-warning",
      href: "/app/attendance",
    });
  }

  if (totalPts === 0) {
    insights.push({
      text: "Do your first daily check-in to start earning points!",
      icon: <Sparkles className="h-3.5 w-3.5" />,
      color: "text-primary",
    });
  }

  // Default fallback
  if (insights.length === 0) {
    insights.push({
      text: "Keep up the momentum — your consistency is paying off 🎉",
      icon: <Sparkles className="h-3.5 w-3.5" />,
      color: "text-primary",
    });
  }

  return insights;
}

export default function SmartInsightsStrip() {
  const [idx, setIdx] = useState(0);

  const streakQ = useQuery({
    queryKey: ["student", "streak-insights"],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_my_streak");
      return (data as any) ?? null;
    },
    staleTime: 2 * 60_000,
  });

  const pointsQ = useQuery({
    queryKey: ["student", "points-insights"],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_my_points_total");
      return Number(data ?? 0);
    },
    staleTime: 2 * 60_000,
  });

  const tierQ = useQuery({
    queryKey: ["student", "tier-insights"],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_my_tier_progress");
      return (data as any) ?? null;
    },
    staleTime: 2 * 60_000,
  });

  const attendanceQ = useQuery({
    queryKey: ["student", "attendance-pct-insights"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;
      const [{ count: attended }, { count: total }] = await Promise.all([
        supabase.from("attendance").select("id", { count: "exact", head: true }).eq("student_user_id", user.id).eq("status", "present"),
        supabase.from("lectures").select("id", { count: "exact", head: true }),
      ]);
      return total ? Math.round(((attended ?? 0) / total) * 100) : 0;
    },
    staleTime: 5 * 60_000,
  });

  const insights = useMemo(() => buildInsights(
    pointsQ.data ?? 0,
    tierQ.data?.points_tier ?? "bronze",
    streakQ.data?.current_streak ?? 0,
    attendanceQ.data ?? 0,
  ), [pointsQ.data, tierQ.data, streakQ.data, attendanceQ.data]);

  // Rotate every 5 seconds
  useEffect(() => {
    if (insights.length <= 1) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % insights.length), 5000);
    return () => clearInterval(t);
  }, [insights.length]);

  if (pointsQ.isLoading && tierQ.isLoading) return null;

  const current = insights[idx];

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 overflow-hidden shadow-xs">
      <div className="flex items-center justify-between px-4 py-3 gap-3">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <AnimatePresence mode="wait">
              <motion.p
                key={idx}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
                className="text-[12px] font-medium text-foreground leading-snug"
              >
                <span className={cn("mr-1.5 inline-flex items-center", current.color)}>
                  {current.icon}
                </span>
                {current.text}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>
        {current.href && (
          <Link
            to={current.href}
            className="shrink-0 flex items-center gap-0.5 text-[11px] font-medium text-primary hover:text-primary/80 transition-fast"
          >
            View <ChevronRight className="h-3 w-3" />
          </Link>
        )}
      </div>
      {/* Dot indicators */}
      {insights.length > 1 && (
        <div className="flex items-center justify-center gap-1 pb-2">
          {insights.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={cn(
                "h-1 rounded-full transition-all duration-base",
                i === idx ? "w-4 bg-primary" : "w-1 bg-primary/25",
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
