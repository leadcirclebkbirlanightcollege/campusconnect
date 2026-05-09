/**
 * StudentPollsList — Phase 5 redesign
 *
 * Community-style poll feed: animated vote bars, "you voted" celebration,
 * compact mobile cards, and a friendlier empty state.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { BarChart2, Users, CheckCircle2, VoteIcon, EyeOff, Sparkles } from "lucide-react";

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
      const { data, error } = await supabase
        .from("poll_votes")
        .select("poll_id, option_index, user_id");
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
      toast.success("Vote recorded! 🎉");
      qc.invalidateQueries({ queryKey: ["student", "poll_votes"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Already voted or error"),
  });

  const userId = meQuery.data?.id;

  if (pollsQuery.isLoading) {
    return (
      <div className="space-y-3 px-4 pt-4 max-w-2xl mx-auto">
        <Skeleton className="h-12 w-full rounded-xl" />
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-44 rounded-2xl" />
        ))}
      </div>
    );
  }

  const polls = pollsQuery.data ?? [];

  return (
    <div className="space-y-4 px-4 pt-4 pb-24 max-w-2xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <div className="h-10 w-10 rounded-xl bg-primary/12 flex items-center justify-center shrink-0"
          style={{ boxShadow: "inset 0 0 0 1px hsl(var(--primary) / 0.25)" }}>
          <BarChart2 className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-[20px] font-bold text-foreground tracking-tight leading-tight">
            Polls & Surveys
          </h1>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            {polls.length} active poll{polls.length !== 1 ? "s" : ""} · your voice matters
          </p>
        </div>
      </motion.div>

      {polls.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-16 text-center rounded-2xl border border-dashed border-border-subtle"
        >
          <div className="h-16 w-16 rounded-2xl bg-primary/8 flex items-center justify-center mb-4">
            <VoteIcon className="h-7 w-7 text-primary/70" />
          </div>
          <h3 className="text-[15px] font-semibold text-foreground mb-1">No polls yet</h3>
          <p className="text-[13px] text-muted-foreground max-w-xs">
            New polls from your college will land here. Stay tuned!
          </p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {polls.map((p: any, idx) => {
            const opts = Array.isArray(p.options) ? (p.options as string[]) : [];
            const allVotes = (votesQuery.data ?? []).filter((v: any) => v.poll_id === p.id);
            const total = allVotes.length;
            const myVote = allVotes.find((v: any) => v.user_id === userId);
            const hasVoted = Boolean(myVote);
            const expired = p.expires_at && new Date(p.expires_at) < new Date();

            return (
              <motion.article
                key={p.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(idx * 0.04, 0.3) }}
                className={cn(
                  "rounded-2xl border bg-surface-1 overflow-hidden transition-all",
                  hasVoted
                    ? "border-primary/25"
                    : "border-border-subtle hover:border-border-strong hover:shadow-sm",
                )}
              >
                {/* Header */}
                <div className="px-4 pt-4 pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-[14.5px] font-semibold text-foreground leading-snug flex-1">
                      {p.question}
                    </h3>
                    {hasVoted && (
                      <motion.span
                        initial={{ scale: 0.6, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="flex items-center gap-1 text-[10px] font-bold text-success bg-success/12 border border-success/25 rounded-full px-2 py-0.5 shrink-0"
                      >
                        <CheckCircle2 className="h-2.5 w-2.5" /> Voted
                      </motion.span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-[11px] text-muted-foreground flex-wrap">
                    <span className="inline-flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {total} vote{total !== 1 ? "s" : ""}
                    </span>
                    <span className="text-border-strong">·</span>
                    <span>{format(new Date(p.created_at), "dd MMM")}</span>
                    {p.is_anonymous && (
                      <>
                        <span className="text-border-strong">·</span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-1.5 py-0.5 text-[9.5px] font-medium">
                          <EyeOff className="h-2.5 w-2.5" /> Anonymous
                        </span>
                      </>
                    )}
                    {expired && (
                      <>
                        <span className="text-border-strong">·</span>
                        <span className="text-destructive font-medium">Closed</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Options */}
                <div className="px-4 pb-4 space-y-2">
                  <AnimatePresence mode="wait">
                    {opts.map((opt: string, oi: number) => {
                      const count = allVotes.filter((v: any) => v.option_index === oi).length;
                      const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                      const isMyChoice = myVote?.option_index === oi;
                      const isWinner = hasVoted && total > 0 && count === Math.max(...opts.map((_, i) => allVotes.filter((v: any) => v.option_index === i).length));

                      if (hasVoted || expired) {
                        return (
                          <motion.div
                            key={oi}
                            initial={{ opacity: 0, x: -6 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: oi * 0.04 }}
                            className="relative overflow-hidden rounded-lg border border-border-subtle bg-surface-2 px-3 py-2.5"
                          >
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.7, ease: "easeOut", delay: 0.1 + oi * 0.05 }}
                              className={cn(
                                "absolute inset-y-0 left-0 rounded-lg",
                                isMyChoice
                                  ? "bg-primary/15"
                                  : isWinner
                                  ? "bg-success/12"
                                  : "bg-muted-foreground/8",
                              )}
                            />
                            <div className="relative flex items-center justify-between gap-2">
                              <span
                                className={cn(
                                  "text-[13px] font-medium flex items-center gap-1.5 truncate",
                                  isMyChoice ? "text-primary" : "text-foreground",
                                )}
                              >
                                {isMyChoice && <CheckCircle2 className="h-3 w-3 shrink-0" />}
                                {opt}
                              </span>
                              <span
                                className={cn(
                                  "text-[12px] font-bold tabular-nums shrink-0",
                                  isMyChoice
                                    ? "text-primary"
                                    : isWinner
                                    ? "text-success"
                                    : "text-muted-foreground",
                                )}
                              >
                                {pct}%
                              </span>
                            </div>
                          </motion.div>
                        );
                      }
                      return (
                        <motion.button
                          key={oi}
                          whileTap={{ scale: 0.98 }}
                          className={cn(
                            "w-full text-left px-3.5 py-2.5 rounded-lg border text-[13px] font-medium",
                            "border-border-subtle bg-surface-2 text-foreground",
                            "hover:border-primary/40 hover:bg-primary/6 hover:text-primary",
                            "active:scale-[0.98] transition-all duration-150",
                            "disabled:opacity-50 disabled:cursor-not-allowed",
                          )}
                          onClick={() => voteMutation.mutate({ pollId: p.id, optionIndex: oi })}
                          disabled={voteMutation.isPending}
                        >
                          {opt}
                        </motion.button>
                      );
                    })}
                  </AnimatePresence>

                  {hasVoted && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4 }}
                      className="flex items-center gap-1 text-[10.5px] text-muted-foreground/80 pt-1"
                    >
                      <Sparkles className="h-2.5 w-2.5 text-primary" />
                      Thanks for voting — results update live.
                    </motion.p>
                  )}
                </div>
              </motion.article>
            );
          })}
        </div>
      )}
    </div>
  );
}
