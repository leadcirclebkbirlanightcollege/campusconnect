import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import {
  Plus, Trash2, ClipboardList, Search, BookOpen, Award,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { format } from "date-fns";
import { Textarea } from "@/components/ui/textarea";

type Exam = {
  id: string;
  title: string;
  subject: string;
  exam_date: string;
  max_marks: number;
  is_active: boolean;
  created_at: string;
  description: string | null;
};

type ResultEntry = {
  student_user_id: string;
  marks_obtained: number;
  grade: string;
  remarks: string;
};

type ExamForm = {
  title: string;
  subject: string;
  exam_date: string;
  max_marks: string;
  description: string;
};

const EMPTY_FORM: ExamForm = {
  title: "",
  subject: "",
  exam_date: format(new Date(), "yyyy-MM-dd"),
  max_marks: "100",
  description: "",
};

function gradeFromPct(pct: number) {
  if (pct >= 90) return "O";
  if (pct >= 75) return "A+";
  if (pct >= 60) return "A";
  if (pct >= 50) return "B";
  if (pct >= 40) return "C";
  return "F";
}

export default function AdminExamsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ExamForm>(EMPTY_FORM);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [resultsOpen, setResultsOpen] = useState(false);
  const [resultsData, setResultsData] = useState<ResultEntry[]>([]);

  const { data: collegeId } = useQuery({
    queryKey: ["my_college_id"],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_my_college_id");
      return data as string | null;
    },
    staleTime: 120_000,
  });

  const { data: exams = [], isLoading } = useQuery<Exam[]>({
    queryKey: ["admin", "exams"],
    enabled: !!collegeId,
    queryFn: async () => {
      const { data } = await supabase
        .from("exams")
        .select("id,title,subject,exam_date,max_marks,is_active,created_at,description")
        .eq("college_id", collegeId!)
        .order("exam_date", { ascending: false });
      return (data ?? []) as Exam[];
    },
    staleTime: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user || !collegeId) throw new Error("Not authenticated");
      if (!form.title.trim()) throw new Error("Title is required");
      const { error } = await supabase.from("exams").insert({
        college_id: collegeId,
        created_by: user.id,
        title: form.title.trim(),
        subject: form.subject.trim(),
        exam_date: form.exam_date,
        max_marks: parseInt(form.max_marks) || 100,
        description: form.description.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Exam created");
      qc.invalidateQueries({ queryKey: ["admin", "exams"] });
      setOpen(false);
      setForm(EMPTY_FORM);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("exams").update({ is_active: false }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Exam removed"); qc.invalidateQueries({ queryKey: ["admin", "exams"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  // Load students for result entry
  const { data: students = [] } = useQuery({
    queryKey: ["admin", "students_for_results", selectedExam?.id],
    enabled: !!selectedExam && resultsOpen,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id,name,student_id")
        .eq("college_id", collegeId!)
        .eq("is_deleted", false)
        .order("name");
      return data ?? [];
    },
    staleTime: 60_000,
  });

  const openResults = async (exam: Exam) => {
    setSelectedExam(exam);
    setResultsOpen(true);
    // Prefetch existing results
    const { data } = await supabase
      .from("exam_results")
      .select("student_user_id,marks_obtained,grade,remarks")
      .eq("exam_id", exam.id);
    if (data) {
      setResultsData(data.map(r => ({
        student_user_id: r.student_user_id,
        marks_obtained: r.marks_obtained as unknown as number,
        grade: r.grade ?? "",
        remarks: r.remarks ?? "",
      })));
    }
  };

  const getResult = (userId: string) =>
    resultsData.find(r => r.student_user_id === userId) ??
    { student_user_id: userId, marks_obtained: 0, grade: "", remarks: "" };

  const updateResult = (userId: string, marks: number) => {
    const max = selectedExam?.max_marks ?? 100;
    const pct = (marks / max) * 100;
    const grade = gradeFromPct(pct);
    setResultsData(prev => {
      const existing = prev.findIndex(r => r.student_user_id === userId);
      const entry = { student_user_id: userId, marks_obtained: marks, grade, remarks: "" };
      if (existing >= 0) {
        const next = [...prev];
        next[existing] = entry;
        return next;
      }
      return [...prev, entry];
    });
  };

  const saveResultsMutation = useMutation({
    mutationFn: async () => {
      if (!user || !selectedExam) throw new Error("No exam selected");
      const rows = resultsData
        .filter(r => r.marks_obtained > 0 || r.grade)
        .map(r => ({
          exam_id: selectedExam.id,
          student_user_id: r.student_user_id,
          college_id: collegeId!,
          marks_obtained: r.marks_obtained,
          grade: r.grade || gradeFromPct((r.marks_obtained / selectedExam.max_marks) * 100),
          entered_by: user.id,
          remarks: r.remarks || null,
        }));
      if (!rows.length) throw new Error("No results to save");
      const { error } = await supabase.from("exam_results").upsert(rows, { onConflict: "exam_id,student_user_id" });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Results saved"); setResultsOpen(false); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Exams & Results</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Manage exams and publish student results</p>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Create Exam
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : exams.length === 0 ? (
        <Card className="border-dashed border-border/40">
          <CardContent className="py-12 text-center">
            <ClipboardList className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No exams yet</p>
            <Button size="sm" variant="outline" className="mt-3" onClick={() => setOpen(true)}>
              Create first exam
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {exams.map((exam) => (
            <Card key={exam.id} className="border-border/40 hover:border-border/60 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-foreground">{exam.title}</p>
                      <Badge variant={exam.is_active ? "default" : "secondary"} className="text-[10px] h-4">
                        {exam.is_active ? "Active" : "Archived"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <BookOpen className="h-3 w-3" />{exam.subject}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(exam.exam_date), "dd MMM yyyy")}
                      </span>
                      <span className="text-xs text-muted-foreground">Max: {exam.max_marks}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => openResults(exam)}
                    >
                      <Award className="h-3 w-3" /> Results
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteMutation.mutate(exam.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" /> Create Exam
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Title *</Label>
              <Input className="h-9 mt-1 text-sm" value={form.title} onChange={(e) => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Semester I Final Exam" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Subject</Label>
                <Input className="h-9 mt-1 text-sm" value={form.subject} onChange={(e) => setForm(p => ({ ...p, subject: e.target.value }))} placeholder="e.g. Mathematics" />
              </div>
              <div>
                <Label className="text-xs">Max Marks</Label>
                <Input type="number" className="h-9 mt-1 text-sm" value={form.max_marks} onChange={(e) => setForm(p => ({ ...p, max_marks: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Exam Date</Label>
              <Input type="date" className="h-9 mt-1 text-sm" value={form.exam_date} onChange={(e) => setForm(p => ({ ...p, exam_date: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Textarea className="mt-1 text-sm resize-none" rows={2} value={form.description} onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Optional instructions…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Results Entry Dialog */}
      <Dialog open={resultsOpen} onOpenChange={setResultsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Award className="h-4 w-4 text-primary" />
              {selectedExam?.title} — Enter Results
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {students.map((s) => {
              const r = getResult(s.user_id);
              return (
                <div key={s.user_id} className="flex items-center gap-3 rounded-lg border border-border/30 px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{s.name}</p>
                    <p className="text-[10px] text-muted-foreground">{s.student_id ?? "—"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      className="h-8 w-20 text-sm text-center"
                      min={0}
                      max={selectedExam?.max_marks ?? 100}
                      value={r.marks_obtained || ""}
                      onChange={(e) => updateResult(s.user_id, parseFloat(e.target.value) || 0)}
                      placeholder="Marks"
                    />
                    <span className="text-xs text-muted-foreground">/{selectedExam?.max_marks ?? 100}</span>
                    {r.marks_obtained > 0 && (
                      <Badge variant="secondary" className="text-[10px]">{r.grade}</Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResultsOpen(false)}>Cancel</Button>
            <Button onClick={() => saveResultsMutation.mutate()} disabled={saveResultsMutation.isPending}>
              {saveResultsMutation.isPending ? "Saving…" : "Publish Results"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
