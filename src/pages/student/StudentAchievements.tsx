import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, AreaChart, Area,
} from "recharts";
import {
  Award, Flame, Zap, CalendarCheck, Star, Trophy, TrendingUp,
  Target, Lock, CheckCircle2, Sparkles, Crown, Shield,
} from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* ── Types ─────────────────────────────────────────────────── */
type PointLedgerRow = { id: string; points: number; source: string; note: string | null; created_at: string };
type AchievementRow = { code: string; awarded_at: string; metadata?: Record<string, unknown> | null };

/* ── Achievement catalogue ────────────────────────────────── */
const ACHIEVEMENT_META: Record<string, {
  title: string; desc: string; icon: string;
  rarity: "common" | "rare" | "epic" | "legendary"; points: number;
}> = {
  streak_7_days:   { title: "7-Day Streak",    desc: "7 consecutive daily check-ins",    icon: "🔥",  rarity: "common",    points: 20  },
  streak_14_days:  { title: "2-Week Warrior",   desc: "14 consecutive daily check-ins",  icon: "⚡",  rarity: "rare",      points: 30  },
  streak_30_days:  { title: "Monthly Master",   desc: "30-day unbroken streak",           icon: "🏆",  rarity: "epic",      points: 50  },
  streak_100_days: { title: "Century Legend",   desc: "100 days — you're unstoppable",   icon: "💎",  rarity: "legendary", points: 100 },
  first_attendance:{ title: "First Lecture",    desc: "Marked attendance for the first time", icon: "📚", rarity: "common", points: 0  },
  top_10:          { title: "Top 10",           desc: "Reached the top 10 leaderboard",  icon: "🥇",  rarity: "rare",      points: 0   },
  gold_tier:       { title: "Gold Tier",        desc: "Reached Gold tier (250 pts)",     icon: "✨",  rarity: "epic",      points: 0   },
  elite_tier:      { title: "Elite Tier",       desc: "Reached Elite tier (500 pts)",    icon: "👑",  rarity: "legendary", points: 0   },
};

const RARITY_META = {
  common:    { label: "Common",    color: "text-muted-foreground",  bg: "bg-surface-3",   border: "border-border",     glow: ""                                              },
  rare:      { label: "Rare",      color: "text-primary",           bg: "bg-primary/10",  border: "border-primary/30", glow: "shadow-[0_0_16px_hsl(var(--primary)/0.3)]"    },
  epic:      { label: "Epic",      color: "text-premium",           bg: "bg-premium/10",  border: "border-premium/30", glow: "shadow-[0_0_16px_hsl(var(--premium)/0.3)]"    },
  legendary: { label: "Legendary", color: "text-gold",              bg: "bg-gold/10",     border: "border-gold/30",    glow: "shadow-[0_0_24px_hsl(var(--gold)/0.45)]"      },
};

const ALL_CODES = Object.keys(ACHIEVEMENT_META);

/* ── Badge icons for carousel ─────────────────────────────── */
const BADGE_TYPES = [
  { icon: "📚", label: "Attendance",   color: "bg-success/10 border-success/30"  },
  { icon: "🔥", label: "Streak",       color: "bg-warning/10 border-warning/30"  },
  { icon: "🥇", label: "Leaderboard",  color: "bg-gold/10 border-gold/30"        },
  { icon: "🏆", label: "Achievement",  color: "bg-primary/10 border-primary/30"  },
  { icon: "💎", label: "Legendary",    color: "bg-premium/10 border-premium/30"  },
  { icon: "⚡", label: "Consistency",  color: "bg-warning/10 border-warning/30"  },
  { icon: "✨", label: "Tier",         color: "bg-premium/10 border-premium/30"  },
  { icon: "👑", label: "Elite",        color: "bg-gold/10 border-gold/30"        },
];

/* ── Points source config ─────────────────────────────────── */
const SOURCE_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  attendance:    { label: "Attendance",  color: "hsl(var(--success))", icon: <CalendarCheck className="h-3.5 w-3.5" /> },
  daily_checkin: { label: "Check-ins",   color: "hsl(var(--warning))", icon: <Flame className="h-3.5 w-3.5" /> },
  daily_reward:  { label: "Rewards",     color: "hsl(var(--primary))", icon: <Star className="h-3.5 w-3.5" /> },
  manual:        { label: "Admin Bonus", color: "hsl(var(--premium))", icon: <Zap className="h-3.5 w-3.5" /> },
};

function getSourceKey(s: string) {
  const sl = s.toLowerCase();
  if (sl.includes("attendance")) return "attendance";
  if (sl.includes("checkin"))    return "daily_checkin";
  if (sl.includes("reward"))     return "daily_reward";
  return "manual";
}

/* ── Tooltip ────────────────────────────────────────────────── */
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border-subtle bg-surface-2 px-3 py-2 shadow-md text-xs">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: <b>{p.value}</b></p>
      ))}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════ */
export default function StudentAchievements() {
  const [filter, setFilter] = useState<"all" | "unlocked" | "locked">("all");

  /* ── Data queries ── */
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

  /* ── Derived data ── */
  const ledger = pointsQ.data ?? [];
  const unlockedCodes = new Set((achieveQ.data ?? []).map((a) => a.code));
  const streak = streakQ.data;
  const tier = tierQ.data;
  const isLoading = pointsQ.isLoading || achieveQ.isLoading;

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
      const ws = new Date(d); ws.setDate(d.getDate() - d.getDay());
      const key = ws.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      byWeek[key] = (byWeek[key] ?? 0) + row.points;
    }
    let running = 0;
    return Object.entries(byWeek).slice(-10).map(([label, pts]) => {
      running += pts;
      return { label, pts, total: running };
    });
  }, [ledger]);

  const recentLedger = useMemo(() => [...ledger].reverse().slice(0, 12), [ledger]);

  const motivationalInsights = useMemo(() => {
    const ins: string[] = [];
    if (tier?.points_to_next > 0)
      ins.push(`${tier.points_to_next} pts to ${tier.points_tier === "bronze" ? "Silver" : tier.points_tier === "silver" ? "Gold" : "Elite"} tier`);
    if (streak?.current_streak > 0 && streak.current_streak < 7)
      ins.push(`${7 - streak.current_streak} more day${7 - streak.current_streak > 1 ? "s" : ""} to 7-Day Streak badge`);
    if (streak?.current_streak >= 7 && streak.current_streak < 30)
      ins.push(`${30 - streak.current_streak} more days to Monthly Master badge`);
    const weekPts = weeklyTimeline.slice(-1)[0]?.pts ?? 0;
    if (weekPts > 0) ins.push(`+${weekPts} pts earned this week`);
    if (unlockedCodes.size === 0) ins.push("Complete your first check-in to start earning");
    return ins.slice(0, 3);
  }, [tier, streak, weeklyTimeline, unlockedCodes]);

  /* ── Filtered achievement list ── */
  const filteredCodes = useMemo(() => {
    if (filter === "unlocked") return ALL_CODES.filter((c) => unlockedCodes.has(c));
    if (filter === "locked")   return ALL_CODES.filter((c) => !unlockedCodes.has(c));
    return ALL_CODES;
  }, [filter, unlockedCodes]);

  /* ── Tier display ── */
  const tierLabel = tier?.points_tier ?? "bronze";
  const tierEmoji = { bronze: "🥉", silver: "🥈", gold: "🥇", elite: "👑" }[tierLabel] ?? "🥉";

  return (
    <div className="space-y-5 max-w-2xl mx-auto pb-28 px-0.5">

      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5 mb-0.5">
              <div className="h-9 w-9 rounded-xl bg-premium/10 flex items-center justify-center">
                <Award className="h-5 w-5 text-premium" />
              </div>
              <h1 className="text-[20px] font-black text-foreground tracking-tight">Achievements</h1>
            </div>
            <p className="text-[12px] text-muted-foreground pl-11.5">Your milestones, XP & rewards</p>
          </div>
          <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs shrink-0">
            <Link to="/app/leaderboard"><Trophy className="h-3.5 w-3.5" />Leaderboard</Link>
          </Button>
        </div>
      </motion.div>

      {/* ── Gamification Profile Panel ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}
        className="rounded-2xl overflow-hidden border border-border-subtle bg-surface-1 shadow-sm"
      >
        {/* Gradient header */}
        <div className="h-1.5 bg-gradient-to-r from-primary via-premium to-gold" />
        <div className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <motion.div
              animate={{ rotate: [0, -8, 8, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 4 }}
              className="text-3xl"
            >
              {tierEmoji}
            </motion.div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-[16px] font-black text-foreground capitalize">{tierLabel} Tier</p>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold uppercase tracking-wider">
                  Active
                </span>
              </div>
              {tier && tier.points_to_next > 0 && (
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {tier.points_to_next} pts to {tier.points_tier === "bronze" ? "Silver" : tier.points_tier === "silver" ? "Gold" : "Elite"}
                </p>
              )}
            </div>
          </div>

          {/* XP Bar */}
          {tier && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-semibold text-muted-foreground capitalize">{tierLabel}</span>
                {tier.next_threshold && (
                  <span className="text-[11px] text-muted-foreground capitalize">
                    {tier.points_tier === "bronze" ? "Silver" : tier.points_tier === "silver" ? "Gold" : "Elite"}
                  </span>
                )}
              </div>
              <div className="w-full h-3 rounded-full bg-surface-3 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-premium"
                  initial={{ width: 0 }}
                  animate={{ width: `${tier.progress_pct ?? 0}%` }}
                  transition={{ duration: 0.9, ease: "easeOut", delay: 0.3 }}
                />
              </div>
              <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
                <span>{tier.points_total ?? 0} XP earned</span>
                {tier.next_threshold && <span>Next: {tier.next_threshold} XP</span>}
              </div>
            </div>
          )}

          {/* Profile stats grid */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Total XP",    value: totals.total.toLocaleString(), icon: Zap,    color: "text-primary",  bg: "bg-primary/10"  },
              { label: "Badges",      value: String(unlockedCodes.size),    icon: Award,  color: "text-premium",  bg: "bg-premium/10"  },
              { label: "Best Streak", value: `${streak?.longest_streak ?? 0}d`, icon: Flame, color: "text-warning", bg: "bg-warning/10" },
              { label: "Tier",        value: tierLabel.slice(0,1).toUpperCase()+tierLabel.slice(1), icon: Crown, color: "text-gold", bg: "bg-gold/10" },
            ].map(({ label, value, icon: Icon, color, bg }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 + i * 0.06 }}
                className="flex flex-col items-center text-center"
              >
                <div className={cn("h-8 w-8 rounded-xl flex items-center justify-center mb-1.5", bg)}>
                  <Icon className={cn("h-3.5 w-3.5", color)} />
                </div>
                {isLoading
                  ? <Skeleton className="h-5 w-10 mx-auto mb-1" />
                  : <p className="text-[15px] font-black text-foreground tabular-nums leading-none">{value}</p>
                }
                <p className="text-[9px] uppercase tracking-widest text-muted-foreground mt-0.5">{label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── Badge Carousel ── */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.12 }}
        className="rounded-2xl border border-border-subtle bg-surface-1 p-5 shadow-sm"
      >
        <div className="flex items-center gap-2.5 mb-4">
          <div className="h-8 w-8 rounded-xl bg-gold/10 flex items-center justify-center">
            <Shield className="h-4 w-4 text-gold" />
          </div>
          <p className="text-[14px] font-bold text-foreground">Badge Collection</p>
        </div>
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
          {BADGE_TYPES.map((badge, i) => {
            const earned = i < (unlockedCodes.size > 0 ? Math.ceil(unlockedCodes.size / 1.5) : 0);
            return (
              <motion.div
                key={badge.label}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                whileTap={{ scale: 0.95 }}
                className={cn(
                  "flex-shrink-0 flex flex-col items-center gap-1.5 rounded-xl border p-3 w-[70px] transition-all duration-200",
                  earned ? badge.color : "border-border-subtle bg-surface-2 opacity-50",
                )}
              >
                <span className={cn("text-2xl", !earned && "grayscale opacity-50")}>{badge.icon}</span>
                <span className="text-[9px] font-semibold text-center leading-tight text-muted-foreground">{badge.label}</span>
                {earned && <div className="h-1.5 w-1.5 rounded-full bg-success" />}
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* ── Smart Insights ── */}
      {motivationalInsights.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}
          className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/2 p-4 shadow-sm"
        >
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-primary" />
            <p className="text-[13px] font-bold text-foreground">Smart Insights</p>
          </div>
          {motivationalInsights.map((ins, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 + i * 0.07 }}
              className="flex items-start gap-2.5 text-[12px] text-foreground mb-2 last:mb-0"
            >
              <div className="h-5 w-5 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                <TrendingUp className="h-3 w-3 text-primary" />
              </div>
              <span>{ins}</span>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* ── Points Breakdown ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}
        className="rounded-2xl border border-border-subtle bg-surface-1 p-5 shadow-sm"
      >
        <div className="flex items-center gap-2.5 mb-4">
          <div className="h-8 w-8 rounded-xl bg-success/10 flex items-center justify-center">
            <Zap className="h-4 w-4 text-success" />
          </div>
          <div>
            <p className="text-[14px] font-bold text-foreground">Points Breakdown</p>
            <p className="text-[11px] text-muted-foreground">How you earned your XP</p>
          </div>
        </div>
        <div className="space-y-3">
          {Object.entries(SOURCE_CONFIG).map(([key, cfg]) => {
            const pts = totals.breakdown[key] ?? 0;
            const pct = totals.total > 0 ? (pts / totals.total) * 100 : 0;
            return (
              <div key={key}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2 text-[12px] text-foreground">
                    <span style={{ color: cfg.color }}>{cfg.icon}</span>{cfg.label}
                  </div>
                  <span className="text-[13px] font-bold text-foreground tabular-nums">{pts}</span>
                </div>
                <div className="h-2 rounded-full bg-surface-3 overflow-hidden">
                  <motion.div className="h-full rounded-full"
                    initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
                    style={{ background: cfg.color }}
                  />
                </div>
              </div>
            );
          })}
          <div className="pt-3 border-t border-border-subtle flex items-center justify-between">
            <span className="text-[13px] font-bold text-foreground">Total XP</span>
            <span className="text-[18px] font-black text-primary tabular-nums">{totals.total}</span>
          </div>
        </div>
      </motion.div>

      {/* ── Points Growth Chart ── */}
      {weeklyTimeline.length > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
          className="rounded-2xl border border-border-subtle bg-surface-1 p-5 shadow-sm"
        >
          <div className="flex items-center gap-2.5 mb-4">
            <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-[14px] font-bold text-foreground">XP Growth</p>
              <p className="text-[11px] text-muted-foreground">Cumulative points by week</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <AreaChart data={weeklyTimeline} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <defs>
                <linearGradient id="xp-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border-subtle))" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="total" name="Total XP"
                stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#xp-grad)"
                dot={{ r: 3, fill: "hsl(var(--primary))", strokeWidth: 0 }} activeDot={{ r: 5 }} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      {/* ── Achievement Gallery ── */}
      <div>
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-[15px] font-bold text-foreground">Achievement Gallery</h2>
            <span className="text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">
              {unlockedCodes.size}/{ALL_CODES.length}
            </span>
          </div>
          {/* Filter chips */}
          <div className="flex gap-1.5">
            {(["all","unlocked","locked"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-all duration-150 capitalize",
                  filter === f
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border-subtle text-muted-foreground bg-surface-2 hover:border-border",
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <AnimatePresence mode="popLayout">
            {filteredCodes.map((code, i) => {
              const meta = ACHIEVEMENT_META[code];
              if (!meta) return null;
              const unlocked = unlockedCodes.has(code);
              const award = (achieveQ.data ?? []).find((a) => a.code === code);
              const rarity = RARITY_META[meta.rarity];
              const currentStreak = streak?.current_streak ?? 0;
              const streakProgressMap: Record<string, number> = {
                streak_7_days:  Math.min(100, Math.round((currentStreak / 7)   * 100)),
                streak_14_days: Math.min(100, Math.round((currentStreak / 14)  * 100)),
                streak_30_days: Math.min(100, Math.round((currentStreak / 30)  * 100)),
                streak_100_days:Math.min(100, Math.round((currentStreak / 100) * 100)),
              };

              return (
                <motion.div
                  key={code}
                  layout
                  initial={{ opacity: 0, scale: 0.88 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.88 }}
                  transition={{ delay: i * 0.04, duration: 0.16 }}
                  whileHover={unlocked ? { y: -3, transition: { duration: 0.15 } } : {}}
                  className={cn(
                    "relative rounded-2xl border p-4 flex flex-col items-center text-center transition-all duration-150 overflow-hidden",
                    unlocked ? [rarity.bg, rarity.border, rarity.glow] : "border-border-subtle bg-surface-2",
                  )}
                >
                  {/* Legendary shimmer */}
                  {unlocked && meta.rarity === "legendary" && (
                    <motion.div
                      animate={{ x: ["-100%", "200%"] }}
                      transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 3 }}
                      className="absolute inset-0 w-1/3 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 pointer-events-none"
                    />
                  )}

                  {/* Rarity chip */}
                  {unlocked && (
                    <span className={cn("absolute top-2 right-2 text-[8px] font-black px-1.5 py-0.5 rounded-full", rarity.color, rarity.bg, "border", rarity.border)}>
                      {rarity.label}
                    </span>
                  )}

                  {/* Icon */}
                  <motion.div
                    animate={unlocked ? { scale: [1, 1.12, 1] } : {}}
                    transition={{ duration: 0.4, delay: i * 0.05 }}
                    className={cn("text-4xl mb-2", !unlocked && "grayscale opacity-40")}
                  >
                    {meta.icon}
                  </motion.div>

                  {/* Status icon */}
                  {unlocked
                    ? <CheckCircle2 className={cn("h-3.5 w-3.5 mb-1.5", rarity.color)} />
                    : <Lock className="h-3.5 w-3.5 text-muted-foreground/50 mb-1.5" />}

                  <p className={cn("text-[12px] font-bold leading-tight", unlocked ? "text-foreground" : "text-muted-foreground")}>
                    {meta.title}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug line-clamp-2">{meta.desc}</p>

                  {/* Locked progress bar */}
                  {!unlocked && streakProgressMap[code] !== undefined && streakProgressMap[code] > 0 && (
                    <div className="w-full mt-2.5">
                      <div className="h-1.5 rounded-full bg-surface-3 overflow-hidden">
                        <motion.div
                          className="h-full rounded-full bg-warning"
                          initial={{ width: 0 }}
                          animate={{ width: `${streakProgressMap[code]}%` }}
                          transition={{ duration: 0.6, ease: "easeOut", delay: i * 0.06 }}
                        />
                      </div>
                      <p className="text-[9px] text-muted-foreground mt-1">{streakProgressMap[code]}% complete</p>
                    </div>
                  )}

                  {/* Unlocked date */}
                  {unlocked && award && (
                    <p className="text-[9px] text-muted-foreground/70 mt-2">
                      {new Date(award.awarded_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                  )}

                  {/* Locked points reward */}
                  {!unlocked && meta.points > 0 && (
                    <span className="mt-2 text-[10px] font-bold text-muted-foreground">+{meta.points} pts</span>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Streak Milestone Roadmap ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="rounded-2xl border border-border-subtle bg-surface-1 p-5 shadow-sm"
      >
        <div className="flex items-center gap-2.5 mb-4">
          <div className="h-8 w-8 rounded-xl bg-warning/10 flex items-center justify-center">
            <Flame className="h-4 w-4 text-warning" />
          </div>
          <div>
            <p className="text-[14px] font-bold text-foreground">Streak Milestones</p>
            <p className="text-[11px] text-muted-foreground">Current: {streak?.current_streak ?? 0} days</p>
          </div>
        </div>
        <div className="space-y-3">
          {[
            { days: 7,   bonus: 20,  code: "streak_7_days",   label: "7-Day Champion",  icon: "🔥" },
            { days: 14,  bonus: 30,  code: "streak_14_days",  label: "2-Week Warrior",  icon: "⚡" },
            { days: 30,  bonus: 50,  code: "streak_30_days",  label: "Monthly Master",  icon: "🏆" },
            { days: 100, bonus: 100, code: "streak_100_days", label: "Century Legend",  icon: "💎" },
          ].map((m, i) => {
            const current = streak?.current_streak ?? 0;
            const done = unlockedCodes.has(m.code);
            const pct = done ? 100 : Math.min(100, Math.round((current / m.days) * 100));
            return (
              <motion.div
                key={m.code}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.22 + i * 0.06 }}
                className={cn(
                  "rounded-xl border p-3.5 transition-all",
                  done ? "border-success/30 bg-success/5" : "border-border-subtle bg-surface-2",
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{m.icon}</span>
                    <span className={cn("text-[13px] font-bold", done ? "text-success" : "text-foreground")}>
                      {m.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[12px] font-black text-warning">+{m.bonus} pts</span>
                    {done && <CheckCircle2 className="h-3.5 w-3.5 text-success" />}
                  </div>
                </div>
                <div className="h-2 rounded-full bg-surface-3 overflow-hidden">
                  <motion.div
                    className={cn("h-full rounded-full", done ? "bg-success" : "bg-gradient-to-r from-warning to-orange-400")}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.7, ease: "easeOut", delay: 0.25 + i * 0.07 }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1.5">
                  {done ? "✅ Completed!" : `${Math.max(0, m.days - current)} days remaining (${pct}%)`}
                </p>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* ── Points History ── */}
      {recentLedger.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}
          className="rounded-2xl border border-border-subtle bg-surface-1 p-5 shadow-sm"
        >
          <div className="flex items-center gap-2.5 mb-4">
            <div className="h-8 w-8 rounded-xl bg-premium/10 flex items-center justify-center">
              <Star className="h-4 w-4 text-premium" />
            </div>
            <div>
              <p className="text-[14px] font-bold text-foreground">Recent Points History</p>
              <p className="text-[11px] text-muted-foreground">Last {recentLedger.length} transactions</p>
            </div>
          </div>
          <div className="space-y-1">
            {recentLedger.map((row, i) => {
              const src = SOURCE_CONFIG[getSourceKey(row.source)];
              return (
                <motion.div
                  key={row.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.24 + i * 0.03 }}
                  className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-surface-2 transition-colors"
                >
                  <div className={cn(
                    "h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0",
                    getSourceKey(row.source) === "attendance"    && "bg-success/10 text-success",
                    getSourceKey(row.source) === "daily_checkin" && "bg-warning/10 text-warning",
                    getSourceKey(row.source) === "daily_reward"  && "bg-primary/10 text-primary",
                    getSourceKey(row.source) === "manual"        && "bg-premium/10 text-premium",
                  )}>
                    {src?.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-foreground truncate">
                      {row.note || src?.label || row.source}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(row.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <motion.span
                    initial={{ scale: 0.8 }} animate={{ scale: 1 }}
                    transition={{ delay: 0.25 + i * 0.03 }}
                    className="text-[13px] font-black tabular-nums text-success flex-shrink-0"
                  >
                    +{row.points}
                  </motion.span>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}
