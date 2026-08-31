import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, isFuture, isPast, addDays, parseISO, differenceInDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import {
  FileText, Plus, Search, Filter, Calendar, Users,
  CheckCircle2, Clock, Paperclip, ChevronRight, Eye,
  ArrowLeft, Award, AlertCircle, Sparkles, Loader2, Save
} from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

import CreateAssignmentDialog from "./components/CreateAssignmentDialog";

type AssignmentTab = "all" | "active" | "due_soon" | "completed";

export default function FacultyAssignments() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<AssignmentTab>("all");
  const [search, setSearch] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);

  // Grade state when evaluating submissions in detail view
  const [gradeInputs, setGradeInputs] = useState<Record<string, { marks: string; feedback: string }>>({});

  // 1. Fetch assignments created by this faculty
  const { data: assignments = [], isLoading: isLoadingAssignments } = useQuery({
    queryKey: ["faculty", "assignments", user?.id],
    enabled: !!user,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assignments" as any)
        .select("*")
        .eq("created_by", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const assignmentIds = useMemo(() => assignments.map((a: any) => a.id), [assignments]);

  // 2. Fetch all submissions for this faculty's assignments
  const { data: allSubmissions = [], isLoading: isLoadingAllSubmissions } = useQuery({
    queryKey: ["faculty", "all-submissions", user?.id, assignmentIds],
    enabled: !!user && assignmentIds.length > 0,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("submissions" as any)
        .select("id,assignment_id,student_user_id,status,marks_obtained,feedback,submitted_at,attachment_url,attachment_name,content,profiles:student_user_id(name,student_id,department,avatar_url)")
        .in("assignment_id", assignmentIds)
        .order("submitted_at", { ascending: false });
      if (error) return [];
      return data ?? [];
    },
  });

  // Grade submission mutation
  const gradeMutation = useMutation({
    mutationFn: async ({
      submissionId,
      marks,
      feedback,
    }: {
      submissionId: string;
      marks: number;
      feedback: string;
    }) => {
      const { error } = await supabase
        .from("submissions" as any)
        .update({
          marks_obtained: marks,
          feedback: feedback.trim() || null,
          status: "graded",
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", submissionId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Submission graded successfully!");
      qc.invalidateQueries({ queryKey: ["faculty", "all-submissions"] });
      qc.invalidateQueries({ queryKey: ["faculty", "pending-work"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to submit grade");
    },
  });

  // Calculate stats for each assignment
  const assignmentsWithStats = useMemo(() => {
    return assignments.map((asn: any) => {
      const subs = allSubmissions.filter((s: any) => s.assignment_id === asn.id);
      const totalSubmitted = subs.length;
      const evaluatedCount = subs.filter((s: any) => s.status === "graded").length;
      const pendingCount = totalSubmitted - evaluatedCount;
      
      const dueDate = parseISO(asn.due_date);
      const isPastDue = isPast(dueDate);
      const daysUntilDue = differenceInDays(dueDate, new Date());
      const isDueSoon = !isPastDue && daysUntilDue <= 3 && daysUntilDue >= 0;

      return {
        ...asn,
        totalSubmitted,
        evaluatedCount,
        pendingCount,
        isPastDue,
        isDueSoon,
      };
    });
  }, [assignments, allSubmissions]);

  // Overall KPI counts
  const totalAssignments = assignmentsWithStats.length;
  const activeCount = useMemo(() => assignmentsWithStats.filter((a) => !a.isPastDue).length, [assignmentsWithStats]);
  const dueSoonCount = useMemo(() => assignmentsWithStats.filter((a) => a.isDueSoon).length, [assignmentsWithStats]);
  const awaitingGradingCount = useMemo(() => {
    return assignmentsWithStats.reduce((acc, curr) => acc + curr.pendingCount, 0);
  }, [assignmentsWithStats]);

  // Filtered assignments
  const filteredAssignments = useMemo(() => {
    const q = search.toLowerCase().trim();
    return assignmentsWithStats.filter((asn) => {
      const matchesSearch = !q || asn.title?.toLowerCase().includes(q) || asn.description?.toLowerCase().includes(q);

      let matchesTab = true;
      if (activeTab === "active") matchesTab = !asn.isPastDue;
      else if (activeTab === "due_soon") matchesTab = asn.isDueSoon;
      else if (activeTab === "completed") matchesTab = asn.isPastDue;

      return matchesSearch && matchesTab;
    });
  }, [assignmentsWithStats, search, activeTab]);

  // Selected assignment for detail view
  const selectedAssignment = assignmentsWithStats.find((a) => a.id === selectedAssignmentId);
  const selectedSubmissions = allSubmissions.filter((s: any) => s.assignment_id === selectedAssignmentId);

  // If in assignment detail mode
  if (selectedAssignmentId && selectedAssignment) {
    return (
      <div className="space-y-6 pb-12">
        {/* Breadcrumb & Navigation */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedAssignmentId(null)}
            className="rounded-xl text-[12.5px] h-8.5 gap-1 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Assignments
          </Button>
        </div>

        {/* Assignment Header Card */}
        <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-2xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span
                  className={cn(
                    "text-[10.5px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
                    selectedAssignment.isPastDue
                      ? "bg-muted text-muted-foreground border border-border/40"
                      : selectedAssignment.isDueSoon
                      ? "bg-warning/15 text-warning border border-warning/30"
                      : "bg-success/15 text-success border border-success/30"
                  )}
                >
                  {selectedAssignment.isPastDue ? "Closed / Past Due" : selectedAssignment.isDueSoon ? "Due Soon" : "Active"}
                </span>
                <span className="text-[12px] text-muted-foreground">
                  Due {format(new Date(selectedAssignment.due_date), "MMMM d, yyyy")}
                </span>
              </div>

              <h1 className="text-[20px] font-bold text-foreground tracking-tight">
                {selectedAssignment.title}
              </h1>

              {selectedAssignment.description && (
                <p className="text-[13px] text-muted-foreground mt-2 leading-relaxed">
                  {selectedAssignment.description}
                </p>
              )}
            </div>

            <div className="text-left sm:text-right shrink-0 p-3.5 rounded-xl bg-muted/20 border border-border/40">
              <p className="text-[11px] text-muted-foreground font-medium">Max Score</p>
              <p className="text-[20px] font-bold text-foreground mt-0.5 tabular-nums">
                {selectedAssignment.max_marks} <span className="text-[12px] font-normal text-muted-foreground">marks</span>
              </p>
            </div>
          </div>

          {/* Submission KPI Bar */}
          <div className="grid grid-cols-3 gap-3 mt-6 pt-5 border-t border-border/40">
            <div className="p-3 rounded-xl bg-card border border-border/40 text-center shadow-2xs">
              <p className="text-[11px] text-muted-foreground font-medium">Total Submissions</p>
              <p className="text-[18px] font-bold text-foreground mt-0.5 tabular-nums">
                {selectedAssignment.totalSubmitted}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-card border border-border/40 text-center shadow-2xs">
              <p className="text-[11px] text-muted-foreground font-medium">Evaluated</p>
              <p className="text-[18px] font-bold text-success mt-0.5 tabular-nums">
                {selectedAssignment.evaluatedCount}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-card border border-border/40 text-center shadow-2xs">
              <p className="text-[11px] text-muted-foreground font-medium">Awaiting Evaluation</p>
              <p className={cn("text-[18px] font-bold mt-0.5 tabular-nums", selectedAssignment.pendingCount > 0 ? "text-warning" : "text-muted-foreground")}>
                {selectedAssignment.pendingCount}
              </p>
            </div>
          </div>
        </div>

        {/* Submissions Evaluation List */}
        <div className="space-y-3">
          <h2 className="text-[15px] font-bold text-foreground">
            Student Submissions ({selectedSubmissions.length})
          </h2>

          {selectedSubmissions.length === 0 ? (
            <div className="rounded-2xl border border-border/50 bg-card p-12 text-center shadow-2xs">
              <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-[13.5px] font-semibold text-foreground">No submissions received yet</p>
              <p className="text-[12px] text-muted-foreground mt-0.5">
                Students will appear here once they upload or submit their work.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedSubmissions.map((sub: any) => {
                const student = sub.profiles;
                const isGraded = sub.status === "graded";
                const currentInput = gradeInputs[sub.id] ?? {
                  marks: isGraded ? String(sub.marks_obtained ?? "") : "",
                  feedback: sub.feedback || "",
                };

                return (
                  <div
                    key={sub.id}
                    className="rounded-2xl border border-border/50 bg-card p-5 shadow-2xs space-y-4"
                  >
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-border/40">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                          {student?.name?.charAt(0) || "S"}
                        </div>
                        <div>
                          <p className="text-[13.5px] font-bold text-foreground leading-tight">
                            {student?.name || "Student"}
                          </p>
                          <p className="text-[11.5px] text-muted-foreground">
                            ID: {student?.student_id || "—"} · Submitted {sub.submitted_at ? format(new Date(sub.submitted_at), "MMM d, HH:mm") : "—"}
                          </p>
                        </div>
                      </div>

                      <div>
                        {isGraded ? (
                          <span className="inline-flex items-center gap-1 text-[11.5px] font-bold px-2.5 py-1 rounded-full bg-success/10 text-success border border-success/20">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Graded ({sub.marks_obtained} / {selectedAssignment.max_marks})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold px-2.5 py-1 rounded-full bg-warning/10 text-warning border border-warning/20">
                            <Clock className="h-3.5 w-3.5" /> Pending Evaluation
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Content or Attachment */}
                    {sub.content && (
                      <div className="p-3 rounded-xl bg-muted/20 border border-border/40 text-[12.5px] text-foreground">
                        {sub.content}
                      </div>
                    )}

                    {sub.attachment_url && (
                      <div>
                        <a
                          href={sub.attachment_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-primary/20 bg-primary/5 text-primary text-[12px] font-medium hover:bg-primary/10 transition-colors"
                        >
                          <Paperclip className="h-3.5 w-3.5" />
                          <span>{sub.attachment_name || "View Submitted Document / Attachment"}</span>
                        </a>
                      </div>
                    )}

                    {/* Grading Form */}
                    <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                      <div className="flex items-center gap-2">
                        <label className="text-[12px] font-medium text-muted-foreground shrink-0">Marks:</label>
                        <Input
                          type="number"
                          placeholder="0"
                          value={currentInput.marks}
                          onChange={(e) => {
                            setGradeInputs((prev) => ({
                              ...prev,
                              [sub.id]: {
                                ...currentInput,
                                marks: e.target.value,
                              },
                            }));
                          }}
                          className="w-24 h-9 text-[13px] text-center font-bold rounded-xl"
                        />
                        <span className="text-[12px] text-muted-foreground">/ {selectedAssignment.max_marks}</span>
                      </div>

                      <div className="flex-1">
                        <Input
                          placeholder="Feedback note (optional)…"
                          value={currentInput.feedback}
                          onChange={(e) => {
                            setGradeInputs((prev) => ({
                              ...prev,
                              [sub.id]: {
                                ...currentInput,
                                feedback: e.target.value,
                              },
                            }));
                          }}
                          className="h-9 text-[12.5px] rounded-xl"
                        />
                      </div>

                      <Button
                        size="sm"
                        disabled={!currentInput.marks || gradeMutation.isPending}
                        onClick={() => {
                          const marksNum = parseFloat(currentInput.marks);
                          if (isNaN(marksNum) || marksNum < 0 || marksNum > selectedAssignment.max_marks) {
                            toast.error(`Marks must be between 0 and ${selectedAssignment.max_marks}`);
                            return;
                          }
                          gradeMutation.mutate({
                            submissionId: sub.id,
                            marks: marksNum,
                            feedback: currentInput.feedback,
                          });
                        }}
                        className="rounded-xl text-[12px] h-9 gap-1 px-4 shrink-0"
                      >
                        <Save className="h-3.5 w-3.5" /> Save Grade
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-bold text-foreground tracking-tight">Coursework & Assignments</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            Create assignments, review student submissions, and grade coursework.
          </p>
        </div>
        <Button
          onClick={() => setShowCreateDialog(true)}
          className="rounded-xl text-[12.5px] h-9 gap-1.5 bg-primary text-primary-foreground font-medium shadow-xs"
        >
          <Plus className="h-4 w-4" /> New Assignment
        </Button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-border/50 bg-card p-4 shadow-2xs">
          <p className="text-[11.5px] font-medium text-muted-foreground">Total Assignments</p>
          <p className="text-[22px] font-bold text-foreground mt-1 tabular-nums">{totalAssignments}</p>
        </div>

        <div className="rounded-2xl border border-border/50 bg-card p-4 shadow-2xs">
          <p className="text-[11.5px] font-medium text-muted-foreground">Active Work</p>
          <p className="text-[22px] font-bold text-success mt-1 tabular-nums">{activeCount}</p>
        </div>

        <div className="rounded-2xl border border-border/50 bg-card p-4 shadow-2xs">
          <p className="text-[11.5px] font-medium text-muted-foreground">Due Soon (3 Days)</p>
          <p className="text-[22px] font-bold text-warning mt-1 tabular-nums">{dueSoonCount}</p>
        </div>

        <div className={cn(
          "rounded-2xl border p-4 shadow-2xs transition-colors",
          awaitingGradingCount > 0 ? "border-primary/30 bg-primary/5" : "border-border/50 bg-card"
        )}>
          <p className="text-[11.5px] font-medium text-muted-foreground">Awaiting Evaluation</p>
          <p className={cn("text-[22px] font-bold mt-1 tabular-nums", awaitingGradingCount > 0 ? "text-primary" : "text-foreground")}>
            {awaitingGradingCount}
          </p>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Status Tabs */}
        <div className="flex items-center gap-1 p-1 bg-muted/40 rounded-xl border border-border/40 shrink-0 overflow-x-auto">
          {[
            { id: "all", label: "All", count: totalAssignments },
            { id: "active", label: "Active", count: activeCount },
            { id: "due_soon", label: "Due Soon", count: dueSoonCount },
            { id: "completed", label: "Closed", count: totalAssignments - activeCount },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as AssignmentTab)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-medium transition-all shrink-0",
                activeTab === tab.id
                  ? "bg-card text-foreground font-semibold shadow-xs border border-border/40"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span>{tab.label}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-muted text-muted-foreground font-mono">
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search assignments…"
            className="pl-9 text-[12.5px] h-9.5 rounded-xl bg-card border-border/50"
          />
        </div>
      </div>

      {/* Assignments List */}
      {isLoadingAssignments || isLoadingAllSubmissions ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
      ) : filteredAssignments.length === 0 ? (
        <div className="rounded-2xl border border-border/50 bg-card p-12 text-center shadow-2xs">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
            <FileText className="h-6 w-6" />
          </div>
          <h3 className="text-[15px] font-bold text-foreground">
            {assignments.length === 0 ? "No assignments created yet" : "No assignments match filter"}
          </h3>
          <p className="text-[12.5px] text-muted-foreground max-w-sm mx-auto mt-1">
            {assignments.length === 0
              ? "Create coursework, set deadlines, and grade student submissions in one place."
              : "Try switching filters or adjusting your search term."}
          </p>
          {assignments.length === 0 && (
            <Button
              onClick={() => setShowCreateDialog(true)}
              size="sm"
              className="mt-4 rounded-xl text-[12.5px] gap-1.5"
            >
              <Plus className="h-4 w-4" /> Create First Assignment
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAssignments.map((asn) => (
            <div
              key={asn.id}
              onClick={() => setSelectedAssignmentId(asn.id)}
              className="rounded-2xl border border-border/50 bg-card p-5 hover:border-primary/30 transition-all shadow-2xs hover:shadow-xs cursor-pointer group"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span
                      className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
                        asn.isPastDue
                          ? "bg-muted text-muted-foreground border border-border/40"
                          : asn.isDueSoon
                          ? "bg-warning/15 text-warning border border-warning/30"
                          : "bg-success/15 text-success border border-success/30"
                      )}
                    >
                      {asn.isPastDue ? "Closed" : asn.isDueSoon ? "Due Soon" : "Active"}
                    </span>
                    <span className="text-[11.5px] text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-muted-foreground/70" />
                      Due {format(new Date(asn.due_date), "MMM d, yyyy")}
                    </span>
                    <span className="text-[11.5px] text-muted-foreground">
                      · Max {asn.max_marks} marks
                    </span>
                  </div>

                  <h3 className="text-[14.5px] font-bold text-foreground group-hover:text-primary transition-colors truncate">
                    {asn.title}
                  </h3>

                  {asn.description && (
                    <p className="text-[12.5px] text-muted-foreground mt-1 line-clamp-1">
                      {asn.description}
                    </p>
                  )}
                </div>

                {/* Submissions Pill & Action */}
                <div className="flex items-center gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40 justify-between sm:justify-end">
                  <div className="flex items-center gap-2 text-[12px]">
                    <div className="px-2.5 py-1 rounded-xl bg-muted/40 border border-border/40">
                      <span className="text-muted-foreground font-medium">Submissions: </span>
                      <span className="font-bold text-foreground">{asn.totalSubmitted}</span>
                    </div>

                    {asn.pendingCount > 0 && (
                      <div className="px-2.5 py-1 rounded-xl bg-warning/10 border border-warning/20 text-warning font-semibold">
                        {asn.pendingCount} to grade
                      </div>
                    )}
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl text-[12px] h-8.5 gap-1 group-hover:border-primary/30"
                  >
                    <span>Manage</span>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Assignment Dialog */}
      <CreateAssignmentDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />
    </div>
  );
}
