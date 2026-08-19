import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Flame, Trophy, Zap, Star, ArrowRight } from "@/components/icons";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useMetricCountUp } from "@/components/ui/motion";
import { cn } from "@/lib/utils";

interface GamStats {
  activeStreaks: number;
  weeklyPoints: number;
  achievementsThisWeek: number;
  topTierCount: number;
}

function StatBlock({ icon, label, value, accent, loading, colorClass }: {
  icon: React.ReactNode; label: string; value: number; accent: string; colorClass: string; loading: boolean;
}) {
  const counted = useMetricCountUp(loading ? 0 : value, 800);
  return (
    <div className="flex items-center gap-4 py-4 px-4">
      <div className={cn("h-11 w-11 rounded-xl flex items-center justify-center shrink-0", accent)}>{icon}</div>
      <div className="flex-1">
        <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">{label}</p>
        {loading
          ? <Skeleton className="h-8 w-16 mt-1" />
          : <p className={cn("text-3xl font-bold tabular-nums leading-none mt-1", colorClass)}>{counted}</p>
        }
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
      return { activeStreaks: streakCount ?? 0, weeklyPoints, achievementsThisWeek: achieveCount ?? 0, topTierCount: goldEliteCount ?? 0 };
    },
    staleTime: 30_000,
  });

  return (
    <div className="rounded-xl border border-border-subtle bg-surface-1 overflow-hidden shadow-xs">
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border-subtle">
        <div className="h-9 w-9 rounded-lg bg-warning/10 flex items-center justify-center shrink-0">
          <Flame className="h-4 w-4 text-warning" />
        </div>
        <div>
          <p className="text-base font-semibold text-foreground">Gamification</p>
          <p className="text-xs text-muted-foreground">Engagement · streaks · rewards</p>
        </div>
      </div>

      <div className="divide-y divide-border-subtle">
        <StatBlock icon={<Flame className="h-5 w-5 text-warning" />} label="Active Streaks"        value={stats?.activeStreaks ?? 0}         accent="bg-warning/10"  colorClass="text-warning"  loading={isLoading} />
        <StatBlock icon={<Zap   className="h-5 w-5 text-primary" />} label="Points This Week"      value={stats?.weeklyPoints ?? 0}          accent="bg-primary/10"  colorClass="text-primary"  loading={isLoading} />
        <StatBlock icon={<Trophy className="h-5 w-5 text-premium" />} label="Achievements Unlocked" value={stats?.achievementsThisWeek ?? 0}  accent="bg-premium/10"  colorClass="text-premium"  loading={isLoading} />
        <StatBlock icon={<Star  className="h-5 w-5 text-success" />} label="Gold / Elite Students"  value={stats?.topTierCount ?? 0}          accent="bg-success/10"  colorClass="text-success"  loading={isLoading} />
      </div>

      <div className="px-4 py-3 border-t border-border-subtle">
        <Button variant="ghost" size="sm" className="w-full gap-2 h-11 text-sm text-muted-foreground hover:text-foreground" onClick={() => onNavigateTab("students")}>
          View student ranks <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
