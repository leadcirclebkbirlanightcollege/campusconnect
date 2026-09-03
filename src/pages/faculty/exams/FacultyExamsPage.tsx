import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Plus,
  Search,
  ClipboardList,
  BookOpen,
  Award,
  GraduationCap,
  Calendar,
  Lock,
  CheckCircle2,
  Trash2,
  Eye,
  FileEdit,
  Send,
  SlidersHorizontal,
  Clock,
} from "@/components/icons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { CreateExamDialog } from "./CreateExamDialog";
import { ExamMarksEntryModal } from "./ExamMarksEntryModal";
import type { Exam, ExamStatus } from "./types";
import { cn } from "@/lib/utils";

export default function FacultyExamsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedExamForMarks, setSelectedExamForMarks] = useState<Exam | null>(null);
  const [examToDelete, setExamToDelete] = useState<Exam | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Fetch Faculty Profile to get College ID
  const { data: profile } = useQuery({
    queryKey: ["faculty-profile-college", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("college_id,name")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  const collegeId = profile?.college_id ?? null;

  // Fetch exams for this faculty member in this college
  const { data: exams = [], isLoading } = useQuery<Exam[]>({
    queryKey: ["faculty-exams", user?.id, collegeId],
    enabled: !!user && !!collegeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exams")
        .select("*, classes(id,name,section,year)")
        .eq("college_id", collegeId!)
        .eq("created_by", user!.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching exams:", error);
        throw error;
      }
      return (data ?? []) as unknown as Exam[];
    },
  });

  // Fetch count of results per exam to display completion indicators
  const { data: examResultsStats = {} } = useQuery<Record<string, { entered: number; absent: number }>>({
    queryKey: ["exams-results-counts", user?.id, collegeId],
    enabled: !!user && !!collegeId && exams.length > 0,
    queryFn: async () => {
      const examIds = exams.map((e) => e.id);
      const { data, error } = await supabase
        .from("exam_results")
        .select("exam_id,marks_obtained,is_absent")
        .in("exam_id", examIds);

      if (error) {
        console.error("Error fetching exam results summary:", error);
        return {};
      }

      const map: Record<string, { entered: number; absent: number }> = {};
      for (const row of data || []) {
        if (!map[row.exam_id]) {
          map[row.exam_id] = { entered: 0, absent: 0 };
        }
        if (row.is_absent) {
          map[row.exam_id].absent += 1;
        } else if (row.marks_obtained !== null) {
          map[row.exam_id].entered += 1;
        }
      }
      return map;
    },
  });

  // Quick stats summary
  const summaryStats = useMemo(() => {
    const total = exams.length;
    const marksEntry = exams.filter((e) => e.status === "MARKS_ENTRY" || e.status === "DRAFT").length;
    const locked = exams.filter((e) => e.status === "LOCKED").length;
    const published = exams.filter((e) => e.status === "PUBLISHED").length;
    return { total, marksEntry, locked, published };
  }, [exams]);

  // Filtered exams
  const filteredExams = useMemo(() => {
    return exams.filter((exam) => {
      const matchesSearch =
        (exam.exam_type || exam.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (exam.topic || exam.subject || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (exam.classes?.name || "").toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "MARKS_ENTRY" && (exam.status === "MARKS_ENTRY" || exam.status === "DRAFT")) ||
        exam.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [exams, searchQuery, statusFilter]);

  // Delete Exam
  const handleDeleteExam = async () => {
    if (!examToDelete) return;
    try {
      const { error } = await supabase
        .from("exams")
        .delete()
        .eq("id", examToDelete.id);

      if (error) throw error;

      toast.success("Examination removed successfully");
      setExamToDelete(null);
      queryClient.invalidateQueries({ queryKey: ["faculty-exams"] });
    } catch (err: unknown) {
      console.error("Failed to delete exam:", err);
      const message = err instanceof Error ? err.message : "Failed to delete examination";
      toast.error(message);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Exams & Marks
            </h1>
            <Badge variant="secondary" className="text-xs font-semibold">
              Faculty Workspace
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1 max-w-xl">
            Create examinations, record student marks with absent handling, lock assessments, and publish final results.
          </p>
        </div>

        <Button
          onClick={() => setCreateDialogOpen(true)}
          className="gap-2 shadow-xs self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          Create Exam
        </Button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <Card className="bg-surface-1 border-border/70">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Total Exams
              </p>
              <p className="text-2xl font-extrabold tracking-tight mt-0.5 text-foreground">
                {summaryStats.total}
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <ClipboardList className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-surface-1 border-border/70">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Marks Entry
              </p>
              <p className="text-2xl font-extrabold tracking-tight mt-0.5 text-amber-600">
                {summaryStats.marksEntry}
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-surface-1 border-border/70">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Locked
              </p>
              <p className="text-2xl font-extrabold tracking-tight mt-0.5 text-primary">
                {summaryStats.locked}
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Lock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-surface-1 border-border/70">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Published
              </p>
              <p className="text-2xl font-extrabold tracking-tight mt-0.5 text-success">
                {summaryStats.published}
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-success/10 flex items-center justify-center text-success">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <Tabs
          value={statusFilter}
          onValueChange={setStatusFilter}
          className="w-full sm:w-auto"
        >
          <TabsList className="bg-surface-2 border border-border/60">
            <TabsTrigger value="ALL" className="text-xs">
              All ({summaryStats.total})
            </TabsTrigger>
            <TabsTrigger value="MARKS_ENTRY" className="text-xs">
              Marks Entry ({summaryStats.marksEntry})
            </TabsTrigger>
            <TabsTrigger value="LOCKED" className="text-xs">
              Locked ({summaryStats.locked})
            </TabsTrigger>
            <TabsTrigger value="PUBLISHED" className="text-xs">
              Published ({summaryStats.published})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search exam, topic, or class..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs bg-background"
          />
        </div>
      </div>

      {/* Examinations Cards List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-48 w-full rounded-2xl" />
          ))}
        </div>
      ) : filteredExams.length === 0 ? (
        <Card className="border-dashed border-2 border-border/80 bg-surface-1/50 py-16 text-center">
          <CardContent className="flex flex-col items-center justify-center space-y-3">
            <div className="h-14 w-14 rounded-2xl bg-muted/80 flex items-center justify-center text-muted-foreground">
              <ClipboardList className="h-7 w-7 opacity-50" />
            </div>
            <div>
              <p className="text-base font-bold text-foreground">
                No examinations found
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-sm mx-auto">
                {searchQuery || statusFilter !== "ALL"
                  ? "No exams match the selected criteria or search keyword."
                  : "Get started by creating your first examination for a class."}
              </p>
            </div>
            <Button
              onClick={() => setCreateDialogOpen(true)}
              className="gap-1.5 mt-2"
              size="sm"
            >
              <Plus className="h-4 w-4" />
              Create Exam
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredExams.map((exam) => {
            const stats = examResultsStats[exam.id] || { entered: 0, absent: 0 };
            const evaluatedCount = stats.entered + stats.absent;

            return (
              <Card
                key={exam.id}
                className={cn(
                  "border border-border/80 bg-surface-1 hover:border-primary/40 transition-all shadow-xs flex flex-col justify-between overflow-hidden",
                  exam.status === "PUBLISHED" && "hover:border-success/40",
                  exam.status === "LOCKED" && "hover:border-primary/40"
                )}
              >
                <CardHeader className="p-4 pb-2 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-sm font-bold text-foreground tracking-tight line-clamp-1">
                        {exam.exam_type || exam.title}
                      </CardTitle>
                      <p className="text-xs text-primary font-medium flex items-center gap-1.5 mt-0.5 line-clamp-1">
                        <BookOpen className="h-3.5 w-3.5 shrink-0" />
                        {exam.topic || exam.subject}
                      </p>
                    </div>

                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] uppercase font-bold py-0.5 shrink-0",
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
                  </div>

                  {/* Class Badge & Marks info */}
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-border/50">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-semibold text-foreground">
                        {exam.classes?.name || "Class"}
                      </span>
                    </span>

                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span>Max: <strong className="text-foreground">{exam.max_marks}</strong></span>
                      <span>•</span>
                      <span>Min: <strong className="text-foreground">{exam.min_marks}</strong></span>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-4 pt-1 space-y-3">
                  {/* Exam Date & Progress */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(exam.exam_date), "dd MMM yyyy")}
                      </span>
                      <span>
                        {evaluatedCount > 0 ? `${evaluatedCount} evaluated` : "Pending marks entry"}
                      </span>
                    </div>

                    {/* Completion indicator */}
                    {evaluatedCount > 0 && (
                      <div className="text-[10.5px] text-muted-foreground flex items-center justify-between">
                        <span>
                          {stats.entered} Marks • {stats.absent} Absent
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 flex items-center gap-2 border-t border-border/60">
                    {/* Primary action based on status */}
                    {exam.status === "MARKS_ENTRY" || exam.status === "DRAFT" ? (
                      <Button
                        size="sm"
                        className="flex-1 text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
                        onClick={() => setSelectedExamForMarks(exam)}
                      >
                        <FileEdit className="h-3.5 w-3.5" />
                        Enter Marks
                      </Button>
                    ) : exam.status === "LOCKED" ? (
                      <Button
                        size="sm"
                        className="flex-1 text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
                        onClick={() => setSelectedExamForMarks(exam)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View / Publish
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-xs gap-1.5"
                        onClick={() => setSelectedExamForMarks(exam)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View Marks
                      </Button>
                    )}

                    {/* Delete action (only enabled for un-locked exams) */}
                    {(exam.status === "MARKS_ENTRY" || exam.status === "DRAFT") && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-danger hover:bg-danger/10"
                        title="Delete Exam"
                        onClick={() => setExamToDelete(exam)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Exam Dialog */}
      <CreateExamDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        collegeId={collegeId}
        onExamCreated={(newExam) => {
          queryClient.invalidateQueries({ queryKey: ["faculty-exams"] });
          // Open marks entry modal immediately for the newly created exam
          setSelectedExamForMarks(newExam);
        }}
      />

      {/* Marks Entry & Review Modal */}
      <ExamMarksEntryModal
        exam={selectedExamForMarks}
        open={!!selectedExamForMarks}
        onOpenChange={(open) => {
          if (!open) setSelectedExamForMarks(null);
        }}
        onExamUpdated={(updated) => {
          setSelectedExamForMarks(updated);
          queryClient.invalidateQueries({ queryKey: ["faculty-exams"] });
        }}
      />

      {/* Delete Exam Confirmation Dialog */}
      <AlertDialog open={!!examToDelete} onOpenChange={(open) => !open && setExamToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base text-danger">Delete Examination?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Are you sure you want to delete <strong>{examToDelete?.exam_type || examToDelete?.title}</strong>?
              This will permanently remove the exam record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteExam}
              className="bg-danger text-danger-foreground hover:bg-danger/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
