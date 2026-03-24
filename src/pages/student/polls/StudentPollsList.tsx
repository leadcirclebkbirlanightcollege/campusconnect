import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { BarChart2, Users, CheckCircle2, VoteIcon } from "lucide-react";

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
    staleTime: 60_000,
  });

  const votesQuery = useQuery({
    queryKey: ["student", "poll_votes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("poll_votes").select("poll_id, option_index, user_id");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30_000,
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
    onError: (e) => toast.error(e instanceof Error ? e.message : "Already voted or error"),
  });

  const userId = meQuery.data?.id;

  if (pollsQuery.isLoading) {
    return (
      <div className="space-y-4 px-4 pt-4">
        <Skeleton className="h-8 w-32 rounded-lg" />
        {[1, 2].map((i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
      </div>
    );
  }

  const polls = pollsQuery.data ?? [];

  return (
    <div className="space-y-5 px-4 pt-4 pb-24">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
          <BarChart2 className="h-4.5 w-4.5 text-primary" />
        </div>
        <div>
          <h1 className="text-[18px] font-bold text-foreground leading-tight">Polls & Surveys</h1>
          <p className="text-[12px] text-muted-foreground">{polls.length} active poll{polls.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {polls.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="h-16 w-16 rounded-2xl bg-muted/20 flex items-center justify-center mb-4">
            <VoteIcon className="h-7 w-7 text-muted-foreground/40" />
          </div>
          <h3 className="text-[15px] font-semibold text-foreground mb-1">No polls yet</h3>
          <p className="text-[13px] text-muted-foreground max-w-xs">
            Polls and surveys from your college will appear here. Cast your vote and share your opinion!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {polls.map((p: any) => {
            const opts = Array.isArray(p.options) ? p.options as string[] : [];
            const allVotes = (votesQuery.data ?? []).filter((v: any) => v.poll_id === p.id);
            const total = allVotes.length;
            const myVote = allVotes.find((v: any) => v.user_id === userId);
            const hasVoted = Boolean(myVote);

            return (
              <div key={p.id} className="rounded-2xl border border-border-subtle bg-surface-1 shadow-xs overflow-hidden">
                {/* Poll header */}
                <div className="px-5 pt-4 pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-[14px] font-semibold text-foreground leading-snug flex-1">{p.question}</h3>
                    {hasVoted && (
                      <span className="flex items-center gap-1 text-[10px] font-semibold text-success bg-success/10 border border-success/20 rounded-full px-2 py-0.5 shrink-0">
                        <CheckCircle2 className="h-2.5 w-2.5" /> Voted
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-[11px] text-muted-foreground">
                    <Users className="h-3 w-3" />
                    <span>{total} vote{total !== 1 ? "s" : ""}</span>
                    <span className="text-border-strong">·</span>
                    <span>{format(new Date(p.created_at), "dd MMM")}</span>
                    {p.is_anonymous && (
                      <>
                        <span className="text-border-strong">·</span>
                        <Badge variant="secondary" className="text-[9px] h-4 px-1.5">Anonymous</Badge>
                      </>
                    )}
                  </div>
                </div>

                {/* Options */}
                <div className="px-5 pb-5 space-y-2.5">
                  {opts.map((opt: string, idx: number) => {
                    const count = allVotes.filter((v: any) => v.option_index === idx).length;
                    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                    const isMyChoice = myVote?.option_index === idx;

                    return hasVoted ? (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex justify-between text-[12px]">
                          <span className={cn("font-medium flex items-center gap-1.5", isMyChoice ? "text-primary" : "text-foreground")}>
                            {isMyChoice && <CheckCircle2 className="h-3 w-3" />}
                            {opt}
                          </span>
                          <span className={cn("font-bold tabular-nums", isMyChoice ? "text-primary" : "text-muted-foreground")}>{pct}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-surface-3 overflow-hidden">
                          <div
                            className={cn("h-full rounded-full transition-all duration-500", isMyChoice ? "bg-primary" : "bg-muted-foreground/30")}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <button
                        key={idx}
                        className={cn(
                          "w-full text-left px-4 py-3 rounded-xl border text-[13px] font-medium",
                          "border-border-subtle bg-surface-2 text-foreground",
                          "hover:border-primary/40 hover:bg-primary/5 hover:text-primary",
                          "active:scale-[0.98] transition-all duration-100",
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
