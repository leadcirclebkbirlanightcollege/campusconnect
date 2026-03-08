import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Flame, Trophy, Zap, Star, ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useMetricCountUp } from "@/components/ui/motion";

interface GamStats {
  activeStreaks: number;
  weeklyPoints: number;
  achievementsThisWeek: number;
  topTierCount: number;
}

function StatRow({ icon, label, value, accent, loading }: {
  icon: React.ReactNode; label: string; value: number; accent: string; loading: boolean;
}) {
  const counted = useMetricCountUp(loading ? 0 : value, 800);
  return (
    <div className="flex items-center gap-3 py-3">
      <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${accent}`}>{icon}</div>
      <div className="flex-1">
        <p className="text-[11px] text-muted-foreground uppercase tracking-widest">{label}</p>
        {loading ? <Skeleton className="h-5 w-12 mt-0.5" /> : (
          <p className="text-body-lg font-bold text-foreground tabular-nums">{counted}</p>
        )}
      </div>
    </div>
  );
}

export default function GamificationStatsPanel({ onNavigateTab }: { onNavigateTab: (tab: string) => void }) {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin", "gamification-stats"],
    queryFn: async (): Promise<GamStats> => {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekStartStr = weekStart.toISOString().slice(0, 10);

      const [
        { count: streakCount },
        { data: weekPtsRaw },
        { count: achieveCount },
        { count: goldEliteCount },
      ] = await Promise.all([
        supabase.from("student_streaks").select("user_id", { count: "exact", head: true }).gt("current_streak", 0),
        supabase.from("points_ledger").select("points").gte("created_at", weekStartStr + "T00:00:00Z"),
        supabase.from("student_achievements").select("id", { count: "exact", head: true }).gte("awarded_at", weekStartStr + "T00:00:00Z"),
        supabase.from("student_intelligence").select("user_id", { count: "exact", head: true }).in("tier", ["gold", "elite"]),
      ]);

      const weeklyPoints = (weekPtsRaw ?? []).reduce((sum, r) => sum + (r.points ?? 0), 0);

      return {
        activeStreaks: streakCount ?? 0,
        weeklyPoints,
        achievementsThisWeek: achieveCount ?? 0,
        topTierCount: goldEliteCount ?? 0,
      };
    },
    staleTime: 30_000,
  });

  return (
    <div className="rounded-2xl border border-border-subtle bg-surface-1 overflow-hidden dashboard-panel shadow-sm">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-warning/10 flex items-center justify-center">
            <Flame className="h-4 w-4 text-warning" />
          </div>
          <div>
            <p className="text-body font-semibold text-foreground">Gamification</p>
            <p className="text-[11px] text-muted-foreground">Engagement · streaks · rewards</p>
          </div>
        </div>
      </div>

      <div className="px-5 divide-y divide-border-subtle">
        <StatRow icon={<Flame className="h-4 w-4 text-warning" />} label="Active Streaks" value={stats?.activeStreaks ?? 0} accent="bg-warning/10" loading={isLoading} />
        <StatRow icon={<Zap className="h-4 w-4 text-primary" />} label="Points This Week" value={stats?.weeklyPoints ?? 0} accent="bg-primary/10" loading={isLoading} />
        <StatRow icon={<Trophy className="h-4 w-4 text-premium" />} label="Achievements Unlocked" value={stats?.achievementsThisWeek ?? 0} accent="bg-premium/10" loading={isLoading} />
        <StatRow icon={<Star className="h-4 w-4 text-success" />} label="Gold/Elite Students" value={stats?.topTierCount ?? 0} accent="bg-success/10" loading={isLoading} />
      </div>

      <div className="px-5 py-3 border-t border-border-subtle">
        <Button variant="ghost" size="sm" className="w-full gap-2 text-caption text-muted-foreground hover:text-foreground" onClick={() => onNavigateTab("students")}>
          View student ranks <ArrowRight className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
