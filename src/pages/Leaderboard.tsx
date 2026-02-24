import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, Filter, Trophy } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

type LeaderRow = {
  user_id: string;
  name: string;
  avatar_url: string | null;
  is_verified: boolean;
  points_total: number;
  rank: number;
};

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Rankings</h2>
          <p className="text-sm text-muted-foreground">
            {tab === "weekly" ? "This week's points ranking" : "All-time points ranking"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={tab === "alltime" ? "default" : "outline"}
            size="sm"
            onClick={() => setTab("alltime")}
          >
            All-time
          </Button>
          <Button
            variant={tab === "weekly" ? "default" : "outline"}
            size="sm"
            onClick={() => setTab("weekly")}
          >
            Weekly
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setVerifiedOnly((v) => !v)}
          >
            <Filter className="h-3.5 w-3.5" />
            {verifiedOnly ? "Verified" : "All"}
          </Button>
        </div>
      </div>

      {/* Your Position */}
      {myRank && (
        <Card className="bg-primary/5 border-primary/15">
          <CardContent className="flex items-center justify-between py-3.5">
            <div className="flex items-center gap-3">
              <span className="text-lg font-semibold text-primary tabular-nums">#{myRank.rank}</span>
              <span className="text-sm font-medium text-foreground">Your Position</span>
            </div>
            <span className="text-sm font-semibold text-foreground tabular-nums">{myRank.points_total} pts</span>
          </CardContent>
        </Card>
      )}

      {/* Ranking Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Rank</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead className="text-right w-24">Points</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="py-10 text-center text-muted-foreground">Loading...</TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="py-10 text-center text-muted-foreground">
                      {tab === "weekly" ? "No activity this week." : "No students found."}
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => {
                    const isMe = r.user_id === meQuery.data?.id;
                    return (
                      <TableRow key={r.user_id} className={isMe ? "bg-primary/5" : ""}>
                        <TableCell className="font-semibold text-muted-foreground tabular-nums">
                          #{r.rank}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <Avatar className="h-7 w-7">
                              <AvatarImage src={r.avatar_url ?? undefined} />
                              <AvatarFallback className="text-xs">{r.name?.slice(0, 1)}</AvatarFallback>
                            </Avatar>
                            <span className={cn("text-sm", isMe && "font-medium")}>{r.name}</span>
                            {r.is_verified && <BadgeCheck className="h-3.5 w-3.5 text-primary shrink-0" />}
                            {isMe && <Badge variant="secondary" className="text-[10px] h-4">You</Badge>}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">{r.points_total}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
