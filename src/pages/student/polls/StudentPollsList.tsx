import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { BarChart3, CheckCircle } from "lucide-react";
import { format } from "date-fns";

export default function StudentPollsList() {
  const qc = useQueryClient();

  const meQuery = useQuery({
    queryKey: ["student", "me_polls"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    },
  });

  const pollsQuery = useQuery({
    queryKey: ["student", "polls"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("polls")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const votesQuery = useQuery({
    queryKey: ["student", "poll_votes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("poll_votes").select("poll_id, option_index, user_id");
      if (error) throw error;
      return data ?? [];
    },
  });

  const voteMutation = useMutation({
    mutationFn: async ({ pollId, optionIndex }: { pollId: string; optionIndex: number }) => {
      const user = meQuery.data;
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("poll_votes").insert({
        poll_id: pollId,
        user_id: user.id,
        option_index: optionIndex,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Vote recorded!");
      qc.invalidateQueries({ queryKey: ["student", "poll_votes"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Already voted"),
  });

  const userId = meQuery.data?.id;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary" /> Polls
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Share your opinion</p>
      </header>

      {pollsQuery.data?.length === 0 && (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No active polls.</CardContent></Card>
      )}

      <div className="space-y-4">
        {pollsQuery.data?.map((p: any) => {
          const opts = Array.isArray(p.options) ? p.options as string[] : [];
          const allVotes = (votesQuery.data ?? []).filter((v: any) => v.poll_id === p.id);
          const total = allVotes.length;
          const myVote = allVotes.find((v: any) => v.user_id === userId);
          const hasVoted = Boolean(myVote);

          return (
            <Card key={p.id} className="border-border/50">
              <CardContent className="py-4 space-y-3">
                <div className="flex items-start justify-between">
                  <h3 className="font-medium text-foreground">{p.question}</h3>
                  {hasVoted && <Badge variant="secondary" className="gap-1 text-[10px]"><CheckCircle className="h-3 w-3" /> Voted</Badge>}
                </div>
                <div className="space-y-2">
                  {opts.map((opt: string, i: number) => {
                    const count = allVotes.filter((v: any) => v.option_index === i).length;
                    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                    const isMyChoice = myVote?.option_index === i;

                    return hasVoted ? (
                      <div key={i} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className={isMyChoice ? "font-medium text-primary" : "text-muted-foreground"}>{opt}</span>
                          <span className="text-xs font-medium">{pct}%</span>
                        </div>
                        <Progress value={pct} className="h-2" />
                      </div>
                    ) : (
                      <Button
                        key={i}
                        variant="outline"
                        className="w-full justify-start text-sm"
                        onClick={() => voteMutation.mutate({ pollId: p.id, optionIndex: i })}
                        disabled={voteMutation.isPending}
                      >
                        {opt}
                      </Button>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">{total} votes · {format(new Date(p.created_at), "PP")}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
