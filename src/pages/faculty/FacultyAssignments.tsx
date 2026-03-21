import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";
import { Plus, FileText, Calendar, Users, Paperclip, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const schema = z.object({
  title: z.string().min(1, "Title required"),
  description: z.string().optional(),
  due_date: z.string().min(1, "Due date required"),
  max_marks: z.coerce.number().min(1).max(1000),
});
type FormData = z.infer<typeof schema>;

export default function FacultyAssignments() {
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data: assignments, isLoading } = useQuery({
    queryKey: ["faculty", "assignments"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return [];
      const { data, error } = await supabase
        .from("assignments" as any)
        .select("*")
        .eq("created_by", session.user.id)
        .order("due_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30_000,
  });

  const { data: submissions } = useQuery({
    queryKey: ["faculty", "submissions", selectedId],
    enabled: !!selectedId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("submissions" as any)
        .select("*, profiles!student_user_id(name, student_id)")
        .eq("assignment_id", selectedId!);
      if (error) throw error;
      return data ?? [];
    },
  });

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { title: "", description: "", due_date: "", max_marks: 100 },
  });

  const createMutation = useMutation({
    mutationFn: async (values: FormData) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const { data: role } = await supabase
        .from("user_roles").select("college_id").eq("user_id", session.user.id).maybeSingle();
      const { error } = await supabase.from("assignments" as any).insert({
        ...values, created_by: session.user.id, college_id: role?.college_id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Assignment created");
      qc.invalidateQueries({ queryKey: ["faculty", "assignments"] });
      setOpen(false); form.reset();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const gradeMutation = useMutation({
    mutationFn: async ({ id, marks, feedback }: { id: string; marks: number; feedback: string }) => {
      const { error } = await supabase
        .from("submissions" as any)
        .update({ marks_obtained: marks, feedback, status: "graded", reviewed_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Graded");
      qc.invalidateQueries({ queryKey: ["faculty", "submissions", selectedId] });
    },
  });

  const selectedAssignment = assignments?.find((a: any) => a.id === selectedId);

  if (selectedId && selectedAssignment) {
    return (
      <div className="p-6 space-y-4 max-w-3xl">
        <div className="flex items-center gap-2">
          <button onClick={() => setSelectedId(null)} className="text-xs text-muted-foreground hover:text-foreground">
            ← Assignments
          </button>
          <ChevronRight className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs text-foreground font-medium">{(selectedAssignment as any).title}</span>
        </div>
        <div className="rounded-xl border border-border-subtle bg-surface-1 p-4">
          <h2 className="font-bold text-foreground">{(selectedAssignment as any).title}</h2>
          <p className="text-xs text-muted-foreground mt-1">Due: {format(new Date((selectedAssignment as any).due_date), "MMM dd, yyyy")} · Max: {(selectedAssignment as any).max_marks} marks</p>
          {(selectedAssignment as any).description && (
            <p className="text-sm text-muted-foreground mt-2">{(selectedAssignment as any).description}</p>
          )}
        </div>
        <p className="text-sm font-semibold text-foreground">Submissions ({submissions?.length ?? 0})</p>
        {(submissions?.length ?? 0) === 0 ? (
          <div className="rounded-xl border border-border-subtle bg-surface-1 py-10 text-center text-sm text-muted-foreground">
            No submissions yet
          </div>
        ) : (
          <div className="space-y-2">
            {(submissions ?? []).map((s: any) => (
              <div key={s.id} className="rounded-xl border border-border-subtle bg-surface-1 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">{s.profiles?.name ?? "Unknown"}</p>
                    <p className="text-xs text-muted-foreground">{s.profiles?.student_id ?? "—"}</p>
                  </div>
                  <span className={cn("text-xs px-2 py-1 rounded-full font-medium", s.status === "graded" ? "bg-success/10 text-success" : "bg-warning/10 text-warning")}>
                    {s.status}
                  </span>
                </div>
                {s.content && <p className="text-sm text-muted-foreground">{s.content}</p>}
                {s.attachment_url && (
                  <a href={s.attachment_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary flex items-center gap-1">
                    <Paperclip className="h-3 w-3" /> {s.attachment_name ?? "Attachment"}
                  </a>
                )}
                {s.status !== "graded" && (
                  <div className="flex gap-2">
                    <Input type="number" placeholder="Marks" className="h-8 text-xs w-24"
                      onBlur={e => {
                        const marks = parseInt(e.target.value);
                        if (!isNaN(marks)) gradeMutation.mutate({ id: s.id, marks, feedback: "" });
                      }}
                    />
                    <span className="text-xs text-muted-foreground self-center">/ {(selectedAssignment as any).max_marks}</span>
                  </div>
                )}
                {s.status === "graded" && (
                  <p className="text-xs font-semibold text-success">Marks: {s.marks_obtained} / {(selectedAssignment as any).max_marks}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Assignments</h1>
          <p className="text-sm text-muted-foreground">Create and grade student assignments</p>
        </div>
        <Button size="sm" className="gap-2" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> New Assignment
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : (assignments?.length ?? 0) === 0 ? (
        <div className="rounded-xl border border-border-subtle bg-surface-1 py-16 text-center">
          <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-sm text-muted-foreground">No assignments yet. Create your first one!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {(assignments ?? []).map((a: any) => (
            <button key={a.id} onClick={() => setSelectedId(a.id)}
              className="w-full text-left rounded-xl border border-border-subtle bg-surface-1 p-4 hover:border-primary/30 hover:bg-surface-2 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{a.title}</p>
                  {a.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{a.description}</p>}
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 ml-2 mt-0.5" />
              </div>
              <div className="flex items-center gap-3 mt-2">
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  Due {format(new Date(a.due_date), "MMM dd, yyyy")}
                </span>
                <span className="text-xs text-muted-foreground">Max {a.max_marks} marks</span>
              </div>
            </button>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Assignment</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(v => createMutation.mutate(v))} className="space-y-4">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl><Input placeholder="Assignment title" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl><Textarea placeholder="Optional details..." rows={3} {...field} /></FormControl>
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="due_date" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="max_marks" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Marks</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => { setOpen(false); form.reset(); }}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Creating…" : "Create"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
