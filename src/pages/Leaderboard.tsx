import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, Crown, Filter, Trophy, Medal } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type LeaderRow = {
  user_id: string;
  name: string;
  avatar_url: string | null;
  is_verified: boolean;
  points_total: number;
  rank: number;
};

const PODIUM_COLORS = [
  "from-premium/30 to-premium/10 border-premium/40",  // Gold
  "from-muted/40 to-muted/20 border-muted-foreground/30", // Silver
  "from-accent/20 to-accent/10 border-accent/30", // Bronze
];

const PODIUM_LABELS = ["1st", "2nd", "3rd"];

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
    queryFn: async (): Promise<{ user_id: string; name: string; avatar_url: string | null; is_verified: boolean; weekly_points: number; rank: number }[]> => {
      const { data, error } = await supabase.rpc("get_weekly_leaderboard" as any, { p_limit: 100 });
      if (error) throw error;
      return (data ?? []) as any;
    },
  });

  const rows = useMemo(() => {
    if (tab === "weekly") return (weeklyQuery.data ?? []).map((r: any) => ({ ...r, points_total: r.weekly_points }));
    return leaderboardQuery.data ?? [];
  }, [leaderboardQuery.data, weeklyQuery.data, tab]);
  const top3 = rows.slice(0, 3);
  const rest = rows.slice(3);
  const myRank = rows.find((r) => r.user_id === meQuery.data?.id);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Trophy className="h-6 w-6 text-primary" />
            Leaderboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {tab === "weekly" ? "This week's points ranking" : "All-time points ranking"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={tab === "alltime" ? "secondary" : "outline"}
            size="sm"
            onClick={() => setTab("alltime")}
          >
            All-time
          </Button>
          <Button
            variant={tab === "weekly" ? "secondary" : "outline"}
            size="sm"
            onClick={() => setTab("weekly")}
          >
            This Week
          </Button>
          <Button
            variant={verifiedOnly ? "secondary" : "outline"}
            size="sm"
            className="gap-2"
            onClick={() => setVerifiedOnly((v) => !v)}
          >
            <Filter className="h-4 w-4" />
            {verifiedOnly ? "Verified" : "All"}
          </Button>
        </div>
      </header>

      {/* Your rank pinned */}
      {myRank && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold text-primary">#{myRank.rank}</span>
              <span className="font-medium text-foreground">Your Rank</span>
            </div>
            <Badge variant="secondary" className="font-mono">{myRank.points_total} pts</Badge>
          </CardContent>
        </Card>
      )}

      {/* Podium */}
      {top3.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[1, 0, 2].map((idx) => {
            const student = top3[idx];
            if (!student) return <div key={idx} />;
            return (
              <Card
                key={student.user_id}
                className={cn(
                  "border bg-gradient-to-b text-center",
                  PODIUM_COLORS[idx],
                  idx === 0 && "sm:-mt-4",
                )}
              >
                <CardContent className="pt-5 pb-4 flex flex-col items-center gap-2">
                  <div className="relative">
                    <Avatar className="h-14 w-14 border-2 border-background">
                      <AvatarImage src={student.avatar_url ?? undefined} />
                      <AvatarFallback>{student.name.slice(0, 1)}</AvatarFallback>
                    </Avatar>
                    {idx === 0 && (
                      <Crown className="absolute -top-3 left-1/2 -translate-x-1/2 h-5 w-5 text-premium" />
                    )}
                  </div>
                  <div className="min-w-0 w-full">
                    <p className="text-sm font-semibold truncate">{student.name}</p>
                    <div className="flex items-center justify-center gap-1">
                      <Badge variant="secondary" className="text-xs font-mono">{student.points_total}</Badge>
                      {student.is_verified && <BadgeCheck className="h-3.5 w-3.5 text-primary" />}
                    </div>
                  </div>
                  <span className="text-xs font-bold text-muted-foreground">{PODIUM_LABELS[idx]}</span>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Rest of the list */}
      {rest.length > 0 && (
        <Card className="border-border/50">
          <CardContent className="p-0 divide-y divide-border/40">
            {rest.map((r) => {
              const isMe = r.user_id === meQuery.data?.id;
              return (
                <div
                  key={r.user_id}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3",
                    isMe && "bg-primary/5",
                  )}
                >
                  <span className="w-8 text-sm font-semibold text-muted-foreground text-right">
                    #{r.rank}
                  </span>
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={r.avatar_url ?? undefined} />
                    <AvatarFallback className="text-xs">{r.name.slice(0, 1)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={cn("text-sm truncate", isMe && "font-semibold")}>{r.name}</span>
                      {r.is_verified && <BadgeCheck className="h-3.5 w-3.5 text-primary flex-shrink-0" />}
                      {isMe && <Badge variant="secondary" className="text-[10px] h-4">You</Badge>}
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-primary">{r.points_total}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {(leaderboardQuery.isLoading || weeklyQuery.isLoading) && (
        <div className="text-center py-10 text-muted-foreground">Loading leaderboard…</div>
      )}
      {!(leaderboardQuery.isLoading || weeklyQuery.isLoading) && rows.length === 0 && (
        <div className="text-center py-10 text-muted-foreground">
          {tab === "weekly" ? "No activity this week yet." : "No students found."}
        </div>
      )}
    </div>
  );
}
