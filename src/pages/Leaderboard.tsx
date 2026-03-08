import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Filter, Crown, Medal, Award, BadgeCheck, Flame, Zap, ArrowUp, ArrowDown, Minus, Star } from "lucide-react";
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

/* ── Tier helpers ────────────────────────────────────────────────── */
const TIERS = [
  { key: "bronze",  min: 0,   max: 99,  label: "Bronze",  color: "text-[hsl(22_60%_55%)]",    bg: "bg-[hsl(22_60%_55%/0.12)]",   border: "border-[hsl(22_60%_55%/0.3)]"  },
  { key: "silver",  min: 100, max: 249, label: "Silver",  color: "text-[hsl(215_15%_65%)]",   bg: "bg-[hsl(215_15%_65%/0.12)]",  border: "border-[hsl(215_15%_65%/0.3)]" },
  { key: "gold",    min: 250, max: 499, label: "Gold",    color: "text-gold",                  bg: "bg-gold/10",                  border: "border-gold/30"                 },
  { key: "elite",   min: 500, max: Infinity, label: "Elite", color: "text-premium",            bg: "bg-premium/10",               border: "border-premium/30"              },
] as const;

function getTier(pts: number) {
  return [...TIERS].reverse().find((t) => pts >= t.min) ?? TIERS[0];
}

function TierBadge({ pts }: { pts: number }) {
  const t = getTier(pts);
  return (
    <span className={cn("inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full border", t.color, t.bg, t.border)}>
      {t.key === "elite" ? <Star className="h-2.5 w-2.5" /> : t.key === "gold" ? <Crown className="h-2.5 w-2.5" /> : null}
      {t.label}
    </span>
  );
}

/* ── Podium card ─────────────────────────────────────────────────── */
function PodiumCard({ row, myId, position, featured }: {
  row: LeaderRow; myId?: string; position: 1 | 2 | 3; featured?: boolean;
}) {
  const isMe = row.user_id === myId;
  const podiumMeta = [
    { icon: Crown,  label: "1st", glow: "shadow-[0_0_24px_hsl(var(--gold)/0.35)]",  height: "h-[180px]", accent: "border-gold/30 bg-gradient-to-b from-gold/8 to-surface-1" },
    { icon: Medal,  label: "2nd", glow: "",                                           height: "h-[148px]", accent: "border-border-subtle bg-surface-1" },
    { icon: Award,  label: "3rd", glow: "",                                           height: "h-[132px]", accent: "border-border-subtle bg-surface-1" },
  ][position - 1];
  const PodIcon = podiumMeta.icon;
  const tier = getTier(row.points_total);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay: position * 0.06 }}
      className={cn(
        "relative rounded-2xl border flex flex-col items-center justify-end p-3 pb-4 text-center transition-all duration-150",
        podiumMeta.height,
        podiumMeta.accent,
        podiumMeta.glow,
        isMe && "ring-2 ring-primary/30",
        "hover:-translate-y-0.5",
      )}
    >
      {/* Rank icon badge */}
      <div className={cn("absolute top-2.5 left-1/2 -translate-x-1/2 h-7 w-7 rounded-full flex items-center justify-center border shadow-xs",
        position === 1 ? "bg-gold/15 border-gold/40" : "bg-surface-3 border-border-subtle"
      )}>
        <PodIcon className={cn("h-3.5 w-3.5", position === 1 ? "text-gold" : "text-muted-foreground")} />
      </div>

      <Avatar className={cn("mb-2 ring-2 shadow-sm", featured ? "h-12 w-12 ring-gold/40" : "h-10 w-10 ring-border-subtle")}>
        <AvatarImage src={row.avatar_url ?? undefined} />
        <AvatarFallback className={cn("text-[13px] font-bold", featured ? "bg-gold/10 text-gold" : "bg-primary/10 text-primary")}>
          {row.name?.slice(0, 1)}
        </AvatarFallback>
      </Avatar>

      {row.is_verified && <BadgeCheck className="h-3 w-3 text-primary mb-0.5" />}

      <p className="text-[12px] font-semibold text-foreground truncate w-full leading-tight">{row.name?.split(" ")[0]}</p>
      <p className={cn("text-[11px] font-bold tabular-nums mt-0.5", featured ? "text-gold" : "text-muted-foreground")}>
        {row.points_total.toLocaleString()} pts
      </p>
      <div className="mt-1"><TierBadge pts={row.points_total} /></div>
    </motion.div>
  );
}

/* ── Rank movement indicator ─────────────────────────────────────── */
function RankDelta({ delta }: { delta: number }) {
  if (delta > 0) return <span className="flex items-center gap-0.5 text-[10px] font-semibold text-success tabular-nums"><ArrowUp className="h-2.5 w-2.5" />{delta}</span>;
  if (delta < 0) return <span className="flex items-center gap-0.5 text-[10px] font-semibold text-danger tabular-nums"><ArrowDown className="h-2.5 w-2.5" />{Math.abs(delta)}</span>;
  return <Minus className="h-2.5 w-2.5 text-muted-foreground/50" />;
}

/* ═══════════════════════════════════════════════════════════════ */
export default function Leaderboard() {
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [tab, setTab] = useState<"alltime" | "weekly">("alltime");

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
  const myId = meQuery.data?.id;
  const myRow = rows.find((r) => r.user_id === myId);
  const top3 = rows.slice(0, 3);
  const rest = rows.slice(3);

  // Points to reach next rank
  const pointsToNextRank = useMemo(() => {
    if (!myRow) return null;
    const above = rows.find((r) => r.rank === myRow.rank - 1);
    if (!above) return null;
    return above.points_total - myRow.points_total + 1;
  }, [rows, myRow]);

  return (
    <div className="space-y-5 page-enter max-w-2xl mx-auto pb-8">

      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <div className="h-8 w-8 rounded-xl bg-gold/10 flex items-center justify-center">
                <Trophy className="h-4.5 w-4.5 text-gold" />
              </div>
              <h1 className="text-heading text-foreground">Leaderboard</h1>
            </div>
            <p className="text-caption text-muted-foreground pl-10">
              {tab === "weekly" ? "This week's champions" : "All-time rankings · " + rows.length + " students"}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex rounded-lg border border-border-subtle bg-surface-2 p-0.5">
              {(["alltime", "weekly"] as const).map((t) => (
                <button key={t} onClick={() => setTab(t)} className={cn(
                  "px-3 py-1 rounded-md text-caption font-medium transition-all duration-150",
                  tab === t ? "bg-surface-1 text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                )}>
                  {t === "alltime" ? "All-time" : "Weekly"}
                </button>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={() => setVerifiedOnly((v) => !v)}
              className={cn("h-7 text-caption gap-1.5", verifiedOnly && "border-primary/40 text-primary")}>
              <Filter className="h-3 w-3" />
              {verifiedOnly ? "Verified" : "All"}
            </Button>
          </div>
        </div>
      </motion.div>

      {/* ── Your Position card ── */}
      {myRow && (
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2 }}>
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 shadow-xs">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center shrink-0">
                  <span className="text-caption font-black text-primary">#{myRow.rank}</span>
                </div>
                <div>
                  <p className="text-[12px] font-semibold text-foreground">Your Position</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <TierBadge pts={myRow.points_total} />
                    {myStreakQ.data?.current_streak > 0 && (
                      <span className="flex items-center gap-0.5 text-[10px] text-warning font-semibold">
                        <Flame className="h-2.5 w-2.5" />{myStreakQ.data.current_streak}d
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-foreground tabular-nums">{myRow.points_total.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">total points</p>
              </div>
              {pointsToNextRank !== null && pointsToNextRank > 0 && (
                <div className="w-full">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                    <span>Next rank</span>
                    <span className="font-medium text-foreground">+{pointsToNextRank} pts required</span>
                  </div>
                  <Progress value={Math.max(5, 100 - (pointsToNextRank / Math.max(1, myRow.points_total)) * 100)} className="h-1" />
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Podium ── */}
      {isLoading ? (
        <div className="grid grid-cols-3 gap-3 items-end">
          <Skeleton className="rounded-2xl h-[148px]" />
          <Skeleton className="rounded-2xl h-[180px]" />
          <Skeleton className="rounded-2xl h-[132px]" />
        </div>
      ) : top3.length >= 2 ? (
        <div className="grid grid-cols-3 gap-3 items-end">
          {top3[1] && <PodiumCard row={top3[1]} myId={myId} position={2} />}
          {top3[0] && <PodiumCard row={top3[0]} myId={myId} position={1} featured />}
          {top3[2] && <PodiumCard row={top3[2]} myId={myId} position={3} />}
        </div>
      ) : null}

      {/* ── Rest of leaderboard ── */}
      {isLoading ? (
        <div className="rounded-2xl border border-border-subtle bg-surface-1 overflow-hidden shadow-xs divide-y divide-border-subtle">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-3">
              <Skeleton className="h-3 w-6" />
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-3 w-36" />
              <Skeleton className="h-3 w-12 ml-auto" />
            </div>
          ))}
        </div>
      ) : rest.length === 0 ? (
        <div className="rounded-2xl border border-border-subtle bg-surface-1 shadow-xs py-12 text-center">
          <p className="text-caption text-muted-foreground">{tab === "weekly" ? "No activity this week yet. Earn points to join the board!" : "No students on the leaderboard yet."}</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border-subtle bg-surface-1 shadow-xs overflow-hidden">
          {/* Column header */}
          <div className="grid grid-cols-[40px_1fr_auto] items-center px-5 py-2.5 bg-surface-2 border-b border-border-subtle text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            <span>#</span>
            <span>Student</span>
            <span className="text-right">Points</span>
          </div>
          <div className="divide-y divide-border-subtle/60">
            <AnimatePresence initial={false}>
              {rest.map((r, i) => {
                const isMe = r.user_id === myId;
                const tier = getTier(r.points_total);
                return (
                  <motion.div
                    key={r.user_id}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.15, delay: Math.min(i * 0.02, 0.4) }}
                    className={cn(
                      "flex items-center gap-3 px-5 py-3 transition-colors duration-150",
                      isMe ? "bg-primary/5 border-l-2 border-l-primary" : "hover:bg-surface-2/60",
                    )}
                  >
                    {/* Rank */}
                    <span className={cn("text-caption font-bold tabular-nums w-6 text-right shrink-0",
                      isMe ? "text-primary" : "text-muted-foreground"
                    )}>
                      {r.rank}
                    </span>

                    {/* Avatar */}
                    <Avatar className="h-8 w-8 shrink-0 ring-1 ring-border-subtle">
                      <AvatarImage src={r.avatar_url ?? undefined} />
                      <AvatarFallback className="text-[11px] font-bold bg-primary/10 text-primary">
                        {r.name?.slice(0, 1)}
                      </AvatarFallback>
                    </Avatar>

                    {/* Name + badges */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={cn("text-[13px] truncate", isMe ? "font-semibold text-foreground" : "text-foreground")}>
                          {r.name}
                        </span>
                        {r.is_verified && <BadgeCheck className="h-3 w-3 text-primary shrink-0" />}
                        {isMe && (
                          <span className="inline-flex items-center rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary leading-none shrink-0">
                            YOU
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <TierBadge pts={r.points_total} />
                      </div>
                    </div>

                    {/* Points */}
                    <span className={cn("text-[13px] font-bold tabular-nums shrink-0", isMe ? "text-primary" : "text-foreground")}>
                      {r.points_total.toLocaleString()}
                    </span>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* ── Achievements CTA ── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
        <Link to="/app/achievements" className="flex items-center justify-between rounded-2xl border border-border-subtle bg-surface-1 px-5 py-4 hover:bg-surface-2 transition-colors duration-150 group shadow-xs">
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
