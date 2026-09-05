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
import { useShareMeta } from "@/hooks/use-share-meta";
import { format, isPast, isToday } from "date-fns";
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  MapPin,
  Award,
  BookOpen,
  Building2,
  GraduationCap,
  AlertCircle,
} from "@/components/icons";

type ExamRecord = {
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
  status: string;
  description: string | null;
  classes?: { id: string; name: string; section: string | null } | null;
};

export default function ExamDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();

  const { data: exam, isLoading, isError } = useQuery<ExamRecord | null>({
    queryKey: ["exam", "detail", id],
    enabled: Boolean(id) && !authLoading,
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("exams")
        .select(
          `id, title, subject, exam_type, topic, class_id, college_id, exam_date, max_marks, min_marks, status, description,
           classes (id, name, section)`
        )
        .eq("id", id)
        .eq("is_active", true)
        .maybeSingle();

      if (error) return null;
      return data as unknown as ExamRecord | null;
    },
    staleTime: 60_000,
  });

  useShareMeta({
    title: exam?.title || "Exam Schedule",
    description: exam?.subject ? `Exam for ${exam.subject}` : "Campus Connect Examination",
    canonicalPath: id ? `/exams/${id}` : "/exams",
  });

  const examDay = exam?.exam_date ? new Date(exam.exam_date + "T00:00:00") : null;
  const isTodayExam = examDay ? isToday(examDay) : false;
  const isPastExam = examDay ? isPast(examDay) && !isTodayExam : false;

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/app/dashboard");
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
    navigate(`/auth?redirect=${encodeURIComponent(`/exams/${id}`)}`, { replace: true });
    return null;
  }

  if (isError || !exam) {
    return (
      <PageContainer className="py-12 max-w-2xl mx-auto text-center space-y-6">
        <Button variant="ghost" size="sm" onClick={handleBack} className="gap-2 mb-4 self-start">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <PremiumEmpty
          art="results"
          tone="danger"
          title="Exam Not Found"
          description="This examination schedule may have concluded or the link is invalid."
        />
      </PageContainer>
    );
  }

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
            <span>Exams</span>
          </Button>

          <ShareButton
            title={exam.title}
            description={exam.subject ? `Subject: ${exam.subject}` : exam.title}
            url={`/exams/${exam.id}`}
            entityType="exam"
            variant="outline"
            size="sm"
            className="rounded-xl font-semibold"
          />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        <div className="rounded-3xl border border-border-subtle bg-surface-1 p-6 sm:p-8 shadow-card space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-danger/10 text-danger border border-danger/20">
              <Award className="h-7 w-7" />
            </div>

            <div className="flex flex-wrap gap-2">
              {isTodayExam && (
                <Badge className="bg-danger text-danger-foreground font-bold text-xs">
                  Today
                </Badge>
              )}
              {isPastExam && (
                <Badge variant="secondary" className="font-semibold text-xs">
                  Concluded
                </Badge>
              )}
              {!isTodayExam && !isPastExam && (
                <Badge variant="outline" className="font-semibold text-xs">
                  Upcoming
                </Badge>
              )}
              {exam.status === "PUBLISHED" && (
                <Badge className="bg-success text-success-foreground font-bold text-xs">
                  Published
                </Badge>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
              {exam.title}
            </h1>
            <p className="text-sm font-semibold text-primary flex items-center gap-1.5">
              <BookOpen className="h-4 w-4" /> {exam.subject}
              {exam.classes && (
                <span className="text-muted-foreground font-normal">
                  · {exam.classes.name} {exam.classes.section ? `(${exam.classes.section})` : ""}
                </span>
              )}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="p-3 rounded-xl border border-border-subtle bg-surface-2/60">
              <p className="text-[10.5px] uppercase font-bold tracking-wider text-muted-foreground">Date</p>
              <p className="text-xs font-bold text-foreground mt-0.5">
                {examDay ? format(examDay, "dd MMM yyyy") : exam.exam_date}
              </p>
            </div>

            <div className="p-3 rounded-xl border border-border-subtle bg-surface-2/60">
              <p className="text-[10.5px] uppercase font-bold tracking-wider text-muted-foreground">Type</p>
              <p className="text-xs font-bold text-foreground mt-0.5 uppercase">
                {exam.exam_type || "Written"}
              </p>
            </div>

            <div className="p-3 rounded-xl border border-border-subtle bg-surface-2/60">
              <p className="text-[10.5px] uppercase font-bold tracking-wider text-muted-foreground">Max Marks</p>
              <p className="text-xs font-bold text-foreground mt-0.5">
                {exam.max_marks} pts
              </p>
            </div>

            <div className="p-3 rounded-xl border border-border-subtle bg-surface-2/60">
              <p className="text-[10.5px] uppercase font-bold tracking-wider text-muted-foreground">Passing</p>
              <p className="text-xs font-bold text-foreground mt-0.5">
                {exam.min_marks} pts
              </p>
            </div>
          </div>

          {exam.topic && (
            <div className="pt-2 border-t border-border-subtle/70 space-y-1">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Topics Covered
              </h2>
              <p className="text-sm text-foreground">{exam.topic}</p>
            </div>
          )}

          {exam.description && (
            <div className="pt-2 border-t border-border-subtle/70 space-y-1">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Instructions & Guidelines
              </h2>
              <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {exam.description}
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-border-subtle/70 flex flex-wrap gap-3">
            <ShareButton
              title={exam.title}
              description={`Exam for ${exam.subject} on ${exam.exam_date}`}
              url={`/exams/${exam.id}`}
              entityType="exam"
              variant="secondary"
              className="rounded-xl font-semibold gap-2"
              text="Share Exam Details"
            />
          </div>
        </div>
      </main>
    </div>
  );
}
