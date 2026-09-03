import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { format } from "date-fns";
import { toast } from "sonner";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Lock,
  Search,
  Save,
  CheckCircle,
  AlertCircle,
  CheckCircle2,
  Users,
  Award,
  BookOpen,
  Calendar,
  Eye,
  Send,
  ShieldAlert,
  Trash2,
} from "@/components/icons";
import { cn } from "@/lib/utils";
import type { Exam, StudentRowItem, ResultStatus } from "./types";

interface ExamMarksEntryModalProps {
  exam: Exam | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExamUpdated?: (updatedExam: Exam) => void;
  onExamDeleted?: (deletedExamId: string) => void;
}

export function ExamMarksEntryModal({
  exam,
  open,
  onOpenChange,
  onExamUpdated,
  onExamDeleted,
}: ExamMarksEntryModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [studentRows, setStudentRows] = useState<StudentRowItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLocking, setIsLocking] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [showLockConfirm, setShowLockConfirm] = useState(false);
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isReadOnly = exam?.status === "LOCKED" || exam?.status === "PUBLISHED";

  // Fetch enrolled students for this exam's class
  const { data: rawStudents = [], isLoading: loadingStudents } = useQuery({
    queryKey: ["exam-class-students", exam?.class_id, exam?.college_id],
    enabled: !!exam?.class_id && open,
    queryFn: async () => {
      // Find profiles where class_id matches exam.class_id
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id,name,student_id,avatar_url,class_id,department")
        .eq("class_id", exam!.class_id!)
        .order("name", { ascending: true });

      if (error) {
        console.error("Error fetching class students:", error);
        return [];
      }
      return data ?? [];
    },
  });

  // Fetch existing results for this exam
  const { data: existingResults = [], isLoading: loadingResults } = useQuery({
    queryKey: ["exam-results", exam?.id],
    enabled: !!exam?.id && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exam_results")
        .select("id,student_user_id,marks_obtained,is_absent,status,grade,remarks")
        .eq("exam_id", exam!.id);

      if (error) {
        console.error("Error fetching existing exam results:", error);
        return [];
      }
      return data ?? [];
    },
  });

  // Initialize and merge student rows
  useEffect(() => {
    if (!exam || loadingStudents || loadingResults) return;

    const resultsMap = new Map<string, typeof existingResults[0]>();
    for (const res of existingResults) {
      resultsMap.set(res.student_user_id, res);
    }

    const rows: StudentRowItem[] = rawStudents.map((s) => {
      const existing = resultsMap.get(s.user_id);
      if (existing) {
        return {
          student_user_id: s.user_id,
          name: s.name || "Unnamed Student",
          student_id: s.student_id || null,
          avatar_url: s.avatar_url || null,
          marks_obtained: existing.is_absent
            ? ""
            : existing.marks_obtained !== null
            ? existing.marks_obtained
            : "",
          is_absent: existing.is_absent ?? false,
          status: (existing.status as ResultStatus) || "PENDING",
          grade: existing.grade || null,
          remarks: existing.remarks || "",
          isDirty: false,
        };
      }

      return {
        student_user_id: s.user_id,
        name: s.name || "Unnamed Student",
        student_id: s.student_id || null,
        avatar_url: s.avatar_url || null,
        marks_obtained: "",
        is_absent: false,
        status: "PENDING",
        grade: null,
        remarks: "",
        isDirty: false,
      };
    });

    setStudentRows(rows);
  }, [exam, rawStudents, existingResults, loadingStudents, loadingResults]);

  // Compute status on the fly based on exam max and min marks
  const computeStatus = (marks: number | null | "", isAbsent: boolean): ResultStatus => {
    if (isAbsent) return "ABSENT";
    if (marks === "" || marks === null || isNaN(Number(marks))) return "PENDING";
    const num = Number(marks);
    if (!exam) return "PENDING";
    return num >= exam.min_marks ? "PASSED" : "FAILED";
  };

  // Handle Marks change
  const handleMarksChange = (studentUserId: string, value: string) => {
    if (isReadOnly) return;
    setStudentRows((prev) =>
      prev.map((row) => {
        if (row.student_user_id !== studentUserId) return row;
        const marks = value === "" ? "" : Number(value);
        const status = computeStatus(marks, row.is_absent);
        return {
          ...row,
          marks_obtained: marks,
          status,
          isDirty: true,
        };
      })
    );
  };

  // Handle Absent Toggle
  const handleAbsentToggle = (studentUserId: string, isAbsent: boolean) => {
    if (isReadOnly) return;
    setStudentRows((prev) =>
      prev.map((row) => {
        if (row.student_user_id !== studentUserId) return row;
        const marks = isAbsent ? "" : row.marks_obtained;
        const status = computeStatus(marks, isAbsent);
        return {
          ...row,
          is_absent: isAbsent,
          marks_obtained: isAbsent ? "" : row.marks_obtained,
          status,
          isDirty: true,
        };
      })
    );
  };

  // Handle Remarks Change
  const handleRemarksChange = (studentUserId: string, value: string) => {
    if (isReadOnly) return;
    setStudentRows((prev) =>
      prev.map((row) =>
        row.student_user_id === studentUserId
          ? { ...row, remarks: value, isDirty: true }
          : row
      )
    );
  };

  // Filtered students for search
  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return studentRows;
    const q = searchQuery.toLowerCase();
    return studentRows.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.student_id && s.student_id.toLowerCase().includes(q))
    );
  }, [studentRows, searchQuery]);

  // Real-time completion statistics
  const stats = useMemo(() => {
    const total = studentRows.length;
    const absentCount = studentRows.filter((r) => r.is_absent).length;
    const enteredCount = studentRows.filter(
      (r) => !r.is_absent && r.marks_obtained !== "" && r.marks_obtained !== null
    ).length;
    const evaluatedTotal = enteredCount + absentCount;
    const pendingCount = total - evaluatedTotal;
    const passedCount = studentRows.filter((r) => r.status === "PASSED").length;
    const failedCount = studentRows.filter((r) => r.status === "FAILED").length;
    const pct = total > 0 ? Math.round((evaluatedTotal / total) * 100) : 0;

    return {
      total,
      enteredCount,
      absentCount,
      pendingCount,
      passedCount,
      failedCount,
      evaluatedTotal,
      pct,
    };
  }, [studentRows]);

  // Save draft marks
  const handleSaveMarks = async () => {
    if (!exam) return;
    if (isReadOnly) {
      toast.error("Cannot edit marks: exam is locked or published");
      return;
    }

    // Validate any out-of-range marks
    for (const row of studentRows) {
      if (!row.is_absent && row.marks_obtained !== "" && row.marks_obtained !== null) {
        const num = Number(row.marks_obtained);
        if (num < 0) {
          toast.error(`Marks cannot be negative for ${row.name}`);
          return;
        }
        if (num > exam.max_marks) {
          toast.error(`Marks for ${row.name} (${num}) exceed maximum marks (${exam.max_marks})`);
          return;
        }
      }
    }

    setIsSaving(true);
    try {
      const payload = studentRows.map((r) => ({
        student_user_id: r.student_user_id,
        marks_obtained:
          !r.is_absent && r.marks_obtained !== "" && r.marks_obtained !== null
            ? Number(r.marks_obtained)
            : null,
        is_absent: r.is_absent,
        remarks: r.remarks.trim() || null,
      }));

      const { data, error } = await supabase.rpc("faculty_save_exam_marks", {
        p_exam_id: exam.id,
        p_results: payload,
      });

      if (error) throw error;

      toast.success("Marks saved successfully as draft!");
      setStudentRows((prev) => prev.map((r) => ({ ...r, isDirty: false })));
      queryClient.invalidateQueries({ queryKey: ["exam-results", exam.id] });
      queryClient.invalidateQueries({ queryKey: ["faculty-exams"] });
    } catch (err: unknown) {
      console.error("Failed to save marks:", err);
      const message = err instanceof Error ? err.message : "Failed to save marks";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  // Lock Marks
  const handleLockMarks = async () => {
    if (!exam) return;
    setIsLocking(true);
    try {
      // First save current marks
      await handleSaveMarks();

      const { error } = await supabase.rpc("faculty_lock_exam", {
        p_exam_id: exam.id,
      });

      if (error) throw error;

      toast.success("Marks locked successfully! Faculty editing is now disabled.");
      setShowLockConfirm(false);

      const updated: Exam = {
        ...exam,
        status: "LOCKED",
        locked_at: new Date().toISOString(),
        locked_by: user?.id || null,
      };

      if (onExamUpdated) onExamUpdated(updated);
      queryClient.invalidateQueries({ queryKey: ["faculty-exams"] });
      queryClient.invalidateQueries({ queryKey: ["admin-exams"] });
    } catch (err: unknown) {
      console.error("Failed to lock exam:", err);
      const message = err instanceof Error ? err.message : "Failed to lock exam";
      toast.error(message);
    } finally {
      setIsLocking(false);
    }
  };

  // Publish Results
  const handlePublishResults = async () => {
    if (!exam) return;
    setIsPublishing(true);
    try {
      const { error } = await supabase.rpc("faculty_publish_exam", {
        p_exam_id: exam.id,
      });

      if (error) throw error;

      toast.success("Results published! Enrolled students can now view their marks.");
      setShowPublishConfirm(false);

      const updated: Exam = {
        ...exam,
        status: "PUBLISHED",
        published_at: new Date().toISOString(),
        published_by: user?.id || null,
      };

      if (onExamUpdated) onExamUpdated(updated);
      queryClient.invalidateQueries({ queryKey: ["faculty-exams"] });
      queryClient.invalidateQueries({ queryKey: ["admin-exams"] });
      queryClient.invalidateQueries({ queryKey: ["student", "results"] });
    } catch (err: unknown) {
      console.error("Failed to publish exam:", err);
      const message = err instanceof Error ? err.message : "Failed to publish exam";
      toast.error(message);
    } finally {
      setIsPublishing(false);
    }
  };

  // Handle Delete Exam
  const handleDeleteExam = async () => {
    if (!exam) return;
    setIsDeleting(true);
    try {
      const { error: rpcError } = await supabase.rpc("delete_exam", {
        p_exam_id: exam.id,
      });

      if (rpcError) {
        const { error } = await supabase
          .from("exams")
          .delete()
          .eq("id", exam.id);

        if (error) throw error;
      }

      toast.success("Examination removed successfully");
      setShowDeleteConfirm(false);
      onOpenChange(false);
      if (onExamDeleted) onExamDeleted(exam.id);
      queryClient.invalidateQueries({ queryKey: ["faculty-exams"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "exams"] });
      queryClient.invalidateQueries({ queryKey: ["student", "results"] });
    } catch (err: unknown) {
      console.error("Failed to delete exam:", err);
      const message = err instanceof Error ? err.message : "Failed to delete examination";
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!exam) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[940px] max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden">
          {/* Header */}
          <DialogHeader className="p-5 border-b border-border/70 bg-surface-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <DialogTitle className="text-lg font-bold tracking-tight">
                    {exam.exam_type || exam.title}
                  </DialogTitle>
                  <Badge
                    variant="outline"
                    className={
                      exam.status === "PUBLISHED"
                        ? "bg-success/15 text-success border-success/30 font-semibold"
                        : exam.status === "LOCKED"
                        ? "bg-primary/15 text-primary border-primary/30 font-semibold"
                        : "bg-warning/15 text-warning border-warning/30 font-semibold"
                    }
                  >
                    {exam.status === "PUBLISHED" && "✓ PUBLISHED"}
                    {exam.status === "LOCKED" && "🔒 LOCKED"}
                    {exam.status === "MARKS_ENTRY" && "MARKS ENTRY"}
                    {exam.status === "DRAFT" && "DRAFT"}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1 font-medium text-foreground">
                    <BookOpen className="h-3.5 w-3.5 text-primary" />
                    {exam.topic || exam.subject}
                  </span>
                  <span>•</span>
                  <span>
                    Class: <strong className="text-foreground">{exam.classes?.name || "Target Class"}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Max: <strong className="text-foreground">{exam.max_marks}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Passing: <strong className="text-foreground">{exam.min_marks}</strong>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    {format(new Date(exam.exam_date), "dd MMM yyyy")}
                  </span>
                </div>
              </div>

              {/* Top Quick Status / Action info */}
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <div className="text-right">
                  <div className="text-xs font-semibold">
                    {stats.evaluatedTotal} of {stats.total} Completed
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {stats.absentCount} Absent • {stats.pendingCount} Pending
                  </div>
                </div>
                <div className="w-10 h-10 rounded-full bg-surface-2 border border-border flex items-center justify-center font-bold text-xs">
                  {stats.pct}%
                </div>
              </div>
            </div>

            {/* Read-only Alert Banners */}
            {exam.status === "LOCKED" && (
              <div className="mt-3 p-2.5 rounded-lg bg-primary/10 border border-primary/20 flex items-start gap-2.5 text-xs text-primary">
                <Lock className="h-4 w-4 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold">Marks are currently LOCKED</p>
                  <p className="text-[11px] opacity-90">
                    Locked {exam.locked_at ? `on ${format(new Date(exam.locked_at), "dd MMM yyyy, hh:mm a")}` : ""}.
                    Marks cannot be edited by faculty. Ready to be published to students or unlocked by College Admin.
                  </p>
                </div>
              </div>
            )}

            {exam.status === "PUBLISHED" && (
              <div className="mt-3 p-2.5 rounded-lg bg-success/10 border border-success/20 flex items-start gap-2.5 text-xs text-success">
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold">Results are PUBLISHED to Students</p>
                  <p className="text-[11px] opacity-90">
                    Published {exam.published_at ? `on ${format(new Date(exam.published_at), "dd MMM yyyy, hh:mm a")}` : ""}.
                    All enrolled students have received their results in their Student Portal.
                  </p>
                </div>
              </div>
            )}
          </DialogHeader>

          {/* Progress Bar & Filter Bar */}
          <div className="px-5 py-3 border-b border-border bg-surface-2/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search student by name or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs bg-background"
              />
            </div>

            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-success"></span>
                <span>Passed: <strong>{stats.passedCount}</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-danger"></span>
                <span>Failed: <strong>{stats.failedCount}</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <span>Absent: <strong>{stats.absentCount}</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground"></span>
                <span>Pending: <strong>{stats.pendingCount}</strong></span>
              </div>
            </div>
          </div>

          {/* Students Table Area */}
          <div className="flex-1 overflow-y-auto p-5">
            {loadingStudents || loadingResults ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-lg" />
                ))}
              </div>
            ) : filteredRows.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <Users className="h-10 w-10 mx-auto opacity-30 mb-2" />
                <p className="text-sm font-semibold">No students found</p>
                <p className="text-xs opacity-75">
                  {searchQuery
                    ? "No students match your search criteria"
                    : "No students are enrolled in this class yet"}
                </p>
              </div>
            ) : (
              <div className="border border-border rounded-xl overflow-hidden shadow-xs bg-card">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold">
                      <th className="py-2.5 px-3 w-12 text-center">Sr.</th>
                      <th className="py-2.5 px-3">Student Name</th>
                      <th className="py-2.5 px-3 w-28 text-center">Absent?</th>
                      <th className="py-2.5 px-3 w-32">
                        Marks <span className="font-normal text-muted-foreground">(/ {exam.max_marks})</span>
                      </th>
                      <th className="py-2.5 px-3 w-24 text-center">Status</th>
                      <th className="py-2.5 px-3">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredRows.map((row, index) => {
                      const isOverMax =
                        !row.is_absent &&
                        row.marks_obtained !== "" &&
                        row.marks_obtained !== null &&
                        Number(row.marks_obtained) > exam.max_marks;
                      const isNegative =
                        !row.is_absent &&
                        row.marks_obtained !== "" &&
                        row.marks_obtained !== null &&
                        Number(row.marks_obtained) < 0;

                      return (
                        <tr
                          key={row.student_user_id}
                          className={cn(
                            "hover:bg-muted/20 transition-colors",
                            row.is_absent && "bg-amber-500/5",
                            (isOverMax || isNegative) && "bg-danger/10"
                          )}
                        >
                          {/* Sr. No */}
                          <td className="py-2.5 px-3 text-center text-muted-foreground font-medium">
                            {index + 1}
                          </td>

                          {/* Student Info */}
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2.5">
                              <Avatar className="h-7 w-7 text-[10px]">
                                <AvatarImage src={row.avatar_url || ""} />
                                <AvatarFallback className="bg-primary/10 text-primary font-bold">
                                  {row.name.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-semibold text-foreground leading-tight">
                                  {row.name}
                                </p>
                                {row.student_id && (
                                  <p className="text-[10px] text-muted-foreground font-mono">
                                    {row.student_id}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Absent Toggle */}
                          <td className="py-2.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <Switch
                                checked={row.is_absent}
                                onCheckedChange={(checked) =>
                                  handleAbsentToggle(row.student_user_id, checked)
                                }
                                disabled={isReadOnly}
                              />
                              <span
                                className={cn(
                                  "text-[10px] font-semibold",
                                  row.is_absent ? "text-amber-600" : "text-muted-foreground"
                                )}
                              >
                                {row.is_absent ? "AB" : ""}
                              </span>
                            </div>
                          </td>

                          {/* Marks Input */}
                          <td className="py-2.5 px-3">
                            {row.is_absent ? (
                              <span className="text-[11px] font-bold text-amber-600 px-2 py-1 rounded bg-amber-500/10 border border-amber-500/20 inline-block w-full text-center">
                                ABSENT
                              </span>
                            ) : (
                              <div className="relative">
                                <Input
                                  type="number"
                                  min="0"
                                  max={exam.max_marks}
                                  step="any"
                                  placeholder="Marks"
                                  value={row.marks_obtained}
                                  onChange={(e) =>
                                    handleMarksChange(row.student_user_id, e.target.value)
                                  }
                                  disabled={isReadOnly}
                                  className={cn(
                                    "h-8 text-xs font-semibold",
                                    (isOverMax || isNegative) &&
                                      "border-danger focus-visible:ring-danger text-danger"
                                  )}
                                />
                                {isOverMax && (
                                  <span className="absolute -bottom-4 left-0 text-[9px] text-danger font-bold whitespace-nowrap">
                                    Exceeds {exam.max_marks}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Status Badge */}
                          <td className="py-2.5 px-3 text-center">
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px] uppercase font-bold py-0.5",
                                row.status === "PASSED" &&
                                  "bg-success/15 text-success border-success/30",
                                row.status === "FAILED" &&
                                  "bg-danger/15 text-danger border-danger/30",
                                row.status === "ABSENT" &&
                                  "bg-amber-500/15 text-amber-700 border-amber-500/30",
                                row.status === "PENDING" &&
                                  "bg-muted text-muted-foreground border-border"
                              )}
                            >
                              {row.status}
                            </Badge>
                          </td>

                          {/* Remarks Input */}
                          <td className="py-2.5 px-3">
                            <Input
                              type="text"
                              placeholder="Optional feedback..."
                              value={row.remarks}
                              onChange={(e) =>
                                handleRemarksChange(row.student_user_id, e.target.value)
                              }
                              disabled={isReadOnly}
                              className="h-8 text-xs"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Footer Action Bar */}
          <DialogFooter className="p-4 border-t border-border bg-surface-1 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground flex items-center gap-2">
              {stats.pendingCount > 0 ? (
                <span className="flex items-center gap-1.5 text-warning font-medium">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {stats.pendingCount} student(s) still pending marks
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-success font-medium">
                  <CheckCircle className="h-4 w-4 shrink-0" />
                  All students evaluated!
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                className="text-xs text-danger hover:text-danger hover:bg-danger/10 gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete Exam
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Close
              </Button>

              {/* Draft Save Button: Only for editable status */}
              {!isReadOnly && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleSaveMarks}
                  disabled={isSaving}
                  className="gap-1.5"
                >
                  <Save className="h-3.5 w-3.5" />
                  {isSaving ? "Saving..." : "Save Marks (Draft)"}
                </Button>
              )}

              {/* Lock Marks Button: Only when status is MARKS_ENTRY */}
              {exam.status === "MARKS_ENTRY" && (
                <Button
                  type="button"
                  onClick={() => setShowLockConfirm(true)}
                  disabled={isSaving || isLocking}
                  className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Lock className="h-3.5 w-3.5" />
                  Lock Marks
                </Button>
              )}

              {/* Publish Results Button: Shown when LOCKED or ready */}
              {exam.status === "LOCKED" && (
                <Button
                  type="button"
                  onClick={() => setShowPublishConfirm(true)}
                  disabled={isPublishing}
                  className="gap-1.5 bg-success text-success-foreground hover:bg-success/90"
                >
                  <Send className="h-3.5 w-3.5" />
                  Publish Result to Students
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lock Confirmation Alert Dialog */}
      <AlertDialog open={showLockConfirm} onOpenChange={setShowLockConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2 text-primary mb-1">
              <Lock className="h-5 w-5 text-primary" />
              <AlertDialogTitle className="text-base">Lock Examination Marks?</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-xs space-y-2">
              <p>
                You are about to lock marks for <strong>{exam.exam_type || exam.title}</strong> (
                {exam.classes?.name || "Target Class"}).
              </p>
              <div className="p-3 bg-muted/60 rounded-lg text-[11px] text-foreground space-y-1">
                <p className="font-semibold text-primary">Important Security Rules:</p>
                <p>• Once locked, faculty cannot modify any marks or student statuses.</p>
                <p>• Unlocking can only be performed by an authorized College Administrator.</p>
                <p>• After locking, you can publish the final results to students.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLocking}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLockMarks}
              disabled={isLocking}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isLocking ? "Locking..." : "Confirm & Lock Marks"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Publish Confirmation Alert Dialog */}
      <AlertDialog open={showPublishConfirm} onOpenChange={setShowPublishConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2 text-success mb-1">
              <Send className="h-5 w-5 text-success" />
              <AlertDialogTitle className="text-base">Publish Results to Students?</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-xs space-y-2">
              <p>
                Are you ready to publish final results for <strong>{exam.exam_type || exam.title}</strong>?
              </p>
              <div className="p-3 bg-success/10 border border-success/20 rounded-lg text-[11px] text-success space-y-1">
                <p className="font-semibold">Student Visibility:</p>
                <p>• All enrolled students will immediately be able to view their scores and status.</p>
                <p>• In-app notifications will be dispatched to each student.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPublishing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePublishResults}
              disabled={isPublishing}
              className="bg-success text-success-foreground hover:bg-success/90"
            >
              {isPublishing ? "Publishing..." : "Publish Results"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Exam Confirmation Alert Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2 text-danger mb-1">
              <Trash2 className="h-5 w-5 text-danger" />
              <AlertDialogTitle className="text-base text-danger">Delete Examination?</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-xs space-y-2">
              <p>
                Are you sure you want to permanently delete{" "}
                <strong>{exam.exam_type || exam.title}</strong>?
              </p>
              <div className="p-3 bg-danger/10 border border-danger/20 rounded-lg text-[11px] text-danger space-y-1">
                <p className="font-semibold">Irreversible Action:</p>
                <p>• All recorded marks, absent states, and student feedback will be erased.</p>
                {exam.status === "PUBLISHED" && (
                  <p>• This exam is currently published to students. Deleting it will remove the result from student portals.</p>
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
    </>
  );
}
