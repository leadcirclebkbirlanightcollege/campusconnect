import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy, Filter, Crown, Medal, Award, BadgeCheck,
  Flame, Zap, ArrowUp, ArrowDown, Minus, Star,
  ChevronDown, Users, Target,
} from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

/* ── Types ─────────────────────────────────────────────────────── */
type LeaderRow = {
  user_id: string; name: string; avatar_url: string | null;
  is_verified: boolean; points_total: number; rank: number;
};
type WeeklyRow = LeaderRow & { weekly_points: number };

/* ── Tier config ─────────────────────────────────────────────────── */
const TIERS = [
  { key: "bronze",   min: 0,   max: 99,       label: "Bronze",   color: "text-[hsl(22_60%_55%)]",   bg: "bg-[hsl(22_60%_55%/0.12)]",   border: "border-[hsl(22_60%_55%/0.3)]",   glow: "" },
  { key: "silver",   min: 100, max: 249,       label: "Silver",   color: "text-[hsl(215_15%_65%)]",  bg: "bg-[hsl(215_15%_65%/0.12)]",  border: "border-[hsl(215_15%_65%/0.3)]",  glow: "" },
  { key: "gold",     min: 250, max: 499,       label: "Gold",     color: "text-gold",                 bg: "bg-gold/10",                  border: "border-gold/30",                  glow: "shadow-[0_0_16px_hsl(var(--gold)/0.25)]" },
  { key: "platinum", min: 500, max: 999,       label: "Platinum", color: "text-premium",              bg: "bg-premium/10",               border: "border-premium/30",               glow: "shadow-[0_0_20px_hsl(var(--premium)/0.3)]" },
  { key: "elite",    min: 1000, max: Infinity, label: "Elite",    color: "text-[hsl(280_80%_70%)]",   bg: "bg-[hsl(280_80%_70%/0.12)]",  border: "border-[hsl(280_80%_70%/0.3)]",  glow: "shadow-[0_0_24px_hsl(280_80%_70%/0.35)]" },
] as const;

function getTier(pts: number) {
  return [...TIERS].reverse().find((t) => pts >= t.min) ?? TIERS[0];
}

function TierBadge({ pts, size = "sm" }: { pts: number; size?: "sm" | "md" }) {
  const t = getTier(pts);
  return (
    <span className={cn(
      "inline-flex items-center gap-1 font-bold rounded-full border",
      size === "sm" ? "text-[9px] px-1.5 py-0.5" : "text-[11px] px-2 py-1",
      t.color, t.bg, t.border,
    )}>
      {t.key === "elite" || t.key === "platinum" ? <Star className={size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3"} />
        : t.key === "gold" ? <Crown className={size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3"} /> : null}
      {t.label}
    </span>
  );
}

/* ── Rank delta ─────────────────────────────────────────────────── */
function RankDelta({ delta }: { delta: number }) {
  if (delta > 0) return (
    <span className="flex items-center gap-0.5 text-[10px] font-bold text-success tabular-nums">
      <ArrowUp className="h-2.5 w-2.5" />{delta}
    </span>
  );
  if (delta < 0) return (
    <span className="flex items-center gap-0.5 text-[10px] font-bold text-danger tabular-nums">
      <ArrowDown className="h-2.5 w-2.5" />{Math.abs(delta)}
    </span>
  );
  return <Minus className="h-2.5 w-2.5 text-muted-foreground/40" />;
}

/* ── Podium card ─────────────────────────────────────────────────── */
function PodiumCard({ row, myId, position, featured }: {
  row: LeaderRow; myId?: string; position: 1 | 2 | 3; featured?: boolean;
}) {
  const isMe = row.user_id === myId;
  const tier = getTier(row.points_total);
  const meta = {
    1: { Icon: Crown,  label: "1st", height: "h-[186px]", ring: "ring-gold/40", avatarSize: "h-14 w-14", accent: "border-gold/30 bg-gradient-to-b from-gold/8 via-surface-1 to-surface-1", glow: "shadow-[0_0_28px_hsl(var(--gold)/0.3)]" },
    2: { Icon: Medal,  label: "2nd", height: "h-[152px]", ring: "ring-border-subtle", avatarSize: "h-11 w-11", accent: "border-border-subtle bg-surface-1", glow: "" },
    3: { Icon: Award,  label: "3rd", height: "h-[136px]", ring: "ring-border-subtle", avatarSize: "h-11 w-11", accent: "border-border-subtle bg-surface-1", glow: "" },
  }[position];

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay: position * 0.07, type: "spring", stiffness: 300, damping: 26 }}
      className={cn(
        "relative rounded-2xl border flex flex-col items-center justify-end p-3 pb-4 text-center transition-all duration-150",
        meta.height, meta.accent, meta.glow,
        isMe && "ring-2 ring-primary/40",
        "hover:-translate-y-0.5 hover:shadow-md",
      )}
    >
      {/* Rank icon */}
      <div className={cn("absolute top-2.5 left-1/2 -translate-x-1/2 h-7 w-7 rounded-full flex items-center justify-center border shadow-xs",
        position === 1 ? "bg-gold/15 border-gold/40" : "bg-surface-3 border-border-subtle"
      )}>
        <meta.Icon className={cn("h-3.5 w-3.5", position === 1 ? "text-gold" : "text-muted-foreground")} />
      </div>

      {/* Podium step accent (1st only) */}
      {position === 1 && (
        <motion.div
          className="absolute inset-0 rounded-2xl bg-gradient-to-b from-gold/5 to-transparent pointer-events-none"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      <Avatar className={cn("mb-2 ring-2 shadow-sm", meta.avatarSize, meta.ring)}>
        <AvatarImage src={row.avatar_url ?? undefined} />
        <AvatarFallback className={cn("font-bold", featured ? "text-[14px] bg-gold/10 text-gold" : "text-[12px] bg-primary/10 text-primary")}>
          {row.name?.slice(0, 1)}
        </AvatarFallback>
      </Avatar>

      {row.is_verified && <BadgeCheck className="h-3 w-3 text-primary mb-0.5" />}
      {isMe && (
        <span className="inline-flex items-center rounded-full bg-primary/10 px-1.5 py-0.5 text-[8px] font-black text-primary leading-none mb-0.5">YOU</span>
      )}
      <p className="text-[11px] font-bold text-foreground truncate w-full leading-tight">{row.name?.split(" ")[0]}</p>
      <p className={cn("text-[11px] font-black tabular-nums mt-0.5", featured ? "text-gold" : "text-muted-foreground")}>
        {row.points_total.toLocaleString()} pts
      </p>
      <div className="mt-1"><TierBadge pts={row.points_total} /></div>
    </motion.div>
  );
}

/* ── Streak badge ─────────────────────────────────────────────────── */
function StreakBadge({ streak }: { streak: number }) {
  if (!streak || streak < 1) return null;
  const isHot = streak >= 7;
  return (
    <span className={cn(
      "inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full border",
      isHot ? "text-warning bg-warning/10 border-warning/30" : "text-muted-foreground bg-surface-3 border-border-subtle",
    )}>
      <Flame className={cn("h-2.5 w-2.5", isHot && "text-warning")} />
      {streak}d
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
export default function Leaderboard() {
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [tab, setTab] = useState<"alltime" | "weekly">("alltime");
  const [showFilters, setShowFilters] = useState(false);

  /* ── Queries ── */
  const meQuery = useQuery({
    queryKey: ["student", "me"],
    queryFn: async () => (await supabase.auth.getUser()).data.user ?? null,
  });

  const myStreakQ = useQuery({
    queryKey: ["student", "my-streak-lb"],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_my_streak");
      return (data as any) ?? null;
    },
  });

  const streakMap = useQuery({
    queryKey: ["leaderboard", "streaks"],
    queryFn: async () => {
      const { data } = await supabase
        .from("student_streaks")
        .select("user_id, current_streak");
      const map: Record<string, number> = {};
      for (const r of data ?? []) map[r.user_id] = r.current_streak ?? 0;
      return map;
    },
    staleTime: 60_000,
  });

  const leaderboardQ = useQuery({
    queryKey: ["leaderboard", { verifiedOnly }],
    queryFn: async (): Promise<LeaderRow[]> => {
      const { data, error } = await supabase.rpc("get_leaderboard", { p_limit: 100, p_verified_only: verifiedOnly });
      if (error) throw error;
      return (data ?? []) as unknown as LeaderRow[];
    },
    staleTime: 60_000,
  });

  const weeklyQ = useQuery({
    queryKey: ["leaderboard", "weekly"],
    enabled: tab === "weekly",
    queryFn: async (): Promise<WeeklyRow[]> => {
      const { data, error } = await supabase.rpc("get_weekly_leaderboard" as any, { p_limit: 100 });
      if (error) throw error;
      return (data ?? []) as any;
    },
    staleTime: 60_000,
  });

  const rows: LeaderRow[] = useMemo(() => {
    if (tab === "weekly") return (weeklyQ.data ?? []).map((r) => ({ ...r, points_total: r.weekly_points }));
    return leaderboardQ.data ?? [];
  }, [leaderboardQ.data, weeklyQ.data, tab]);

  const isLoading = leaderboardQ.isLoading || (tab === "weekly" && weeklyQ.isLoading);
  const myId  = meQuery.data?.id;
  const myRow = rows.find((r) => r.user_id === myId);
  const top3  = rows.slice(0, 3);
  const rest  = rows.slice(3);
  const streaks = streakMap.data ?? {};
  const myStreak = myStreakQ.data?.current_streak ?? 0;

  const pointsToNextRank = useMemo(() => {
    if (!myRow) return null;
    const above = rows.find((r) => r.rank === myRow.rank - 1);
    if (!above) return null;
    return above.points_total - myRow.points_total + 1;
  }, [rows, myRow]);

  const rankProgressPct = useMemo(() => {
    if (!myRow || pointsToNextRank === null) return 100;
    const below = rows.find((r) => r.rank === myRow.rank + 1);
    const gap = below ? myRow.points_total - below.points_total : myRow.points_total;
    const span = gap + pointsToNextRank;
    return Math.max(8, Math.round((gap / Math.max(span, 1)) * 100));
  }, [rows, myRow, pointsToNextRank]);

  /* ── My tier ── */
  const myTier = myRow ? getTier(myRow.points_total) : null;

  return (
    <div className="space-y-5 page-enter max-w-2xl mx-auto pb-8">

      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2.5 mb-0.5">
              <div className="h-9 w-9 rounded-xl bg-gold/10 flex items-center justify-center">
                <Trophy className="h-4.5 w-4.5 text-gold" />
              </div>
              <h1 className="text-[22px] font-black text-foreground tracking-tight">Leaderboard</h1>
            </div>
            <p className="text-[12px] text-muted-foreground pl-[46px]">
              {tab === "weekly" ? "This week's champions" : `All-time rankings · ${rows.length} students`}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Tab toggle */}
            <div className="flex rounded-lg border border-border-subtle bg-surface-2 p-0.5">
              {(["alltime", "weekly"] as const).map((t) => (
                <button key={t} onClick={() => setTab(t)} className={cn(
                  "px-3 py-1 rounded-md text-[11px] font-semibold transition-all duration-150",
                  tab === t ? "bg-surface-1 text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                )}>
                  {t === "alltime" ? "All-time" : "Weekly"}
                </button>
              ))}
            </div>
            {/* Filter toggle */}
            <Button variant="outline" size="sm" onClick={() => setShowFilters((v) => !v)}
              className={cn("h-7 text-[11px] gap-1.5", showFilters && "border-primary/40 text-primary bg-primary/5")}>
              <Filter className="h-3 w-3" />
              Filter
              <ChevronDown className={cn("h-3 w-3 transition-transform", showFilters && "rotate-180")} />
            </Button>
          </div>
        </div>

        {/* Filter bar */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-3 rounded-xl border border-border-subtle bg-surface-2 p-3 flex flex-wrap items-center gap-2">
                <span className="text-[11px] text-muted-foreground font-medium">Filters:</span>
                <button
                  onClick={() => setVerifiedOnly((v) => !v)}
                  className={cn(
                    "text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-all",
                    verifiedOnly
                      ? "bg-primary/15 border-primary/30 text-primary"
                      : "bg-surface-3 border-border-subtle text-muted-foreground hover:text-foreground",
                  )}
                >
                  <BadgeCheck className="inline h-2.5 w-2.5 mr-1" />
                  Verified only
                </button>
                {verifiedOnly && (
                  <button onClick={() => setVerifiedOnly(false)}
                    className="text-[10px] text-muted-foreground hover:text-danger ml-auto">
                    Clear filters
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Your Position card ── */}
      {myRow && (
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2 }}>
          <div className={cn("rounded-2xl border p-4 shadow-xs", myTier?.glow, "border-primary/20 bg-gradient-to-br from-primary/5 to-surface-1")}>
            {/* Top row */}
            <div className="flex items-center gap-3 mb-3 flex-wrap">
              <div className="h-11 w-11 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center flex-shrink-0">
                <span className="text-[13px] font-black text-primary">#{myRow.rank}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-foreground">Your Position</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  {myTier && <TierBadge pts={myRow.points_total} size="md" />}
                  {myStreak > 0 && <StreakBadge streak={myStreak} />}
                  {myStreak >= 7 && (
                    <span className="text-[10px] text-warning font-semibold">🔥 Streak bonus active</span>
                  )}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-[22px] font-black text-foreground tabular-nums leading-none">{myRow.points_total.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">total points</p>
              </div>
            </div>

            {/* Rank progress */}
            {pointsToNextRank !== null && pointsToNextRank > 0 && (
              <div className="mt-1">
                <div className="flex items-center justify-between text-[10px] mb-1.5">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Target className="h-2.5 w-2.5" /> Rank #{myRow.rank - 1}
                  </span>
                  <span className="font-bold text-primary">+{pointsToNextRank} pts needed</span>
                </div>
                <div className="h-2 rounded-full bg-surface-3 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70"
                    initial={{ width: 0 }}
                    animate={{ width: `${rankProgressPct}%` }}
                    transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
                  />
                </div>
              </div>
            )}
            {pointsToNextRank === null && myRow.rank === 1 && (
              <p className="text-[11px] text-gold font-bold mt-1">👑 You're at the top!</p>
            )}
          </div>
        </motion.div>
      )}

      {/* ── Podium ── */}
      {isLoading ? (
        <div className="grid grid-cols-3 gap-3 items-end">
          <Skeleton className="rounded-2xl h-[152px]" />
          <Skeleton className="rounded-2xl h-[186px]" />
          <Skeleton className="rounded-2xl h-[136px]" />
        </div>
      ) : top3.length >= 2 ? (
        <div>
          {/* Podium title */}
          <div className="flex items-center gap-2 mb-3">
            <Crown className="h-4 w-4 text-gold" />
            <p className="text-[12px] font-bold text-muted-foreground uppercase tracking-widest">Top Performers</p>
          </div>
          <div className="grid grid-cols-3 gap-3 items-end">
            {top3[1] && <PodiumCard row={top3[1]} myId={myId} position={2} />}
            {top3[0] && <PodiumCard row={top3[0]} myId={myId} position={1} featured />}
            {top3[2] && <PodiumCard row={top3[2]} myId={myId} position={3} />}
          </div>
        </div>
      ) : null}

      {/* ── Leaderboard table ── */}
      {isLoading ? (
        <div className="rounded-2xl border border-border-subtle bg-surface-1 overflow-hidden shadow-xs divide-y divide-border-subtle">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-3">
              <Skeleton className="h-3 w-6" />
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-3 w-36" />
              <Skeleton className="h-3 w-12 ml-auto" />
            </div>
          ))}
        </div>
      ) : rest.length === 0 && rows.length <= 3 ? (
        <div className="rounded-2xl border border-border-subtle bg-surface-1 shadow-xs py-12 text-center">
          <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-[13px] text-muted-foreground">
            {tab === "weekly" ? "No activity this week yet." : "No students on the leaderboard yet."}
          </p>
        </div>
      ) : rest.length > 0 ? (
        <div className="rounded-2xl border border-border-subtle bg-surface-1 shadow-xs overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[36px_1fr_auto_56px] items-center px-4 py-2.5 bg-surface-2 border-b border-border-subtle">
            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">#</span>
            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Student</span>
            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Streak</span>
            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground text-right">Points</span>
          </div>
          <div className="divide-y divide-border-subtle/50">
            <AnimatePresence initial={false}>
              {rest.map((r, i) => {
                const isMe = r.user_id === myId;
                const streak = streaks[r.user_id] ?? 0;
                return (
                  <motion.div
                    key={r.user_id}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.15, delay: Math.min(i * 0.018, 0.35) }}
                    className={cn(
                      "grid grid-cols-[36px_1fr_auto_56px] items-center px-4 py-3 transition-colors duration-150",
                      isMe ? "bg-primary/5 border-l-2 border-l-primary" : "hover:bg-surface-2/60",
                    )}
                  >
                    {/* Rank */}
                    <span className={cn("text-[12px] font-black tabular-nums text-right pr-2",
                      isMe ? "text-primary" : "text-muted-foreground"
                    )}>
                      {r.rank}
                    </span>

                    {/* Avatar + name + badges */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar className="h-8 w-8 flex-shrink-0 ring-1 ring-border-subtle">
                        <AvatarImage src={r.avatar_url ?? undefined} />
                        <AvatarFallback className="text-[11px] font-bold bg-primary/10 text-primary">
                          {r.name?.slice(0, 1)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={cn("text-[13px] truncate max-w-[120px]", isMe ? "font-bold text-foreground" : "text-foreground")}>
                            {r.name}
                          </span>
                          {r.is_verified && <BadgeCheck className="h-3 w-3 text-primary flex-shrink-0" />}
                          {isMe && (
                            <span className="inline-flex items-center rounded-full bg-primary/10 px-1.5 py-0.5 text-[8px] font-black text-primary leading-none flex-shrink-0">
                              YOU
                            </span>
                          )}
                        </div>
                        <TierBadge pts={r.points_total} />
                      </div>
                    </div>

                    {/* Streak */}
                    <div className="flex justify-center">
                      <StreakBadge streak={streak} />
                    </div>

                    {/* Points */}
                    <span className={cn("text-[13px] font-black tabular-nums text-right", isMe ? "text-primary" : "text-foreground")}>
                      {r.points_total.toLocaleString()}
                    </span>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      ) : null}

      {/* ── Competition Stats strip ── */}
      {rows.length > 0 && !isLoading && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
          className="grid grid-cols-3 gap-3">
          {[
            { label: "Total Students", value: rows.length, icon: Users, color: "text-primary", bg: "bg-primary/10" },
            { label: "Top Score",      value: rows[0]?.points_total.toLocaleString() ?? "—", icon: Trophy, color: "text-gold",    bg: "bg-gold/10" },
            { label: "Your Rank",      value: myRow ? `#${myRow.rank}` : "—",                icon: Target,  color: "text-success", bg: "bg-success/10" },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="rounded-2xl border border-border-subtle bg-surface-1 p-3 text-center shadow-xs">
              <div className={cn("h-8 w-8 rounded-xl flex items-center justify-center mx-auto mb-2", bg)}>
                <Icon className={cn("h-4 w-4", color)} />
              </div>
              <p className="text-[16px] font-black text-foreground tabular-nums">{value}</p>
              <p className="text-[9px] uppercase tracking-widest text-muted-foreground mt-0.5">{label}</p>
            </div>
          ))}
        </motion.div>
      )}

      {/* ── Achievements CTA ── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
        <Link to="/app/achievements"
          className="flex items-center justify-between rounded-2xl border border-border-subtle bg-surface-1 px-5 py-4 hover:bg-surface-2 transition-colors duration-150 group shadow-xs">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-premium/10 flex items-center justify-center">
              <Award className="h-4.5 w-4.5 text-premium" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-foreground">Achievements & Points</p>
              <p className="text-[11px] text-muted-foreground">View your milestones and point history</p>
            </div>
          </div>
          <Zap className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
        </Link>
      </motion.div>
    </div>
  );
}
