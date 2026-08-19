/**
 * PHASE 7 — Student Intelligence Score Card
 * Composite 0-100 score + engagement level label + goal tracker + trend chart.
 */
import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import {
  Brain, TrendingUp, TrendingDown, Minus,
  Target, CheckCircle2, Circle, Flame, CalendarCheck, Zap,
} from "@/components/icons";
import { useStudentIntelligence } from "@/hooks/use-intelligence";
import { useGrowthInsights } from "@/hooks/use-growth-insights";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

/* ── Score computation ────────────────────────────────────────── */
function computeIntelligenceScore(
  attendancePct: number,
  engagementIndex: number,
  attendanceConsistency: number,
  behaviourReliability: number,
): number {
  return Math.round(
    attendancePct        * 0.40 +
    engagementIndex      * 0.25 +
    attendanceConsistency * 0.20 +
    behaviourReliability * 0.15,
  );
}

function engagementLabel(score: number): { label: string; color: string; bg: string } {
  if (score >= 85) return { label: "Elite",      color: "text-premium",  bg: "bg-premium/10"  };
  if (score >= 70) return { label: "High",       color: "text-success",  bg: "bg-success/10"  };
  if (score >= 50) return { label: "Moderate",   color: "text-warning",  bg: "bg-warning/10"  };
  return              { label: "Low",        color: "text-danger",   bg: "bg-danger/10"   };
}

/* ── Custom tooltip ───────────────────────────────────────────── */
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border-subtle bg-surface-2 px-3 py-2 shadow-md text-xs">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: <span className="font-bold">{p.value}</span></p>
      ))}
    </div>
  );
};

/* ── Circular score ring ─────────────────────────────────────── */
function ScoreRing({ score, loading }: { score: number; loading: boolean }) {
  const size = 96; const sw = 7; const r = (size - sw) / 2;
  const circ = 2 * Math.PI * r;
  const dash = loading ? 0 : (score / 100) * circ;
  const eng  = engagementLabel(score);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} strokeWidth={sw} className="stroke-surface-3 fill-none" />
        <motion.circle
          cx={size/2} cy={size/2} r={r} strokeWidth={sw}
          strokeDasharray={`${circ}`}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ - dash }}
          transition={{ duration: 1.4, ease: "easeOut", delay: 0.2 }}
          strokeLinecap="round"
          className={cn("fill-none", score >= 85 ? "stroke-premium" : score >= 70 ? "stroke-success" : score >= 50 ? "stroke-warning" : "stroke-danger")}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {loading ? (
          <Skeleton className="h-8 w-10" />
        ) : (
          <>
            <span className="text-2xl font-black text-foreground tabular-nums leading-none">{score}</span>
            <span className="text-[9px] uppercase tracking-widest text-muted-foreground mt-0.5">/ 100</span>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Goal tracker ─────────────────────────────────────────────── */
function GoalTracker({ attendancePct, currentStreak, totalPoints, riskLevel }: {
  attendancePct: number; currentStreak: number; totalPoints: number; riskLevel: string;
}) {
  const goals = useMemo(() => [
    {
      label: "Attend next 3 lectures",
      done: attendancePct >= 90,
      tip: attendancePct >= 90 ? "90%+ achieved!" : `Current: ${attendancePct}%`,
    },
    {
      label: "Maintain 7-day streak",
      done: currentStreak >= 7,
      tip: currentStreak >= 7 ? "Active streak!" : `${Math.max(0, 7 - currentStreak)} days to go`,
    },
    {
      label: "Earn 100 total points",
      done: totalPoints >= 100,
      tip: totalPoints >= 100 ? "Reached!" : `${Math.max(0, 100 - totalPoints)} pts needed`,
    },
    {
      label: "Keep risk level low",
      done: riskLevel === "low",
      tip: riskLevel === "low" ? "Looking great!" : "Improve attendance",
    },
  ], [attendancePct, currentStreak, totalPoints, riskLevel]);

  return (
    <div className="space-y-2">
      {goals.map((g, i) => (
        <motion.div key={g.label}
          initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.07 }}
          className="flex items-center gap-2.5"
        >
          {g.done
            ? <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
            : <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
          }
          <div className="flex-1 min-w-0">
            <p className={cn("text-[12px] font-medium", g.done ? "text-success line-through decoration-success/40" : "text-foreground")}>
              {g.label}
            </p>
            <p className="text-[10px] text-muted-foreground">{g.tip}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
export default function IntelligenceScoreCard() {
  const intel     = useStudentIntelligence();
  const growth    = useGrowthInsights();

  const pointsQ = useQuery({
    queryKey: ["student", "points-weekly-chart"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase
        .from("points_ledger")
        .select("points, created_at")
        .eq("user_id", user.id)
        .gte("created_at", new Date(Date.now() - 28 * 86400_000).toISOString())
        .order("created_at", { ascending: true })
        .limit(200);
      return data ?? [];
    },
    staleTime: 60_000,
  });

  const streakQ = useQuery({
    queryKey: ["student", "my-streak-isc"],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_my_streak");
      return (data as any) ?? null;
    },
  });

  const totalPtsQ = useQuery({
    queryKey: ["student", "points-total-isc"],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_my_points_total");
      return Number(data ?? 0);
    },
  });

  /* ── derived ── */
  const attPct     = growth.data?.last_30_day_attendance_pct ?? 0;
  const intData    = intel.data;
  const score      = useMemo(() => {
    if (!intData) return 0;
    return computeIntelligenceScore(attPct, intData.engagementIndex, intData.attendanceConsistency, intData.behaviourReliability);
  }, [intData, attPct]);

  const eng = engagementLabel(score);
  const trend = growth.data?.trend_direction ?? "stable";

  /* ── Weekly chart data ── */
  const chartData = useMemo(() => {
    const raw = pointsQ.data ?? [];
    const byDay: Record<string, number> = {};
    for (const r of raw) {
      const day = new Date(r.created_at).toLocaleDateString("en-US", { weekday: "short", month: "numeric", day: "numeric" });
      byDay[day] = (byDay[day] ?? 0) + r.points;
    }
    let running = 0;
    return Object.entries(byDay).slice(-7).map(([label, pts]) => {
      running += pts;
      return { label, score: Math.min(100, Math.round(running / 5)), pts };
    });
  }, [pointsQ.data]);

  const isLoading = intel.isLoading || growth.isLoading;

  return (
    <div className="rounded-2xl border border-border-subtle bg-surface-1 overflow-hidden dashboard-panel shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border-subtle">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Brain className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-body font-semibold text-foreground">Intelligence Score</p>
            <p className="text-[11px] text-muted-foreground">Composite academic performance</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isLoading && (
            <span className={cn("text-[11px] font-semibold px-2.5 py-1 rounded-full", eng.bg, eng.color)}>
              {eng.label}
            </span>
          )}
          {trend === "improving" && <TrendingUp className="h-4 w-4 text-success" />}
          {trend === "declining" && <TrendingDown className="h-4 w-4 text-danger" />}
          {trend === "stable"    && <Minus className="h-4 w-4 text-muted-foreground" />}
        </div>
      </div>

      <div className="p-5">
        {/* Score + metric bars */}
        <div className="flex items-start gap-5 mb-5">
          <ScoreRing score={score} loading={isLoading} />
          <div className="flex-1 space-y-3 min-w-0">
            {isLoading ? (
              <>
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-5/6" />
                <Skeleton className="h-3 w-4/5" />
                <Skeleton className="h-3 w-full" />
              </>
            ) : intData ? (
              <>
                <MetricBar label="Attendance" pct={attPct} icon={<CalendarCheck className="h-3 w-3" />} />
                <MetricBar label="Engagement" pct={intData.engagementIndex} icon={<Zap className="h-3 w-3" />} />
                <MetricBar label="Consistency" pct={intData.attendanceConsistency} icon={<Flame className="h-3 w-3" />} />
                <MetricBar label="Reliability" pct={intData.behaviourReliability} icon={<Target className="h-3 w-3" />} />
              </>
            ) : null}
          </div>
        </div>

        {/* Academic Growth Chart */}
        {chartData.length > 1 && (
          <div className="mb-5">
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-2">7-Day Growth Trend</p>
            <ResponsiveContainer width="100%" height={80}>
              <AreaChart data={chartData} margin={{ top: 2, right: 2, left: -28, bottom: 0 }}>
                <defs>
                  <linearGradient id="score-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border-subtle))" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} domain={[0, 100]} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="score" name="Score" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#score-grad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Goal tracker */}
        <div className="border-t border-border-subtle pt-4">
          <div className="flex items-center gap-2 mb-3">
            <Target className="h-3.5 w-3.5 text-primary" />
            <p className="text-[12px] font-semibold text-foreground">Goals</p>
          </div>
          <GoalTracker
            attendancePct={attPct}
            currentStreak={streakQ.data?.current_streak ?? 0}
            totalPoints={totalPtsQ.data ?? 0}
            riskLevel={growth.data?.risk_probability ?? "low"}
          />
        </div>
      </div>
    </div>
  );
}

/* ── MetricBar ─────────────────────────────────────────────────── */
function MetricBar({ label, pct, icon }: { label: string; pct: number; icon: React.ReactNode }) {
  const color = pct >= 75 ? "bg-success" : pct >= 50 ? "bg-warning" : "bg-danger";
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className={pct >= 75 ? "text-success" : pct >= 50 ? "text-warning" : "text-danger"}>{icon}</span>
          {label}
        </div>
        <span className="text-[11px] font-semibold text-foreground tabular-nums">{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-surface-3 overflow-hidden">
        <motion.div
          className={cn("h-full rounded-full", color)}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
