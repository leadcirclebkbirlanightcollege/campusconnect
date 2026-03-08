import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, PieChart, Pie, Cell,
} from "recharts";
import {
  Award, Flame, Zap, CalendarCheck, Star, Trophy, TrendingUp,
  Target, Lock, CheckCircle2, ArrowRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* ── Types ─────────────────────────────────────────────────────── */
type PointLedgerRow = { id: string; points: number; source: string; note: string | null; created_at: string };
type AchievementRow = { code: string; awarded_at: string; metadata?: Record<string, unknown> | null };

/* ── Achievement catalogue ──────────────────────────────────────── */
const ACHIEVEMENT_META: Record<string, { title: string; desc: string; icon: string; rarity: "common" | "rare" | "epic" | "legendary"; points: number }> = {
  streak_7_days:   { title: "7-Day Streak",    desc: "Checked in 7 days in a row",         icon: "🔥",  rarity: "common",    points: 20  },
  streak_14_days:  { title: "2-Week Warrior",   desc: "14 consecutive daily check-ins",     icon: "⚡",  rarity: "rare",      points: 30  },
  streak_30_days:  { title: "Monthly Master",   desc: "30-day unbroken check-in streak",    icon: "🏆",  rarity: "epic",      points: 50  },
  streak_100_days: { title: "Century Legend",   desc: "100 days — you're unstoppable",      icon: "💎",  rarity: "legendary", points: 100 },
  first_attendance:{ title: "First Lecture",    desc: "Marked attendance for the first time",icon: "📚", rarity: "common",    points: 0   },
  top_10:          { title: "Top 10",           desc: "Reached the top 10 leaderboard",     icon: "🥇",  rarity: "rare",      points: 0   },
  gold_tier:       { title: "Gold Tier",        desc: "Reached Gold tier (250 pts)",        icon: "✨",  rarity: "epic",      points: 0   },
  elite_tier:      { title: "Elite Tier",       desc: "Reached Elite tier (500 pts)",       icon: "👑",  rarity: "legendary", points: 0   },
};

const RARITY_META = {
  common:    { label: "Common",    color: "text-muted-foreground",  bg: "bg-surface-3",   border: "border-border-subtle",  glow: ""                                             },
  rare:      { label: "Rare",      color: "text-primary",           bg: "bg-primary/10",  border: "border-primary/30",     glow: "shadow-[0_0_14px_hsl(var(--primary)/0.25)]"   },
  epic:      { label: "Epic",      color: "text-premium",           bg: "bg-premium/10",  border: "border-premium/30",     glow: "shadow-[0_0_14px_hsl(var(--premium)/0.25)]"   },
  legendary: { label: "Legendary", color: "text-gold",              bg: "bg-gold/10",     border: "border-gold/30",        glow: "shadow-[0_0_20px_hsl(var(--gold)/0.4)]"       },
};

const UPCOMING_LOCKED = ["first_attendance", "streak_7_days", "top_10", "streak_30_days", "gold_tier", "elite_tier", "streak_100_days"];

/* ── Source breakdown config ─────────────────────────────────────── */
const SOURCE_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  attendance:   { label: "Attendance",   color: "hsl(var(--success))",  icon: <CalendarCheck className="h-3.5 w-3.5" /> },
  daily_checkin:{ label: "Check-ins",    color: "hsl(var(--warning))",  icon: <Flame className="h-3.5 w-3.5" /> },
  daily_reward: { label: "Rewards",      color: "hsl(var(--primary))",  icon: <Star className="h-3.5 w-3.5" /> },
  manual:       { label: "Admin Bonus",  color: "hsl(var(--premium))",  icon: <Zap className="h-3.5 w-3.5" /> },
};

function getSourceKey(source: string) {
  const s = source.toLowerCase();
  if (s.includes("attendance")) return "attendance";
  if (s.includes("checkin")) return "daily_checkin";
  if (s.includes("reward")) return "daily_reward";
  return "manual";
}

/* ── Tooltip ─────────────────────────────────────────────────────── */
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

/* ═══════════════════════════════════════════════════════════════ */
export default function StudentAchievements() {
  const pointsQ = useQuery({
    queryKey: ["student", "points-ledger-full"],
    queryFn: async (): Promise<PointLedgerRow[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase.from("points_ledger")
        .select("id,points,source,note,created_at").eq("user_id", user.id)
        .order("created_at", { ascending: true }).limit(500);
      if (error) throw error;
      return (data ?? []) as PointLedgerRow[];
    },
  });

  const achieveQ = useQuery({
    queryKey: ["student", "my-achievements"],
    queryFn: async (): Promise<AchievementRow[]> => {
      const { data, error } = await supabase.rpc("get_my_achievements", { p_limit: 50 });
      if (error) throw error;
      return ((data as unknown as any[]) ?? []) as AchievementRow[];
    },
  });

  const streakQ = useQuery({
    queryKey: ["student", "my-streak-ach"],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_my_streak");
      return (data as any) ?? null;
    },
  });

  const tierQ = useQuery({
    queryKey: ["student", "tier-progress"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_my_tier_progress");
      if (error) throw error;
      return data as any;
    },
  });

  /* ── derived ── */
  const ledger = pointsQ.data ?? [];

  const totals = useMemo(() => {
    const breakdown: Record<string, number> = {};
    let total = 0;
    for (const row of ledger) {
      const key = getSourceKey(row.source);
      breakdown[key] = (breakdown[key] ?? 0) + row.points;
      total += row.points;
    }
    return { breakdown, total };
  }, [ledger]);

  const weeklyTimeline = useMemo(() => {
    const byWeek: Record<string, number> = {};
    for (const row of ledger) {
      const d = new Date(row.created_at);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      const key = weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      byWeek[key] = (byWeek[key] ?? 0) + row.points;
    }
    let running = 0;
    return Object.entries(byWeek).slice(-10).map(([label, pts]) => {
      running += pts;
      return { label, pts, total: running };
    });
  }, [ledger]);

  const pieData = useMemo(() => {
    return Object.entries(totals.breakdown).map(([key, value]) => ({
      name: SOURCE_CONFIG[key]?.label ?? key,
      value,
      color: SOURCE_CONFIG[key]?.color ?? "hsl(var(--muted))",
    })).filter((d) => d.value > 0);
  }, [totals.breakdown]);

  const unlockedCodes = new Set((achieveQ.data ?? []).map((a) => a.code));
  const streak = streakQ.data;
  const tier = tierQ.data;

  const motivationalInsights = useMemo(() => {
    const insights: string[] = [];
    if (tier?.points_to_next > 0) insights.push(`You are ${tier.points_to_next} pts away from ${tier.points_tier === "bronze" ? "Silver" : tier.points_tier === "silver" ? "Gold" : "Elite"} tier`);
    if (streak?.current_streak > 0 && streak.current_streak < 7) insights.push(`${7 - streak.current_streak} more day${7 - streak.current_streak > 1 ? "s" : ""} to unlock the 7-Day Streak badge`);
    if (streak?.current_streak >= 7 && streak.current_streak < 30) insights.push(`${30 - streak.current_streak} more days to the Monthly Master badge`);
    const weekPts = weeklyTimeline.slice(-1)[0]?.pts ?? 0;
    if (weekPts > 0) insights.push(`You gained ${weekPts} points this week — keep going!`);
    if (unlockedCodes.size === 0) insights.push("Complete your first check-in to start earning achievements");
    return insights.slice(0, 3);
  }, [tier, streak, weeklyTimeline, unlockedCodes]);

  const isLoading = pointsQ.isLoading || achieveQ.isLoading;

  return (
    <div className="space-y-5 page-enter max-w-2xl mx-auto pb-8">

      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <div className="h-8 w-8 rounded-xl bg-premium/10 flex items-center justify-center">
                <Award className="h-4.5 w-4.5 text-premium" />
              </div>
              <h1 className="text-heading text-foreground">Achievements</h1>
            </div>
            <p className="text-caption text-muted-foreground pl-10">Your milestones, points & progression</p>
          </div>
          <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs shrink-0">
            <Link to="/app/leaderboard"><Trophy className="h-3.5 w-3.5" /> Leaderboard</Link>
          </Button>
        </div>
      </motion.div>

      {/* ── KPI strip ── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Points", value: totals.total.toLocaleString(), icon: Zap, color: "text-primary", bg: "bg-primary/10" },
          { label: "Achievements", value: String(unlockedCodes.size), icon: Trophy, color: "text-premium", bg: "bg-premium/10" },
          { label: "Best Streak",  value: `${streak?.longest_streak ?? 0}d`, icon: Flame, color: "text-warning", bg: "bg-warning/10" },
        ].map(({ label, value, icon: Icon, color, bg }, i) => (
          <motion.div key={label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            className="rounded-2xl border border-border-subtle bg-surface-1 p-4 text-center shadow-xs">
            <div className={cn("h-8 w-8 rounded-xl flex items-center justify-center mx-auto mb-2", bg)}>
              <Icon className={cn("h-4 w-4", color)} />
            </div>
            {isLoading ? <Skeleton className="h-6 w-12 mx-auto" /> : (
              <p className="text-xl font-bold text-foreground tabular-nums">{value}</p>
            )}
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">{label}</p>
          </motion.div>
        ))}
      </div>

      {/* ── Tier progress ── */}
      {tier && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
          className="rounded-2xl border border-border-subtle bg-surface-1 p-5 shadow-xs">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="h-8 w-8 rounded-xl bg-gold/10 flex items-center justify-center">
              <Target className="h-4 w-4 text-gold" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-foreground">Tier Progression</p>
              <p className="text-[11px] text-muted-foreground">Points-based tier system</p>
            </div>
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] font-semibold text-foreground capitalize">{tier.points_tier}</span>
            {tier.points_to_next > 0 && (
              <span className="text-[11px] text-muted-foreground">{tier.points_to_next} pts to next tier</span>
            )}
          </div>
          <Progress value={tier.progress_pct} className="h-2" />
          <div className="flex items-center justify-between mt-1.5 text-[10px] text-muted-foreground">
            <span>{tier.points_total} pts earned</span>
            {tier.next_threshold && <span>Next: {tier.next_threshold} pts</span>}
          </div>
        </motion.div>
      )}

      {/* ── Motivational Insights ── */}
      {motivationalInsights.length > 0 && (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-2 shadow-xs">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-primary" />
            <p className="text-[13px] font-semibold text-foreground">Smart Insights</p>
          </div>
          {motivationalInsights.map((insight, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
              className="flex items-start gap-2 text-[12px] text-foreground">
              <span className="text-primary mt-0.5 shrink-0">→</span>
              <span>{insight}</span>
            </motion.div>
          ))}
        </div>
      )}

      {/* ── Points breakdown + pie ── */}
      <div className="grid sm:grid-cols-2 gap-4">
        {/* Breakdown list */}
        <div className="rounded-2xl border border-border-subtle bg-surface-1 p-5 shadow-xs">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="h-8 w-8 rounded-xl bg-success/10 flex items-center justify-center">
              <Zap className="h-4 w-4 text-success" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-foreground">Points Breakdown</p>
              <p className="text-[11px] text-muted-foreground">How you earned your points</p>
            </div>
          </div>
          <div className="space-y-3">
            {Object.entries(SOURCE_CONFIG).map(([key, cfg]) => {
              const pts = totals.breakdown[key] ?? 0;
              const pct = totals.total > 0 ? (pts / totals.total) * 100 : 0;
              return (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 text-[12px] text-foreground">
                      <span style={{ color: cfg.color }}>{cfg.icon}</span>
                      {cfg.label}
                    </div>
                    <span className="text-[12px] font-bold text-foreground tabular-nums">{pts}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-surface-3 overflow-hidden">
                    <motion.div className="h-full rounded-full"
                      initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                      style={{ background: cfg.color }}
                    />
                  </div>
                </div>
              );
            })}
            <div className="pt-2 border-t border-border-subtle flex items-center justify-between">
              <span className="text-[12px] font-semibold text-foreground">Total</span>
              <span className="text-[14px] font-bold text-primary tabular-nums">{totals.total}</span>
            </div>
          </div>
        </div>

        {/* Pie chart */}
        <div className="rounded-2xl border border-border-subtle bg-surface-1 p-5 shadow-xs">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <Star className="h-4 w-4 text-primary" />
            </div>
            <p className="text-[13px] font-semibold text-foreground">Points Distribution</p>
          </div>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={140}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={60}
                  paddingAngle={3} dataKey="value">
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="h-[140px] flex items-center justify-center text-caption text-muted-foreground">No points yet</div>}
          <div className="flex flex-wrap gap-2 mt-2">
            {pieData.map((d) => (
              <span key={d.name} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span className="h-2 w-2 rounded-full shrink-0" style={{ background: d.color }} />
                {d.name}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Progression timeline ── */}
      {weeklyTimeline.length > 1 && (
        <div className="rounded-2xl border border-border-subtle bg-surface-1 p-5 shadow-xs">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-foreground">Points Growth Timeline</p>
              <p className="text-[11px] text-muted-foreground">Cumulative points over weeks</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={weeklyTimeline} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="line-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border-subtle))" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="total" name="Total Points" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 3, fill: "hsl(var(--primary))", strokeWidth: 0 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Achievement gallery ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-[14px] font-semibold text-foreground">Achievement Gallery</h2>
          <span className="text-caption text-muted-foreground">· {unlockedCodes.size} unlocked</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {UPCOMING_LOCKED.map((code, i) => {
            const meta = ACHIEVEMENT_META[code];
            if (!meta) return null;
            const unlocked = unlockedCodes.has(code);
            const award = (achieveQ.data ?? []).find((a) => a.code === code);
            const rarity = RARITY_META[meta.rarity];

            return (
              <motion.div
                key={code}
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05, duration: 0.15 }}
                className={cn(
                  "relative rounded-2xl border p-4 flex flex-col items-center text-center transition-all duration-150",
                  unlocked ? [rarity.bg, rarity.border, rarity.glow] : "border-border-subtle bg-surface-2 opacity-60",
                  "hover:-translate-y-0.5",
                )}
              >
                {/* Rarity badge */}
                {unlocked && (
                  <span className={cn("absolute top-2 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full border", rarity.color, rarity.bg, rarity.border)}>
                    {rarity.label}
                  </span>
                )}

                {/* Icon */}
                <div className={cn("text-3xl mb-2 transition-all duration-200", !unlocked && "grayscale opacity-50")}>
                  {meta.icon}
                </div>

                {/* Lock overlay */}
                {!unlocked && (
                  <Lock className="h-3.5 w-3.5 text-muted-foreground mb-1" />
                )}
                {unlocked && (
                  <CheckCircle2 className={cn("h-3.5 w-3.5 mb-1", rarity.color)} />
                )}

                <p className={cn("text-[12px] font-semibold", unlocked ? "text-foreground" : "text-muted-foreground")}>
                  {meta.title}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">{meta.desc}</p>

                {unlocked && award && (
                  <p className="text-[9px] text-muted-foreground/70 mt-1.5">
                    {new Date(award.awarded_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </p>
                )}
                {meta.points > 0 && !unlocked && (
                  <span className="mt-1.5 text-[10px] font-semibold text-muted-foreground">+{meta.points} pts</span>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ── Streak milestone roadmap ── */}
      <div className="rounded-2xl border border-border-subtle bg-surface-1 p-5 shadow-xs">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="h-8 w-8 rounded-xl bg-warning/10 flex items-center justify-center">
            <Flame className="h-4 w-4 text-warning" />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-foreground">Streak Milestone Roadmap</p>
            <p className="text-[11px] text-muted-foreground">Current streak: {streak?.current_streak ?? 0} days</p>
          </div>
        </div>
        <div className="space-y-3">
          {[
            { streak: 7,   bonus: 20,  code: "streak_7_days",   label: "7-Day Streak Champion",  icon: "🔥" },
            { streak: 14,  bonus: 30,  code: "streak_14_days",  label: "2-Week Warrior",          icon: "⚡" },
            { streak: 30,  bonus: 50,  code: "streak_30_days",  label: "Monthly Master",          icon: "🏆" },
            { streak: 100, bonus: 100, code: "streak_100_days", label: "Century Legend",           icon: "💎" },
          ].map((m) => {
            const current = streak?.current_streak ?? 0;
            const done = unlockedCodes.has(m.code);
            const pct = done ? 100 : Math.min(100, Math.round((current / m.streak) * 100));
            return (
              <div key={m.code} className={cn("rounded-xl border p-3", done ? "border-success/30 bg-success/5" : "border-border-subtle bg-surface-2")}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{m.icon}</span>
                    <span className={cn("text-[12px] font-semibold", done ? "text-success" : "text-foreground")}>{m.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-warning">+{m.bonus} pts</span>
                    {done && <CheckCircle2 className="h-3.5 w-3.5 text-success" />}
                  </div>
                </div>
                <Progress value={pct} className={cn("h-1.5", done ? "[&>div]:bg-success" : "")} />
                <p className="text-[10px] text-muted-foreground mt-1">
                  {done ? "Completed!" : `${Math.max(0, m.streak - current)} days remaining`}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
