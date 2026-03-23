import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { Award, BookOpen, TrendingUp } from "lucide-react";
import { PageContainer } from "@/layout/PageContainer";
import { PageHeader } from "@/layout/PageHeader";
import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

type Result = {
  id: string;
  marks_obtained: number;
  grade: string | null;
  remarks: string | null;
  created_at: string;
  exams: { title: string; subject: string; max_marks: number; exam_date: string } | null;
};

function gradeColor(pct: number) {
  if (pct >= 85) return "text-green-600";
  if (pct >= 60) return "text-yellow-600";
  return "text-red-500";
}

export default function StudentResults() {
  const { user } = useAuth();

  const { data: results = [], isLoading } = useQuery<Result[]>({
    queryKey: ["student", "results", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("exam_results")
        .select("id,marks_obtained,grade,remarks,created_at,exams(title,subject,max_marks,exam_date)")
        .eq("student_user_id", user!.id)
        .order("created_at", { ascending: false });
      return (data ?? []) as unknown as Result[];
    },
    staleTime: 60_000,
  });

  const avgPct = results.length
    ? results.reduce((sum, r) => {
        const max = r.exams?.max_marks ?? 100;
        return sum + (r.marks_obtained / max) * 100;
      }, 0) / results.length
    : 0;

  return (
    <PageContainer className="space-y-5">
      <PageHeader title="Exam Results" subtitle="Your academic performance records" gradient />

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <GlassCard hover={false} className="text-center py-4">
          <p className="text-2xl font-bold text-foreground">{results.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Exams</p>
        </GlassCard>
        <GlassCard hover={false} className="text-center py-4">
          <p className={`text-2xl font-bold ${gradeColor(avgPct)}`}>{avgPct.toFixed(0)}%</p>
          <p className="text-xs text-muted-foreground mt-0.5">Average</p>
        </GlassCard>
        <GlassCard hover={false} className="text-center py-4">
          <p className="text-2xl font-bold text-foreground">
            {results.filter(r => (r.marks_obtained / (r.exams?.max_marks ?? 100)) * 100 >= 60).length}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">Passed</p>
        </GlassCard>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : results.length === 0 ? (
        <GlassCard hover={false} className="text-center py-12">
          <Award className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No results published yet</p>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {results.map((result) => {
            const max = result.exams?.max_marks ?? 100;
            const pct = Math.round((result.marks_obtained / max) * 100);
            return (
              <GlassCard key={result.id} className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {result.exams?.title ?? "Exam"}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <BookOpen className="h-3 w-3" />
                        {result.exams?.subject}
                      </span>
                      {result.exams?.exam_date && (
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(result.exams.exam_date), "dd MMM yyyy")}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-xl font-bold ${gradeColor(pct)}`}>
                      {result.marks_obtained}/{max}
                    </p>
                    <p className={`text-xs font-medium ${gradeColor(pct)}`}>{pct}%</p>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${pct >= 85 ? "bg-green-500" : pct >= 60 ? "bg-yellow-500" : "bg-red-500"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  {result.grade && (
                    <Badge variant="secondary" className="text-xs">Grade: {result.grade}</Badge>
                  )}
                  {result.remarks && (
                    <p className="text-xs text-muted-foreground italic">{result.remarks}</p>
                  )}
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}
