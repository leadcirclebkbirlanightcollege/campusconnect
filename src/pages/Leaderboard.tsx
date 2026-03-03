import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Trophy, Filter, Crown, Medal, Award, TrendingUp, TrendingDown, Minus, BadgeCheck } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FadeIn, SlideUp } from "@/components/ui/motion";
import { Skeleton } from "@/components/ui/skeleton";

type LeaderRow = {
  user_id: string;
  name: string;
  avatar_url: string | null;
  is_verified: boolean;
  points_total: number;
  rank: number;
};

const PODIUM_ICONS = [
  { icon: Crown,  color: "text-gold",     bg: "bg-gold/10 border-gold/25",     size: "h-5 w-5" },
  { icon: Medal,  color: "text-[hsl(215_15%_65%)]", bg: "bg-surface-3 border-border-subtle", size: "h-4 w-4" },
  { icon: Award,  color: "text-[hsl(22_60%_55%)]",  bg: "bg-surface-3 border-border-subtle", size: "h-4 w-4" },
];

export default function Leaderboard() {
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [tab, setTab] = useState<"alltime" | "weekly">("alltime");

  const meQuery = useQuery({
    queryKey: ["student", "me"],
    queryFn: async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      return data.user ?? null;
    },
  });

  const leaderboardQuery = useQuery({
    queryKey: ["leaderboard", { verifiedOnly }],
    queryFn: async (): Promise<LeaderRow[]> => {
      const { data, error } = await supabase.rpc("get_leaderboard", {
        p_limit: 100,
        p_verified_only: verifiedOnly,
      });
      if (error) throw error;
      return (data ?? []) as unknown as LeaderRow[];
    },
  });

  const weeklyQuery = useQuery({
    queryKey: ["leaderboard", "weekly"],
    enabled: tab === "weekly",
    queryFn: async (): Promise<any[]> => {
      const { data, error } = await supabase.rpc("get_weekly_leaderboard" as any, { p_limit: 100 });
      if (error) throw error;
      return (data ?? []) as any;
    },
  });

  const rows = useMemo(() => {
    if (tab === "weekly") return (weeklyQuery.data ?? []).map((r: any) => ({ ...r, points_total: r.weekly_points }));
    return leaderboardQuery.data ?? [];
  }, [leaderboardQuery.data, weeklyQuery.data, tab]);

  const myRank = rows.find((r) => r.user_id === meQuery.data?.id);
  const isLoading = leaderboardQuery.isLoading || (tab === "weekly" && weeklyQuery.isLoading);
  const top3 = rows.slice(0, 3);
  const rest = rows.slice(3);

  return (
    <div className="space-y-6 page-enter">

      {/* ── Header ── */}
      <FadeIn>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Trophy className="h-5 w-5 text-gold" />
              <h1 className="text-heading text-foreground">Leaderboard</h1>
            </div>
            <p className="text-caption text-muted-foreground">
              {tab === "weekly" ? "This week's champions" : "All-time rankings"}
            </p>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex rounded-lg border border-border-subtle bg-surface-2 p-0.5">
              <button
                onClick={() => setTab("alltime")}
                className={cn(
                  "px-3 py-1 rounded-md text-caption font-medium transition-fast",
                  tab === "alltime"
                    ? "bg-surface-1 text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                All-time
              </button>
              <button
                onClick={() => setTab("weekly")}
                className={cn(
                  "px-3 py-1 rounded-md text-caption font-medium transition-fast",
                  tab === "weekly"
                    ? "bg-surface-1 text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Weekly
              </button>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setVerifiedOnly((v) => !v)}
              className={cn("h-7 text-caption gap-1.5", verifiedOnly && "border-primary/40 text-primary")}
            >
              <Filter className="h-3 w-3" />
              {verifiedOnly ? "Verified" : "All"}
            </Button>
          </div>
        </div>
      </FadeIn>

      {/* ── Your Position ── */}
      {myRank && (
        <FadeIn delay={30}>
          <div className="rounded-xl border border-primary/20 bg-primary/5 px-5 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center">
                <span className="text-caption font-bold text-primary">#{myRank.rank}</span>
              </div>
              <span className="text-body font-medium text-foreground">Your Position</span>
            </div>
            <span className="text-body-lg font-bold text-foreground tabular-nums">{myRank.points_total} pts</span>
          </div>
        </FadeIn>
      )}

      {/* ── TOP 3 PODIUM ── */}
      {isLoading ? (
        <div className="grid grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className={cn("rounded-xl", i === 0 ? "h-44" : "h-36")} />
          ))}
        </div>
      ) : top3.length >= 3 ? (
        <SlideUp delay={50}>
          <div className="grid grid-cols-3 gap-3 items-end">
            {/* 2nd place */}
            <PodiumCard row={top3[1]} myId={meQuery.data?.id} position={2} height="h-36" />
            {/* 1st place — tallest */}
            <PodiumCard row={top3[0]} myId={meQuery.data?.id} position={1} height="h-44" featured />
            {/* 3rd place */}
            <PodiumCard row={top3[2]} myId={meQuery.data?.id} position={3} height="h-32" />
          </div>
        </SlideUp>
      ) : null}

      {/* ── REST OF LEADERBOARD ── */}
      {isLoading ? (
        <div className="rounded-xl border border-border-subtle bg-surface-1 divide-y divide-border-subtle overflow-hidden shadow-xs">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3">
              <Skeleton className="h-3 w-6" />
              <Skeleton className="h-7 w-7 rounded-full" />
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-3 w-14 ml-auto" />
            </div>
          ))}
        </div>
      ) : rest.length === 0 ? (
        <div className="rounded-xl border border-border-subtle bg-surface-1 shadow-xs py-16 text-center">
          <p className="text-caption text-muted-foreground">
            {tab === "weekly" ? "No activity this week." : "No students found."}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border-subtle bg-surface-1 shadow-xs overflow-hidden">
          <div className="divide-y divide-border-subtle">
            {rest.map((r, i) => {
              const isMe = r.user_id === meQuery.data?.id;
              return (
                <FadeIn key={r.user_id} delay={i * 15}>
                  <div
                    className={cn(
                      "flex items-center gap-4 px-5 py-3 transition-fast",
                      isMe ? "bg-primary/4" : "hover:bg-surface-2",
                    )}
                  >
                    <span className="text-caption font-semibold text-muted-foreground tabular-nums w-6 text-right shrink-0">
                      {r.rank}
                    </span>

                    <Avatar className="h-7 w-7 shrink-0">
                      <AvatarImage src={r.avatar_url ?? undefined} />
                      <AvatarFallback className="text-[10px] font-semibold bg-primary/10 text-primary">
                        {r.name?.slice(0, 1)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0 flex items-center gap-1.5">
                      <span className={cn(
                        "text-caption truncate",
                        isMe ? "font-semibold text-foreground" : "text-foreground",
                      )}>
                        {r.name}
                      </span>
                      {r.is_verified && <BadgeCheck className="h-3 w-3 text-primary shrink-0" />}
                      {isMe && (
                        <span className="ml-1 inline-flex items-center rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold text-primary leading-none">
                          YOU
                        </span>
                      )}
                    </div>

                    <span className={cn(
                      "text-caption font-bold tabular-nums shrink-0",
                      isMe ? "text-primary" : "text-foreground",
                    )}>
                      {r.points_total}
                    </span>
                  </div>
                </FadeIn>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Podium Card ─────────────────────────────────────────────── */
function PodiumCard({
  row,
  myId,
  position,
  height,
  featured,
}: {
  row: LeaderRow;
  myId?: string;
  position: 1 | 2 | 3;
  height: string;
  featured?: boolean;
}) {
  const isMe = row.user_id === myId;
  const pod = PODIUM_ICONS[position - 1];
  const PodIcon = pod.icon;

  return (
    <div
      className={cn(
        "relative rounded-xl border flex flex-col items-center justify-end p-3 text-center transition-fast",
        height,
        featured
          ? "border-gold/30 bg-gradient-to-b from-gold/5 to-surface-1 shadow-sm"
          : "border-border-subtle bg-surface-1 shadow-xs",
        isMe && "ring-1 ring-primary/30",
      )}
    >
      {/* Rank icon */}
      <div className={cn(
        "absolute top-3 right-3 h-6 w-6 rounded-full border flex items-center justify-center",
        pod.bg,
      )}>
        <PodIcon className={cn(pod.size, pod.color)} />
      </div>

      <Avatar className={cn("mb-2 shrink-0", featured ? "h-10 w-10" : "h-8 w-8")}>
        <AvatarImage src={row.avatar_url ?? undefined} />
        <AvatarFallback className="text-[11px] font-bold bg-primary/10 text-primary">
          {row.name?.slice(0, 1)}
        </AvatarFallback>
      </Avatar>

      {row.is_verified && (
        <BadgeCheck className="h-3 w-3 text-primary mb-0.5" />
      )}

      <p className="text-[11px] font-semibold text-foreground truncate w-full leading-tight">
        {row.name?.split(" ")[0]}
      </p>
      <p className={cn(
        "text-[10px] font-bold tabular-nums mt-0.5",
        featured ? "text-gold" : "text-muted-foreground",
      )}>
        {row.points_total} pts
      </p>

      {/* Position number at bottom */}
      <div className={cn(
        "absolute bottom-2 left-2 text-[10px] font-black",
        featured ? "text-gold/70" : "text-muted-foreground/50",
      )}>
        #{position}
      </div>
    </div>
  );
}
