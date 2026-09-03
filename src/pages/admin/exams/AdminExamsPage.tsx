import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  ClipboardList,
  Search,
  BookOpen,
  Award,
  GraduationCap,
  Calendar,
  Lock,
  CheckCircle2,
  Eye,
  RotateCcw,
  SlidersHorizontal,
  Send,
  Users,
  ShieldCheck,
} from "@/components/icons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type ExamRow = {
  id: string;
  title: string;
  subject: string;
  exam_type: string | null;
  topic: string | null;
  class_id: string | null;
  college_id: string | null;
  exam_date: string;
  max_marks: number;
  min_marks: number;
  status: "DRAFT" | "MARKS_ENTRY" | "LOCKED" | "PUBLISHED";
  is_active: boolean;
  created_at: string;
  created_by: string;
  locked_at: string | null;
  locked_by: string | null;
  unlocked_at: string | null;
  unlocked_by: string | null;
  published_at: string | null;
  published_by: string | null;
  description: string | null;
  classes?: { id: string; name: string; section: string | null } | null;
  creator?: { name: string; email: string } | null;
  locker?: { name: string } | null;
  unlocker?: { name: string } | null;
  publisher?: { name: string } | null;
};

type ExamResultRow = {
  id: string;
  student_user_id: string;
  marks_obtained: number | null;
  is_absent: boolean;
  status: string;
  grade: string | null;
  remarks: string | null;
  student?: {
    name: string;
    student_id: string | null;
    avatar_url: string | null;
  } | null;
};

export default function AdminExamsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [facultyFilter, setFacultyFilter] = useState("ALL");
  const [classFilter, setClassFilter] = useState("ALL");

  const [selectedExamForView, setSelectedExamForView] = useState<ExamRow | null>(null);
  const [examToUnlock, setExamToUnlock] = useState<ExamRow | null>(null);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [examToPublish, setExamToPublish] = useState<ExamRow | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [examToDelete, setExamToDelete] = useState<ExamRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // College ID query
  const { data: collegeId } = useQuery({
    queryKey: ["my_college_id"],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_my_college_id");
      return data as string | null;
    },
    staleTime: 120_000,
  });

  // Fetch all exams for this college with class and creator info
  const { data: exams = [], isLoading } = useQuery<ExamRow[]>({
    queryKey: ["admin", "exams", collegeId],
    enabled: !!collegeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exams")
        .select(`
          *,
          classes(id, name, section),
          creator:profiles!exams_created_by_fkey(name, email),
          locker:profiles!exams_locked_by_fkey(name),
          unlocker:profiles!exams_unlocked_by_fkey(name),
          publisher:profiles!exams_published_by_fkey(name)
        `)
        .eq("college_id", collegeId!)
        .order("exam_date", { ascending: false });

      if (error) {
        console.error("Error fetching admin exams:", error);
        // Fallback without all foreign joins if some keys differ
        const { data: fallbackData } = await supabase
          .from("exams")
          .select("*, classes(id, name, section)")
          .eq("college_id", collegeId!)
          .order("exam_date", { ascending: false });
        return (fallbackData ?? []) as unknown as ExamRow[];
      }
      return (data ?? []) as unknown as ExamRow[];
    },
    staleTime: 20_000,
  });

  // Fetch all classes for filter dropdown
  const { data: classes = [] } = useQuery({
    queryKey: ["admin", "classes", collegeId],
    enabled: !!collegeId,
    queryFn: async () => {
      const { data } = await supabase
        .from("classes")
        .select("id, name, section")
        .eq("college_id", collegeId!)
        .order("name");
      return data ?? [];
    },
    staleTime: 60_000,
  });

  // Extract unique faculty creators for filter dropdown
  const facultyList = useMemo(() => {
    const map = new Map<string, string>();
    for (const exam of exams) {
      if (exam.created_by) {
        const name = exam.creator?.name || "Faculty Member";
        map.set(exam.created_by, name);
      }
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [exams]);

  // Fetch marks for selected exam when viewing results
  const { data: examResults = [], isLoading: loadingResults } = useQuery<ExamResultRow[]>({
    queryKey: ["admin", "exam_results", selectedExamForView?.id],
    enabled: !!selectedExamForView?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exam_results")
        .select(`
          id,
          student_user_id,
          marks_obtained,
          is_absent,
          status,
          grade,
          remarks,
          student:profiles!exam_results_student_user_id_fkey(name, student_id, avatar_url)
        `)
        .eq("exam_id", selectedExamForView!.id);

      if (error) {
        console.error("Error fetching exam results:", error);
        return [];
      }
      return (data ?? []) as unknown as ExamResultRow[];
    },
  });

  // Filtered exams
  const filteredExams = useMemo(() => {
    return exams.filter((exam) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        (exam.exam_type || exam.title || "").toLowerCase().includes(q) ||
        (exam.topic || exam.subject || "").toLowerCase().includes(q) ||
        (exam.classes?.name || "").toLowerCase().includes(q) ||
        (exam.creator?.name || "").toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "MARKS_ENTRY" && (exam.status === "MARKS_ENTRY" || exam.status === "DRAFT")) ||
        exam.status === statusFilter;

      const matchesFaculty = facultyFilter === "ALL" || exam.created_by === facultyFilter;
      const matchesClass = classFilter === "ALL" || exam.class_id === classFilter;

      return matchesSearch && matchesStatus && matchesFaculty && matchesClass;
    });
  }, [exams, searchQuery, statusFilter, facultyFilter, classFilter]);

  // Handle Admin Unlock
  const handleUnlockExam = async () => {
    if (!examToUnlock) return;
    setIsUnlocking(true);
    try {
      const { error } = await supabase.rpc("admin_unlock_exam", {
        p_exam_id: examToUnlock.id,
      });

      if (error) throw error;

      toast.success("Exam unlocked! Faculty can now edit marks again.");
      setExamToUnlock(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "exams"] });
    } catch (err: unknown) {
      console.error("Failed to unlock exam:", err);
      const message = err instanceof Error ? err.message : "Failed to unlock examination";
      toast.error(message);
    } finally {
      setIsUnlocking(false);
    }
  };

  // Handle Admin Publish
  const handlePublishExam = async () => {
    if (!examToPublish) return;
    setIsPublishing(true);
    try {
      const { error } = await supabase.rpc("faculty_publish_exam", {
        p_exam_id: examToPublish.id,
      });

      if (error) throw error;

      toast.success("Exam results published to students!");
      setExamToPublish(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "exams"] });
      queryClient.invalidateQueries({ queryKey: ["student", "results"] });
    } catch (err: unknown) {
      console.error("Failed to publish exam:", err);
      const message = err instanceof Error ? err.message : "Failed to publish examination";
      toast.error(message);
    } finally {
      setIsPublishing(false);
    }
  };

  // Handle Admin Delete Exam
  const handleDeleteExam = async () => {
    if (!examToDelete) return;
    setIsDeleting(true);
    try {
      const { error: rpcError } = await supabase.rpc("delete_exam", {
        p_exam_id: examToDelete.id,
      });

      if (rpcError) {
        const { error } = await supabase
          .from("exams")
          .delete()
          .eq("id", examToDelete.id);

        if (error) throw error;
      }

      toast.success("Examination and associated records deleted");
      if (selectedExamForView?.id === examToDelete.id) {
        setSelectedExamForView(null);
      }
      setExamToDelete(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "exams"] });
      queryClient.invalidateQueries({ queryKey: ["faculty-exams"] });
    } catch (err: unknown) {
      console.error("Failed to delete exam:", err);
      const message = err instanceof Error ? err.message : "Failed to delete examination";
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Exams & Marks
            </h1>
            <Badge variant="secondary" className="text-xs font-semibold">
              Admin Oversight
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1 max-w-xl">
            Centralized monitoring of examinations, faculty submissions, marks locking, unlocking, and published student results.
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-xl bg-surface-1 border border-border/80 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search title, subject, faculty..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="MARKS_ENTRY">Marks Entry (In Progress)</SelectItem>
              <SelectItem value="LOCKED">Locked</SelectItem>
              <SelectItem value="PUBLISHED">Published</SelectItem>
            </SelectContent>
          </Select>

          {/* Faculty Filter */}
          <Select value={facultyFilter} onValueChange={setFacultyFilter}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="All Faculty" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Faculty</SelectItem>
              {facultyList.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Class Filter */}
          <Select value={classFilter} onValueChange={setClassFilter}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="All Classes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Classes</SelectItem>
              {classes.map((cls) => (
                <SelectItem key={cls.id} value={cls.id}>
                  {cls.name} {cls.section ? `(${cls.section})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Examinations Table Area */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : filteredExams.length === 0 ? (
        <Card className="border-dashed border-border/80 bg-surface-1/40 py-16 text-center">
          <CardContent>
            <ClipboardList className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm font-semibold text-foreground">No examinations match filters</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Adjust search keywords or reset filter dropdowns to see all exams.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden shadow-xs bg-card">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold">
                <th className="py-3 px-4">Examination & Topic</th>
                <th className="py-3 px-4">Class</th>
                <th className="py-3 px-4">Faculty Creator</th>
                <th className="py-3 px-4 text-center">Max / Min</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredExams.map((exam) => (
                <tr key={exam.id} className="hover:bg-muted/20 transition-colors">
                  {/* Examination & Topic */}
                  <td className="py-3 px-4">
                    <div>
                      <p className="font-bold text-foreground">
                        {exam.exam_type || exam.title}
                      </p>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                        <BookOpen className="h-3 w-3 text-primary" />
                        {exam.topic || exam.subject}
                      </p>
                    </div>
                  </td>

                  {/* Class */}
                  <td className="py-3 px-4">
                    <span className="font-medium text-foreground">
                      {exam.classes?.name || "—"}
                    </span>
                  </td>

                  {/* Faculty Creator */}
                  <td className="py-3 px-4">
                    <div>
                      <p className="font-semibold text-foreground">
                        {exam.creator?.name || "Faculty Member"}
                      </p>
                      {exam.creator?.email && (
                        <p className="text-[10px] text-muted-foreground">
                          {exam.creator.email}
                        </p>
                      )}
                    </div>
                  </td>

                  {/* Max / Min Marks */}
                  <td className="py-3 px-4 text-center">
                    <span className="font-bold text-foreground">{exam.max_marks}</span>
                    <span className="text-muted-foreground text-[10px] mx-1">/</span>
                    <span className="text-muted-foreground text-[11px] font-medium">{exam.min_marks}</span>
                  </td>

                  {/* Date */}
                  <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                    {format(new Date(exam.exam_date), "dd MMM yyyy")}
                  </td>

                  {/* Status Badge */}
                  <td className="py-3 px-4 text-center whitespace-nowrap">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] uppercase font-bold py-0.5",
                        exam.status === "PUBLISHED" &&
                          "bg-success/15 text-success border-success/30",
                        exam.status === "LOCKED" &&
                          "bg-primary/15 text-primary border-primary/30",
                        (exam.status === "MARKS_ENTRY" || exam.status === "DRAFT") &&
                          "bg-amber-500/15 text-amber-700 border-amber-500/30"
                      )}
                    >
                      {exam.status === "PUBLISHED" && "✓ Published"}
                      {exam.status === "LOCKED" && "🔒 Locked"}
                      {(exam.status === "MARKS_ENTRY" || exam.status === "DRAFT") && "Marks Entry"}
                    </Badge>
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* View Marks Action */}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2 text-xs gap-1"
                        onClick={() => setSelectedExamForView(exam)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Marks
                      </Button>

                      {/* Admin Unlock Action (Requirement 11) */}
                      {exam.status === "LOCKED" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-2.5 text-xs gap-1 border-primary/40 text-primary hover:bg-primary/10"
                          title="Unlock Marks for Faculty Edit"
                          onClick={() => setExamToUnlock(exam)}
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Unlock
                        </Button>
                      )}

                      {/* Admin Publish Action (if locked) */}
                      {exam.status === "LOCKED" && (
                        <Button
                          size="sm"
                          className="h-8 px-2.5 text-xs gap-1 bg-success text-success-foreground hover:bg-success/90"
                          title="Publish Results to Students"
                          onClick={() => setExamToPublish(exam)}
                        >
                          <Send className="h-3.5 w-3.5" />
                          Publish
                        </Button>
                      )}

                      {/* Delete Exam Action */}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-danger hover:bg-danger/10"
                        title="Delete Examination"
                        onClick={() => setExamToDelete(exam)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* View Marks Breakdown Dialog */}
      <Dialog
        open={!!selectedExamForView}
        onOpenChange={(open) => !open && setSelectedExamForView(null)}
      >
        <DialogContent className="sm:max-w-[760px] max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
          <DialogHeader className="p-5 border-b border-border bg-surface-1">
            <div className="flex items-center justify-between gap-3">
              <div>
                <DialogTitle className="text-base font-bold">
                  {selectedExamForView?.exam_type || selectedExamForView?.title} — Marks
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  {selectedExamForView?.topic || selectedExamForView?.subject} •{" "}
                  {selectedExamForView?.classes?.name || "Class"} • Max:{" "}
                  {selectedExamForView?.max_marks} • Passing:{" "}
                  {selectedExamForView?.min_marks}
                </DialogDescription>
              </div>

              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] uppercase font-bold py-0.5",
                  selectedExamForView?.status === "PUBLISHED" &&
                    "bg-success/15 text-success border-success/30",
                  selectedExamForView?.status === "LOCKED" &&
                    "bg-primary/15 text-primary border-primary/30",
                  (selectedExamForView?.status === "MARKS_ENTRY" ||
                    selectedExamForView?.status === "DRAFT") &&
                    "bg-amber-500/15 text-amber-700 border-amber-500/30"
                )}
              >
                {selectedExamForView?.status}
              </Badge>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-5">
            {loadingResults ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : examResults.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-xs">
                No marks recorded for this examination yet.
              </div>
            ) : (
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 font-semibold text-muted-foreground">
                      <th className="py-2 px-3">Student</th>
                      <th className="py-2 px-3 text-center">Absent?</th>
                      <th className="py-2 px-3">Marks</th>
                      <th className="py-2 px-3 text-center">Status</th>
                      <th className="py-2 px-3">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {examResults.map((r) => (
                      <tr key={r.id}>
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6 text-[9px]">
                              <AvatarImage src={r.student?.avatar_url || ""} />
                              <AvatarFallback>
                                {(r.student?.name || "ST").substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-semibold text-foreground">
                              {r.student?.name || "Enrolled Student"}
                            </span>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-center">
                          {r.is_absent ? (
                            <span className="text-[10px] font-bold text-amber-600">YES</span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">No</span>
                          )}
                        </td>
                        <td className="py-2 px-3 font-semibold">
                          {r.is_absent ? (
                            <span className="text-amber-600 font-bold">ABSENT</span>
                          ) : r.marks_obtained !== null ? (
                            <span>{r.marks_obtained}</span>
                          ) : (
                            <span className="text-muted-foreground italic">Pending</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[9px] uppercase font-bold py-0.5",
                              r.status === "PASSED" && "bg-success/15 text-success border-success/30",
                              r.status === "FAILED" && "bg-danger/15 text-danger border-danger/30",
                              r.status === "ABSENT" && "bg-amber-500/15 text-amber-700 border-amber-500/30",
                              r.status === "PENDING" && "bg-muted text-muted-foreground"
                            )}
                          >
                            {r.status}
                          </Badge>
                        </td>
                        <td className="py-2 px-3 text-muted-foreground text-[11px]">
                          {r.remarks || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <DialogFooter className="p-4 border-t border-border bg-surface-1 flex items-center justify-between">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="gap-1.5 text-xs mr-auto"
              onClick={() => {
                setExamToDelete(selectedExamForView);
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete Examination
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSelectedExamForView(null)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Admin Unlock Confirmation Dialog (Requirement 11) */}
      <AlertDialog open={!!examToUnlock} onOpenChange={(open) => !open && setExamToUnlock(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2 text-primary mb-1">
              <RotateCcw className="h-5 w-5 text-primary" />
              <AlertDialogTitle className="text-base">Unlock Examination Marks?</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-xs space-y-2">
              <p>
                Unlocking will allow the faculty (
                <strong>{examToUnlock?.creator?.name || "Faculty"}</strong>) to edit the marks for{" "}
                <strong>{examToUnlock?.exam_type || examToUnlock?.title}</strong> again.
              </p>
              <div className="p-3 bg-muted/60 rounded-lg text-[11px] text-foreground space-y-1">
                <p className="font-semibold text-primary">Audit Log:</p>
                <p>• Exam status will return to MARKS_ENTRY.</p>
                <p>• Your administrator user ID and current timestamp will be recorded.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUnlocking}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUnlockExam}
              disabled={isUnlocking}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isUnlocking ? "Unlocking..." : "Confirm & Unlock"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Admin Publish Confirmation Dialog */}
      <AlertDialog open={!!examToPublish} onOpenChange={(open) => !open && setExamToPublish(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2 text-success mb-1">
              <Send className="h-5 w-5 text-success" />
              <AlertDialogTitle className="text-base">Publish Examination Results?</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-xs space-y-2">
              <p>
                Are you sure you want to publish marks for{" "}
                <strong>{examToPublish?.exam_type || examToPublish?.title}</strong>?
              </p>
              <p className="text-[11px] text-muted-foreground">
                All enrolled students will immediately be notified and can view their results in the Student Portal.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPublishing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePublishExam}
              disabled={isPublishing}
              className="bg-success text-success-foreground hover:bg-success/90"
            >
              {isPublishing ? "Publishing..." : "Publish to Students"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Admin Delete Confirmation Dialog */}
      <AlertDialog open={!!examToDelete} onOpenChange={(open) => !open && setExamToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2 text-danger mb-1">
              <Trash2 className="h-5 w-5 text-danger" />
              <AlertDialogTitle className="text-base text-danger">Delete Examination?</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-xs space-y-2">
              <p>
                Are you sure you want to permanently delete{" "}
                <strong>{examToDelete?.exam_type || examToDelete?.title}</strong> ({examToDelete?.classes?.name || "Target Class"})?
              </p>
              <div className="p-3 bg-danger/10 border border-danger/20 rounded-lg text-[11px] text-danger space-y-1">
                <p className="font-semibold">Irreversible Action:</p>
                <p>• All entered student marks, absent records, and remarks will be permanently erased.</p>
                {examToDelete?.status === "PUBLISHED" && (
                  <p>• This exam was published to students. Deleting it will remove the result from student portals.</p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteExam}
              disabled={isDeleting}
              className="bg-danger text-danger-foreground hover:bg-danger/90"
            >
              {isDeleting ? "Deleting..." : "Delete Examination"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
