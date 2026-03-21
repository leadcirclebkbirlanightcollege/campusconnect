import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageContainer, PageHeader } from "@/layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { FileText, Calendar, Clock, CheckCircle, AlertCircle, Upload, ChevronRight, Star } from "lucide-react";
import { format, isPast, isToday } from "date-fns";
import { cn } from "@/lib/utils";

export default function StudentAssignments() {
  const [selected, setSelected] = useState<any | null>(null);
  const [submitText, setSubmitText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const qc = useQueryClient();

  const { data: assignments, isLoading } = useQuery({
    queryKey: ["student", "assignments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assignments" as any)
        .select("*")
        .eq("is_active", true)
        .order("due_date", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30_000,
  });

  const { data: mySubmissions } = useQuery({
    queryKey: ["student", "my-submissions"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return [];
      const { data } = await supabase
        .from("submissions" as any)
        .select("assignment_id, status, marks_obtained, feedback, submitted_at")
        .eq("student_user_id", session.user.id);
      return data ?? [];
    },
    staleTime: 30_000,
  });

  const submissionMap: Record<string, any> = {};
  (mySubmissions ?? []).forEach((s: any) => { submissionMap[s.assignment_id] = s; });

  const handleSubmit = async () => {
    if (!selected || !submitText.trim()) return;
    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const { data: role } = await supabase
        .from("user_roles").select("college_id").eq("user_id", session.user.id).maybeSingle();
      const { error } = await supabase.from("submissions" as any).upsert({
        assignment_id: selected.id,
        student_user_id: session.user.id,
        college_id: role?.college_id,
        content: submitText.trim(),
        status: "submitted",
        submitted_at: new Date().toISOString(),
      }, { onConflict: "assignment_id,student_user_id" });
      if (error) throw error;
      toast.success("Assignment submitted!");
      qc.invalidateQueries({ queryKey: ["student", "my-submissions"] });
      setSelected(null); setSubmitText("");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getDueBadge = (dueDate: string, submission: any) => {
    if (submission?.status === "graded") return { label: "Graded", cls: "bg-primary/10 text-primary border-primary/20" };
    if (submission?.status === "submitted") return { label: "Submitted", cls: "bg-success/10 text-success border-success/20" };
    const due = new Date(dueDate);
    if (isPast(due) && !isToday(due)) return { label: "Overdue", cls: "bg-danger/10 text-danger border-danger/20" };
    if (isToday(due)) return { label: "Due Today", cls: "bg-warning/10 text-warning border-warning/20" };
    return { label: "Pending", cls: "bg-muted text-muted-foreground border-border" };
  };

  return (
    <PageContainer>
      <PageHeader title="Assignments" subtitle="View and submit your assignments" />

      {isLoading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
      ) : (assignments?.length ?? 0) === 0 ? (
        <div className="rounded-xl border border-border-subtle bg-surface-1 py-16 text-center">
          <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-sm text-muted-foreground">No assignments available</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(assignments ?? []).map((a: any) => {
            const sub = submissionMap[a.id];
            const badge = getDueBadge(a.due_date, sub);
            return (
              <button key={a.id} onClick={() => setSelected(a)}
                className="w-full text-left rounded-xl border border-border-subtle bg-surface-1 p-4 hover:border-primary/30 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{a.title}</p>
                    {a.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{a.description}</p>}
                  </div>
                  <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium shrink-0", badge.cls)}>
                    {badge.label}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    Due {format(new Date(a.due_date), "MMM dd, yyyy")}
                  </span>
                  <span className="text-xs text-muted-foreground">Max {a.max_marks} marks</span>
                  {sub?.marks_obtained != null && (
                    <span className="flex items-center gap-1 text-xs text-primary font-semibold">
                      <Star className="h-3 w-3" /> {sub.marks_obtained}/{a.max_marks}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={v => { if (!v) { setSelected(null); setSubmitText(""); } }}>
        <DialogContent className="sm:max-w-md">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base">{selected.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {selected.description && (
                  <p className="text-sm text-muted-foreground">{selected.description}</p>
                )}
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Due {format(new Date(selected.due_date), "MMM dd, yyyy")}</span>
                  <span>Max {selected.max_marks} marks</span>
                </div>

                {submissionMap[selected.id] ? (
                  <div className="rounded-lg bg-surface-2 border border-border-subtle p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-success" />
                      <p className="text-sm font-medium text-foreground">
                        {submissionMap[selected.id].status === "graded" ? "Graded" : "Submitted"}
                      </p>
                    </div>
                    {submissionMap[selected.id].marks_obtained != null && (
                      <p className="text-sm text-foreground font-semibold">
                        Score: {submissionMap[selected.id].marks_obtained} / {selected.max_marks}
                      </p>
                    )}
                    {submissionMap[selected.id].feedback && (
                      <p className="text-xs text-muted-foreground">{submissionMap[selected.id].feedback}</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Textarea
                      placeholder="Type your answer or description..."
                      rows={5}
                      value={submitText}
                      onChange={e => setSubmitText(e.target.value)}
                    />
                    <Button className="w-full gap-2" onClick={handleSubmit} disabled={submitting || !submitText.trim()}>
                      <Upload className="h-4 w-4" />
                      {submitting ? "Submitting…" : "Submit Assignment"}
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
