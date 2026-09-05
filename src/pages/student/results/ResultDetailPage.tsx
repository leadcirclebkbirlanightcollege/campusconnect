import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { PageContainer } from "@/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PremiumEmpty } from "@/components/ui/premium-empty";
import ShareButton from "@/components/share/ShareButton";
import { format } from "date-fns";
import {
  ArrowLeft,
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  ShieldCheck,
  Lock,
} from "@/components/icons";

type ResultDetail = {
  id: string;
  student_user_id: string;
  marks_obtained: number | null;
  is_absent: boolean;
  status: string;
  grade: string | null;
  remarks: string | null;
  created_at: string;
  exams?: {
    id: string;
    title: string;
    subject: string;
    max_marks: number;
    min_marks: number;
    exam_date: string;
    exam_type: string | null;
    topic: string | null;
  } | null;
};

export default function ResultDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();

  const { data: result, isLoading, isError } = useQuery<ResultDetail | null>({
    queryKey: ["result", "detail", id, user?.id],
    enabled: Boolean(id) && !authLoading && Boolean(user?.id),
    queryFn: async () => {
      if (!id || !user) return null;

      // Check role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      const isStaff = roleData?.role === "admin" || roleData?.role === "super_admin" || roleData?.role === "faculty";

      let query = supabase
        .from("exam_results")
        .select(`
          id, student_user_id, marks_obtained, is_absent, status, grade, remarks, created_at,
          exams (id, title, subject, max_marks, min_marks, exam_date, exam_type, topic)
        `)
        .eq("id", id);

      // Strict student privacy: students can ONLY view their own result
      if (!isStaff) {
        query = query.eq("student_user_id", user.id);
      }

      const { data, error } = await query.maybeSingle();
      if (error) return null;
      return data as unknown as ResultDetail | null;
    },
    staleTime: 30_000,
  });

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/app/results");
    }
  };

  if (authLoading || isLoading) {
    return (
      <PageContainer className="py-8 max-w-3xl mx-auto space-y-6">
        <Skeleton className="h-9 w-28 rounded-xl" />
        <Skeleton className="h-44 w-full rounded-3xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </PageContainer>
    );
  }

  // Not authenticated → redirect to login preserving destination
  if (!user) {
    navigate(`/auth?redirect=${encodeURIComponent(`/results/${id}`)}`, { replace: true });
    return null;
  }

  if (isError || !result) {
    return (
      <PageContainer className="py-12 max-w-2xl mx-auto text-center space-y-6">
        <Button variant="ghost" size="sm" onClick={handleBack} className="gap-2 mb-4 self-start">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <PremiumEmpty
          art="results"
          tone="premium"
          title="Result Not Found or Restricted"
          description="This academic record does not exist or you do not have authorization to view this student's result."
        />
        <div className="pt-2 flex justify-center gap-3">
          <Button onClick={() => navigate("/app/results")} className="rounded-xl">
            Go to My Results
          </Button>
        </div>
      </PageContainer>
    );
  }

  const exam = result.exams;
  const isPassed =
    exam && result.marks_obtained != null ? result.marks_obtained >= exam.min_marks : true;

  return (
    <div className="min-h-screen bg-background pb-16">
      <header className="sticky top-0 z-30 border-b border-border-subtle bg-background/85 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="gap-1.5 rounded-xl font-medium text-foreground -ml-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>My Results</span>
          </Button>

          <ShareButton
            title={`Academic Result: ${exam?.title || "Exam"}`}
            description="Verified academic report on Campus Connect"
            url={`/results/${result.id}`}
            entityType="result"
            variant="outline"
            size="sm"
            className="rounded-xl font-semibold"
          />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        <div className="rounded-3xl border border-border-subtle bg-surface-1 p-6 sm:p-8 shadow-card space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-premium/10 text-premium border border-premium/20">
              <Award className="h-7 w-7" />
            </div>

            <Badge
              className={
                result.is_absent
                  ? "bg-danger text-danger-foreground font-bold"
                  : isPassed
                  ? "bg-success text-success-foreground font-bold"
                  : "bg-danger text-danger-foreground font-bold"
              }
            >
              {result.is_absent ? "Absent" : isPassed ? "Passed" : "Needs Improvement"}
            </Badge>
          </div>

          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
              {exam?.title || "Exam Result"}
            </h1>
            {exam?.subject && (
              <p className="text-sm font-semibold text-primary flex items-center gap-1.5">
                <BookOpen className="h-4 w-4" /> {exam.subject}
              </p>
            )}
          </div>

          {/* Marks Scorecard */}
          <div className="p-6 rounded-2xl border border-border-subtle bg-surface-2/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <div>
              <p className="text-xs uppercase font-bold tracking-wider text-muted-foreground">
                Marks Obtained
              </p>
              <p className="text-3xl sm:text-4xl font-black text-foreground mt-1">
                {result.is_absent ? "ABS" : result.marks_obtained ?? "-"}
                <span className="text-base text-muted-foreground font-normal">
                  {" "}
                  / {exam?.max_marks || 100}
                </span>
              </p>
            </div>

            {result.grade && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-muted-foreground">Grade:</span>
                <span className="text-2xl font-black text-primary px-3 py-1 rounded-xl bg-primary/10 border border-primary/20">
                  {result.grade}
                </span>
              </div>
            )}
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl border border-border-subtle bg-surface-2/40">
              <p className="text-[10.5px] uppercase font-bold tracking-wider text-muted-foreground">Exam Date</p>
              <p className="text-xs font-bold text-foreground mt-0.5">
                {exam?.exam_date ? format(new Date(exam.exam_date + "T00:00:00"), "dd MMM yyyy") : "-"}
              </p>
            </div>

            <div className="p-3 rounded-xl border border-border-subtle bg-surface-2/40">
              <p className="text-[10.5px] uppercase font-bold tracking-wider text-muted-foreground">Passing Marks</p>
              <p className="text-xs font-bold text-foreground mt-0.5">
                {exam?.min_marks || 40} pts
              </p>
            </div>

            <div className="p-3 rounded-xl border border-border-subtle bg-surface-2/40">
              <p className="text-[10.5px] uppercase font-bold tracking-wider text-muted-foreground">Status</p>
              <p className="text-xs font-bold text-foreground mt-0.5 capitalize">
                {result.status || "Verified"}
              </p>
            </div>
          </div>

          {result.remarks && (
            <div className="pt-2 border-t border-border-subtle/70 space-y-1">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Remarks
              </h2>
              <p className="text-sm text-foreground">{result.remarks}</p>
            </div>
          )}

          <div className="pt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-success shrink-0" />
            <span>Authenticated student record protected by institutional security policies.</span>
          </div>
        </div>
      </main>
    </div>
  );
}
