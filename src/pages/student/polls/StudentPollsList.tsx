import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyStateCard } from "@/components/ui/empty-state";
import { FadeIn } from "@/components/ui/motion";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { BarChart2, Users, CheckCircle2 } from "lucide-react";

export default function StudentPollsList() {
  const qc = useQueryClient();

  const meQuery = useQuery({
    queryKey: ["student", "me_polls"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    },
    staleTime: 120_000,
  });

  const pollsQuery = useQuery({
    queryKey: ["student", "polls"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("polls")
        .select("id,question,options,is_anonymous,expires_at,created_at")
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
    onSuccess: async () => {
      toast.success("Vote recorded!");
      qc.invalidateQueries({ queryKey: ["student", "poll_votes"] });
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (userData.user) {
          await supabase.functions.invoke("recompute-intelligence", {
            body: { userId: userData.user.id },
          });
        }
      } catch { /* best-effort */ }
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Already voted"),
  });

  const userId = meQuery.data?.id;

  if (pollsQuery.isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
      </div>
    );
  }

  const polls = pollsQuery.data ?? [];

  return (
    <div className="space-y-5 page-enter">
      {/* Header */}
      <FadeIn>
        <div className="flex items-center gap-2">
          <BarChart2 className="h-4 w-4 text-muted-foreground" />
          <h1 className="text-heading text-foreground">Polls</h1>
        </div>
      </FadeIn>

      {polls.length === 0 ? (
        <EmptyStateCard
          emoji="🗳️"
          title="No active polls"
          description="Polls and surveys from your college will appear here. Cast your vote and share your opinion!"
        />
      ) : (
        <div className="space-y-3">
          {polls.map((p: any, i: number) => {
            const opts = Array.isArray(p.options) ? p.options as string[] : [];
            const allVotes = (votesQuery.data ?? []).filter((v: any) => v.poll_id === p.id);
            const total = allVotes.length;
            const myVote = allVotes.find((v: any) => v.user_id === userId);
            const hasVoted = Boolean(myVote);

            return (
              <FadeIn key={p.id} delay={i * 30}>
                <div className="rounded-xl border border-border-subtle bg-surface-1 shadow-xs overflow-hidden">
                  {/* Poll header */}
                  <div className="px-5 pt-5 pb-3 border-b border-border-subtle">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-[14px] font-semibold text-foreground leading-snug flex-1">{p.question}</h3>
                      {hasVoted && (
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-success bg-success/10 border border-success/20 rounded-full px-2 py-0.5 shrink-0">
                          <CheckCircle2 className="h-2.5 w-2.5" /> Voted
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Options */}
                  <div className="px-5 py-4 space-y-2.5">
                    {opts.map((opt: string, idx: number) => {
                      const count = allVotes.filter((v: any) => v.option_index === idx).length;
                      const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                      const isMyChoice = myVote?.option_index === idx;

                      return hasVoted ? (
                        <div key={idx} className="space-y-1.5">
                          <div className="flex justify-between text-[12px]">
                            <span className={cn(
                              "font-medium flex items-center gap-1.5",
                              isMyChoice ? "text-primary" : "text-foreground",
                            )}>
                              {isMyChoice && <CheckCircle2 className="h-3 w-3" />}
                              {opt}
                            </span>
                            <span className="text-muted-foreground font-semibold tabular-nums">{pct}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-surface-3 overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all duration-slow",
                                isMyChoice ? "bg-primary" : "bg-surface-4",
                              )}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <button
                          key={idx}
                          className={cn(
                            "w-full text-left px-4 py-2.5 rounded-lg border text-[13px] font-medium",
                            "border-border-subtle bg-surface-2 text-foreground",
                            "hover:border-primary/40 hover:bg-primary/5 hover:text-primary",
                            "transition-fast press-scale",
                            "disabled:opacity-50 disabled:cursor-not-allowed",
                          )}
                          onClick={() => voteMutation.mutate({ pollId: p.id, optionIndex: idx })}
                          disabled={voteMutation.isPending}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>

                  {/* Footer */}
                  <div className="px-5 pb-4 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <Users className="h-3 w-3" />
                    <span>{total} vote{total !== 1 ? "s" : ""}</span>
                    <span className="text-border-strong">·</span>
                    <span>{format(new Date(p.created_at), "dd MMM")}</span>
                    {p.is_anonymous && (
                      <>
                        <span className="text-border-strong">·</span>
                        <Badge variant="secondary" className="text-[9px] h-4">Anonymous</Badge>
                      </>
                    )}
                  </div>
                </div>
              </FadeIn>
            );
          })}
        </div>
      )}
    </div>
  );
}
