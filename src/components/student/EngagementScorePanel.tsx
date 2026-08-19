/**
 * PHASE 2 — Engagement Score Panel
 * Shows week's activity: check-ins, lectures, achievements, points.
 * Mini progress bars for each metric.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Zap, Flame, CalendarCheck, Award, Activity } from "@/components/icons";
import { useMetricCountUp } from "@/components/ui/motion";

function EngagementMetric({
  icon, label, value, max, color, delay = 0,
}: {
  icon: React.ReactNode; label: string;
  value: number; max: number;
  color: string; delay?: number;
}) {
  const counted = useMetricCountUp(value, 800);
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.18 }}
      className="space-y-1.5"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={cn("h-7 w-7 rounded-lg flex items-center justify-center shrink-0", `${color}/10`)}> 
            <span className={color}>{icon}</span>
          </span>
          <span className="text-[12px] font-medium text-foreground">{label}</span>
        </div>
        <span className="text-[13px] font-bold text-foreground tabular-nums">{counted}</span>
      </div>
      <div className="h-1.5 rounded-full bg-surface-3 overflow-hidden">
        <motion.div
          className={cn("h-full rounded-full", color.replace("text-", "bg-"))}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.9, ease: "easeOut", delay: delay + 0.1 }}
        />
      </div>
    </motion.div>
  );
}

export default function EngagementScorePanel() {
  const q = useQuery({
    queryKey: ["student", "engagement-week"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const wStr = weekAgo.toISOString();

      const [
        { count: checkins },
        { count: lectures },
        { data: points },
        { count: achievements },
      ] = await Promise.all([
        supabase.from("daily_checkins")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .gte("checkin_date", wStr.split("T")[0]),
        supabase.from("attendance")
          .select("id", { count: "exact", head: true })
          .eq("student_user_id", user.id)
          .eq("status", "present")
          .gte("marked_at", wStr),
        supabase.from("points_ledger")
          .select("points")
          .eq("user_id", user.id)
          .gte("created_at", wStr),
        supabase.from("student_achievements")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .gte("awarded_at", wStr),
      ]);

      const totalPoints = (points ?? []).reduce((s: number, r: any) => s + r.points, 0);

      return {
        checkins: checkins ?? 0,
        lectures: lectures ?? 0,
        points: totalPoints,
        achievements: achievements ?? 0,
      };
    },
    staleTime: 3 * 60_000,
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: 0.07 }}
      className="rounded-2xl border border-border-subtle bg-surface-1 overflow-hidden shadow-sm"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <Activity className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-[14px] font-semibold text-foreground">This Week</p>
            <p className="text-[11px] text-muted-foreground">7-day engagement summary</p>
          </div>
        </div>
        {!q.isLoading && q.data && (
          <div className="text-right">
            <p className="text-[15px] font-black text-primary tabular-nums leading-none">+{q.data.points}</p>
            <p className="text-[10px] text-muted-foreground">pts earned</p>
          </div>
        )}
      </div>

      <div className="px-5 py-4 space-y-4">
        {q.isLoading ? (
          [...Array(4)].map((_, i) => <Skeleton key={i} className="h-6 w-full rounded-lg" />)
        ) : q.data ? (
          <>
            <EngagementMetric icon={<Flame className="h-3.5 w-3.5" />} label="Daily Check-ins" value={q.data.checkins} max={7} color="text-warning" delay={0} />
            <EngagementMetric icon={<CalendarCheck className="h-3.5 w-3.5" />} label="Lectures Attended" value={q.data.lectures} max={5} color="text-success" delay={0.04} />
            <EngagementMetric icon={<Award className="h-3.5 w-3.5" />} label="Achievements Earned" value={q.data.achievements} max={3} color="text-premium" delay={0.08} />
            <EngagementMetric icon={<Zap className="h-3.5 w-3.5" />} label="Points Earned" value={q.data.points} max={100} color="text-primary" delay={0.12} />
          </>
        ) : (
          <p className="text-[12px] text-muted-foreground text-center py-4">No data available</p>
        )}
      </div>
    </motion.div>
  );
}
