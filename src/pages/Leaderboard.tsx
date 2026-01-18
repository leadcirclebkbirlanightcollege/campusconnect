import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, Crown, Filter, Trophy } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

  const rows = useMemo(() => leaderboardQuery.data ?? [], [leaderboardQuery.data]);

  return (
    <main className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-4xl font-bold bg-gradient-premium bg-clip-text text-transparent flex items-center gap-3">
          <Trophy className="h-8 w-8 text-primary" />
          Leaderboard
        </h1>
        <p className="mt-2 text-muted-foreground">All-time points ranking across active students.</p>
      </header>

      <Card className="border-primary/10">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-primary" />
              Top Students
            </CardTitle>
            <CardDescription>Verified students can be filtered for quick recognition.</CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={verifiedOnly ? "secondary" : "outline"}
              className="gap-2"
              onClick={() => setVerifiedOnly((v) => !v)}
            >
              <Filter className="h-4 w-4" />
              {verifiedOnly ? "Verified only" : "All students"}
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="rounded-lg border border-border/60 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[90px]">Rank</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead className="text-right">Points</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaderboardQuery.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="py-10 text-center text-muted-foreground">
                      Loading leaderboard…
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="py-10 text-center text-muted-foreground">
                      No students found.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => (
                    <TableRow key={r.user_id}>
                      <TableCell className="font-medium">
                        <span className="inline-flex items-center gap-2">
                          #{r.rank}
                          {r.rank === 1 ? <Crown className="h-4 w-4 text-primary" /> : null}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{r.name}</span>
                          {r.is_verified ? (
                            <span
                              className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground"
                              aria-label="Verified"
                              title="Verified"
                            >
                              <span className="sr-only">Verified</span>
                              <BadgeCheck className="h-3.5 w-3.5" />
                            </span>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-primary">{r.points_total}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
