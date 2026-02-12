import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, BarChart3, Trash2, X } from "lucide-react";
import { format } from "date-fns";

export default function AdminPollsTab() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [isAnonymous, setIsAnonymous] = useState(false);

  const pollsQuery = useQuery({
    queryKey: ["admin", "polls"],
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
    queryKey: ["admin", "poll_votes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("poll_votes").select("poll_id, option_index");
      if (error) throw error;
      return data ?? [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const validOptions = options.filter((o) => o.trim());
      if (validOptions.length < 2) throw new Error("At least 2 options required");
      const { error } = await supabase.from("polls").insert({
        question: question.trim(),
        options: validOptions as any,
        is_anonymous: isAnonymous,
        created_by: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Poll created");
      setOpen(false);
      setQuestion("");
      setOptions(["", ""]);
      setIsAnonymous(false);
      qc.invalidateQueries({ queryKey: ["admin", "polls"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("polls").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["admin", "polls"] });
    },
  });

  const getVoteCounts = (pollId: string, optionCount: number) => {
    const votes = (votesQuery.data ?? []).filter((v: any) => v.poll_id === pollId);
    const counts = Array(optionCount).fill(0);
    votes.forEach((v: any) => { if (v.option_index < optionCount) counts[v.option_index]++; });
    return { counts, total: votes.length };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" /> Polls
          </h2>
          <p className="text-sm text-muted-foreground">Create and manage student polls</p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2"><Plus className="h-4 w-4" /> New Poll</Button>
      </div>

      <div className="space-y-4">
        {pollsQuery.data?.length === 0 && (
          <Card><CardContent className="py-8 text-center text-muted-foreground">No polls yet.</CardContent></Card>
        )}
        {pollsQuery.data?.map((p: any) => {
          const opts = Array.isArray(p.options) ? p.options as string[] : [];
          const { counts, total } = getVoteCounts(p.id, opts.length);
          return (
            <Card key={p.id} className="border-border/50">
              <CardContent className="py-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h3 className="font-medium text-foreground">{p.question}</h3>
                    <div className="flex gap-2">
                      {p.is_anonymous && <Badge variant="secondary" className="text-[10px]">Anonymous</Badge>}
                      <span className="text-xs text-muted-foreground">{total} votes · {format(new Date(p.created_at), "PP")}</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(p.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <div className="space-y-2">
                  {opts.map((opt: string, i: number) => (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{opt}</span>
                        <span className="text-xs font-medium">{counts[i]} ({total > 0 ? Math.round((counts[i] / total) * 100) : 0}%)</span>
                      </div>
                      <Progress value={total > 0 ? (counts[i] / total) * 100 : 0} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Poll</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Question</Label><Input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ask something..." /></div>
            <div className="space-y-2">
              <Label>Options</Label>
              {options.map((opt, i) => (
                <div key={i} className="flex gap-2">
                  <Input value={opt} onChange={(e) => { const n = [...options]; n[i] = e.target.value; setOptions(n); }} placeholder={`Option ${i + 1}`} />
                  {options.length > 2 && (
                    <Button variant="ghost" size="icon" onClick={() => setOptions(options.filter((_, j) => j !== i))}><X className="h-4 w-4" /></Button>
                  )}
                </div>
              ))}
              {options.length < 6 && (
                <Button variant="outline" size="sm" onClick={() => setOptions([...options, ""])}>Add Option</Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={isAnonymous} onCheckedChange={setIsAnonymous} />
              <Label>Anonymous voting</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate()} disabled={!question.trim() || createMutation.isPending}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
