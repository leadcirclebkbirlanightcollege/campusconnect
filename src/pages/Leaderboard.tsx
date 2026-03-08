import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowDown,
  ArrowUp,
  Medal,
  Minus,
  Shield,
  Star,
  Trophy,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";

import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/GlassCard";
import { MetricCountUp } from "@/components/ui/motion";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { PageContainer } from "@/layout/PageContainer";
import { PageHeader } from "@/layout/PageHeader";
import { SECTION_REVEAL_ITEM, SECTION_REVEAL_PARENT } from "@/motion/microInteractions";

type LeaderboardMode = "alltime" | "weekly";

type LeaderboardRow = {
  user_id: string;
  name: string;
  avatar_url: string | null;
  is_verified: boolean;
  points_total: number;
  rank: number;
};

type WeeklyRow = {
  user_id: string;
  name: string;
  avatar_url: string | null;
  is_verified: boolean;
  weekly_points: number;
  rank: number;
};

const PAGE_SIZE = 20;

function tierMeta(points: number) {
  if (points >= 500) {
    return { label: "Elite", className: "border-primary/30 bg-primary/12 text-primary" };
  }
  if (points >= 250) {
    return { label: "Gold", className: "border-warning/35 bg-warning/12 text-warning" };
  }
  if (points >= 100) {
    return { label: "Silver", className: "border-muted-foreground/30 bg-muted text-muted-foreground" };
  }
  return { label: "Bronze", className: "border-accent/40 bg-accent/15 text-accent-foreground" };
}

const TierPill = memo(function TierPill({ points }: { points: number }) {
  const tier = tierMeta(points);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wide",
        tier.className,
      )}
    >
      {tier.label}
    </span>
  );
});

const MovementIndicator = memo(function MovementIndicator({ delta }: { delta: number }) {
  if (delta > 0) {
    return (
      <motion.span
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
        className="inline-flex items-center gap-1 text-[11px] font-bold text-success"
      >
        <ArrowUp className="h-3 w-3" />+{delta}
      </motion.span>
    );
  }

  if (delta < 0) {
    return (
      <motion.span
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
        className="inline-flex items-center gap-1 text-[11px] font-bold text-danger"
      >
        <ArrowDown className="h-3 w-3" />{delta}
      </motion.span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-muted-foreground">
      <Minus className="h-3 w-3" />0
    </span>
  );
});

const PodiumCard = memo(function PodiumCard({
  row,
  rank,
  isCurrentUser,
}: {
  row: LeaderboardRow;
  rank: 1 | 2 | 3;
  isCurrentUser: boolean;
}) {
  const isFirst = rank === 1;

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, delay: rank * 0.06 }}
      className={cn(
        "rounded-2xl border p-3 text-center",
        isFirst
          ? "border-primary/35 bg-gradient-to-b from-primary/12 to-surface-1 shadow-glow"
          : "border-border-subtle bg-surface-1",
        rank === 1 ? "min-h-[190px]" : "min-h-[162px]",
      )}
    >
      <div className="mb-2 inline-flex h-7 w-7 items-center justify-center rounded-full border border-border-subtle bg-surface-2 text-foreground">
        {rank === 1 ? <Trophy className="h-3.5 w-3.5 text-primary" /> : <Medal className="h-3.5 w-3.5" />}
      </div>

      <div className="mx-auto mb-2 w-fit">
        <Avatar className={cn(rank === 1 ? "h-14 w-14" : "h-12 w-12", "ring-2 ring-border-subtle")}>
          <AvatarImage src={row.avatar_url ?? undefined} />
          <AvatarFallback className="bg-primary/12 font-bold text-primary">
            {row.name.slice(0, 1)}
          </AvatarFallback>
        </Avatar>
      </div>

      <p className="line-clamp-1 text-sm font-bold text-foreground">{row.name}</p>
      {isCurrentUser ? (
        <span className="mt-1 inline-flex rounded-full bg-primary/12 px-2 py-0.5 text-[9px] font-black text-primary">YOU</span>
      ) : null}
      <p className="mt-2 text-lg font-black text-foreground tabular-nums">
        <MetricCountUp value={row.points_total} duration={800} />
      </p>
      <p className="text-[11px] text-muted-foreground">points</p>
      <div className="mt-2">
        <TierPill points={row.points_total} />
      </div>
    </motion.article>
  );
});

const LeaderboardListRow = memo(function LeaderboardListRow({
  row,
  myId,
  movement,
}: {
  row: LeaderboardRow;
  myId: string | undefined;
  movement: number;
}) {
  const isMe = row.user_id === myId;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
    >
      <GlassCard
        hover
        className={cn(
          "grid min-h-12 grid-cols-[44px_1fr_auto] items-center gap-3",
          isMe && "border-primary/35 bg-primary/8",
        )}
      >
        <div className="text-center">
          <p className={cn("text-sm font-black tabular-nums", isMe ? "text-primary" : "text-foreground")}>#{row.rank}</p>
          <MovementIndicator delta={movement} />
        </div>

        <div className="flex min-w-0 items-center gap-2.5">
          <Avatar className="h-10 w-10 ring-1 ring-border-subtle">
            <AvatarImage src={row.avatar_url ?? undefined} />
            <AvatarFallback className="bg-primary/12 font-bold text-primary">{row.name.slice(0, 1)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="truncate text-sm font-semibold text-foreground">{row.name}</p>
              {row.is_verified ? <Shield className="h-3.5 w-3.5 text-primary" /> : null}
            </div>
            <TierPill points={row.points_total} />
          </div>
        </div>

        <div className="text-right">
          <p className={cn("text-base font-black tabular-nums", isMe ? "text-primary" : "text-foreground")}>
            <MetricCountUp value={row.points_total} duration={800} />
          </p>
          <p className="text-[11px] text-muted-foreground">pts</p>
        </div>
      </GlassCard>
    </motion.div>
  );
});

export default function Leaderboard() {
  const [mode, setMode] = useState<LeaderboardMode>("alltime");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [mode]);

  const meQuery = useQuery({
    queryKey: ["leaderboard", "me"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user ?? null;
    },
    staleTime: 60_000,
  });

  const allTimeQuery = useQuery({
    queryKey: ["leaderboard", "alltime", visibleCount],
    queryFn: async (): Promise<LeaderboardRow[]> => {
      const { data, error } = await supabase.rpc("get_leaderboard", {
        p_limit: visibleCount,
        p_verified_only: false,
      });
      if (error) throw error;
      return (data ?? []) as unknown as LeaderboardRow[];
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const weeklyQuery = useQuery({
    queryKey: ["leaderboard", "weekly", visibleCount],
    queryFn: async (): Promise<LeaderboardRow[]> => {
      const { data, error } = await supabase.rpc("get_weekly_leaderboard" as any, {
        p_limit: visibleCount,
      } as any);
      if (error) throw error;
      return ((data ?? []) as WeeklyRow[]).map((row) => ({
        user_id: row.user_id,
        name: row.name,
        avatar_url: row.avatar_url,
        is_verified: row.is_verified,
        points_total: row.weekly_points,
        rank: row.rank,
      }));
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const activeRows = mode === "alltime" ? allTimeQuery.data ?? [] : weeklyQuery.data ?? [];
  const compareRows = mode === "alltime" ? weeklyQuery.data ?? [] : allTimeQuery.data ?? [];
  const isLoading = allTimeQuery.isLoading || weeklyQuery.isLoading || meQuery.isLoading;
  const myId = meQuery.data?.id;

  const movementMap = useMemo(() => {
    const compareRankByUser = new Map(compareRows.map((row) => [row.user_id, row.rank]));
    return new Map(
      activeRows.map((row) => {
        const otherRank = compareRankByUser.get(row.user_id);
        if (!otherRank) return [row.user_id, 0] as const;
        return [row.user_id, otherRank - row.rank] as const;
      }),
    );
  }, [activeRows, compareRows]);

  const myRow = useMemo(() => activeRows.find((row) => row.user_id === myId), [activeRows, myId]);
  const top3 = activeRows.slice(0, 3);
  const listRows = activeRows.slice(3);

  const hasMore = activeRows.length >= visibleCount;

  return (
    <PageContainer className="space-y-6" withBottomNav>
      <PageHeader
        title="Leaderboard"
        subtitle={mode === "alltime" ? "All-time competition standings" : "Weekly competition standings"}
        variant="large"
        gradient
      />

      <motion.div variants={SECTION_REVEAL_PARENT} initial="hidden" animate="show" className="space-y-6">
        <motion.section variants={SECTION_REVEAL_ITEM} className="space-y-3">
          <div className="inline-flex rounded-xl border border-border-subtle bg-surface-2 p-1">
            <button
              type="button"
              onClick={() => setMode("alltime")}
              className={cn(
                "min-h-12 rounded-lg px-4 text-xs font-semibold transition-colors",
                mode === "alltime" ? "bg-surface-1 text-foreground" : "text-muted-foreground",
              )}
            >
              All-Time
            </button>
            <button
              type="button"
              onClick={() => setMode("weekly")}
              className={cn(
                "min-h-12 rounded-lg px-4 text-xs font-semibold transition-colors",
                mode === "weekly" ? "bg-surface-1 text-foreground" : "text-muted-foreground",
              )}
            >
              Weekly
            </button>
          </div>
        </motion.section>

        <motion.section variants={SECTION_REVEAL_ITEM} className="space-y-3">
          <SectionHeader title="Top 3 Podium" subtitle="Current leaderboard champions" />
          {isLoading ? (
            <div className="grid grid-cols-3 items-end gap-3">
              <Skeleton className="h-40 rounded-2xl" />
              <Skeleton className="h-48 rounded-2xl" />
              <Skeleton className="h-40 rounded-2xl" />
            </div>
          ) : top3.length > 0 ? (
            <div className="grid grid-cols-3 items-end gap-3">
              {top3[1] ? <PodiumCard row={top3[1]} rank={2} isCurrentUser={top3[1].user_id === myId} /> : <div />}
              {top3[0] ? <PodiumCard row={top3[0]} rank={1} isCurrentUser={top3[0].user_id === myId} /> : <div />}
              {top3[2] ? <PodiumCard row={top3[2]} rank={3} isCurrentUser={top3[2].user_id === myId} /> : <div />}
            </div>
          ) : (
            <GlassCard hover={false}>
              <p className="text-sm text-muted-foreground">No leaderboard entries yet.</p>
            </GlassCard>
          )}
        </motion.section>

        <motion.section variants={SECTION_REVEAL_ITEM} className="sticky top-2 z-20">
          {myRow ? (
            <GlassCard className="border-primary/35 bg-gradient-to-br from-primary/12 to-surface-1" elevation="high" hover={false}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Your Rank</p>
                  <p className="text-2xl font-black text-foreground">#{myRow.rank}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Points</p>
                  <p className="text-2xl font-black tabular-nums text-primary">
                    <MetricCountUp value={myRow.points_total} duration={800} />
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between gap-2">
                <TierPill points={myRow.points_total} />
                <MovementIndicator delta={movementMap.get(myRow.user_id) ?? 0} />
              </div>
            </GlassCard>
          ) : (
            <GlassCard hover={false}>
              <p className="text-sm text-muted-foreground">Your rank will appear once you enter the top {visibleCount}.</p>
            </GlassCard>
          )}
        </motion.section>

        <motion.section variants={SECTION_REVEAL_ITEM} className="space-y-3">
          <SectionHeader title="Leaderboard List" subtitle="Track your competitors" />

          {isLoading ? (
            <div className="space-y-3">
              {[...Array(6)].map((_, index) => (
                <Skeleton key={index} className="h-20 rounded-2xl" />
              ))}
            </div>
          ) : listRows.length > 0 ? (
            <div className="space-y-3">
              {listRows.map((row) => (
                <LeaderboardListRow
                  key={row.user_id}
                  row={row}
                  myId={myId}
                  movement={movementMap.get(row.user_id) ?? 0}
                />
              ))}

              {hasMore ? (
                <Button className="h-12 w-full" variant="secondary" onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}>
                  Load 20 more
                </Button>
              ) : null}
            </div>
          ) : (
            <GlassCard hover={false}>
              <p className="text-sm text-muted-foreground">No additional rankings yet.</p>
            </GlassCard>
          )}
        </motion.section>

        <motion.section variants={SECTION_REVEAL_ITEM}>
          <GlassCard className="flex items-center justify-between gap-3" hover>
            <div>
              <p className="text-sm font-semibold text-foreground">Achievements & Rewards</p>
              <p className="text-xs text-muted-foreground">Earn more points and climb the leaderboard faster.</p>
            </div>
            <Link to="/app/achievements" className="inline-flex h-12 items-center rounded-lg border border-primary/30 px-3 text-xs font-semibold text-primary">
              View
            </Link>
          </GlassCard>
        </motion.section>

        <motion.section variants={SECTION_REVEAL_ITEM}>
          <div className="grid grid-cols-2 gap-3">
            <GlassCard hover={false}>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-4 w-4" />
                <p className="text-xs">Visible Players</p>
              </div>
              <p className="mt-2 text-xl font-black text-foreground">{activeRows.length}</p>
            </GlassCard>
            <GlassCard hover={false}>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Star className="h-4 w-4" />
                <p className="text-xs">Top Score</p>
              </div>
              <p className="mt-2 text-xl font-black text-foreground tabular-nums">
                {activeRows[0] ? <MetricCountUp value={activeRows[0].points_total} duration={800} /> : "0"}
              </p>
            </GlassCard>
          </div>
        </motion.section>
      </motion.div>
    </PageContainer>
  );
}
