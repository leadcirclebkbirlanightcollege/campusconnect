import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { Award, BookOpen, TrendingUp, Trophy } from "lucide-react";
import { PageContainer } from "@/layout/PageContainer";
import { PageHeader } from "@/layout/PageHeader";
import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SegmentedFilter } from "@/components/ui/SegmentedFilter";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type Result = {
  id: string;
  marks_obtained: number;
  grade: string | null;
  remarks: string | null;
  created_at: string;
  exams: { title: string; subject: string; max_marks: number; exam_date: string } | null;
};

function gradeTone(pct: number) {
  if (pct >= 85) return { text: "text-success", bg: "bg-success", soft: "bg-success/12 text-success" };
  if (pct >= 60) return { text: "text-warning", bg: "bg-warning", soft: "bg-warning/12 text-warning" };
  return { text: "text-danger", bg: "bg-danger", soft: "bg-danger/12 text-danger" };
}

type Filter = "all" | "passed" | "top";

export default function StudentResults() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<Filter>("all");

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

  const enriched = useMemo(
    () =>
      results.map((r) => {
        const max = r.exams?.max_marks ?? 100;
        const pct = Math.round((r.marks_obtained / max) * 100);
        return { ...r, max, pct };
      }),
    [results],
  );

  const avgPct = enriched.length ? enriched.reduce((s, r) => s + r.pct, 0) / enriched.length : 0;
  const passedCount = enriched.filter((r) => r.pct >= 60).length;
  const topCount = enriched.filter((r) => r.pct >= 85).length;

  const filtered = useMemo(() => {
    if (filter === "passed") return enriched.filter((r) => r.pct >= 60);
    if (filter === "top") return enriched.filter((r) => r.pct >= 85);
    return enriched;
  }, [enriched, filter]);

  const avgTone = gradeTone(avgPct);

  return (
    <PageContainer className="space-y-4">
      <PageHeader title="Exam Results" subtitle="Your academic performance overview" gradient />

      {/* Hero summary */}
      <div className="relative overflow-hidden rounded-3xl border border-border-subtle bg-gradient-to-br from-primary/15 via-surface-2 to-surface-1 p-5 shadow-elevated">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative flex items-center gap-4">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-border-subtle bg-surface-1 shadow-card">
            <span className={cn("text-[26px] font-black tabular-nums", avgTone.text)}>
              {avgPct.toFixed(0)}
              <span className="text-sm">%</span>
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Average Score
            </p>
            <p className="mt-0.5 text-[18px] font-bold text-foreground">
              {results.length} {results.length === 1 ? "exam" : "exams"} recorded
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Stat icon={<TrendingUp className="h-3.5 w-3.5" />} label="Passed" value={passedCount} />
              <Stat icon={<Trophy className="h-3.5 w-3.5" />} label="Top Grade" value={topCount} />
            </div>
          </div>
        </div>
      </div>

      <SegmentedFilter
        value={filter}
        onChange={(v) => setFilter(v as Filter)}
        options={[
          { value: "all", label: "All", count: enriched.length },
          { value: "passed", label: "Passed", count: passedCount },
          { value: "top", label: "Top", count: topCount },
        ]}
      />

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <GlassCard hover={false} className="text-center py-12">
          <Award className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No results to show</p>
        </GlassCard>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((r) => {
            const tone = gradeTone(r.pct);
            return (
              <article
                key={r.id}
                className="rounded-2xl border border-border-subtle bg-surface-1 p-4 shadow-card transition-[transform,box-shadow] duration-180 hover:-translate-y-0.5 hover:shadow-elevated"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold text-foreground">
                      {r.exams?.title ?? "Exam"}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <BookOpen className="h-3 w-3" /> {r.exams?.subject}
                      </span>
                      {r.exams?.exam_date && (
                        <>
                          <span>·</span>
                          <span>{format(new Date(r.exams.exam_date), "dd MMM yyyy")}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={cn("text-[20px] font-black tabular-nums leading-none", tone.text)}>
                      {r.marks_obtained}
                      <span className="text-sm text-muted-foreground">/{r.max}</span>
                    </p>
                    <p className={cn("mt-1 text-[11px] font-semibold", tone.text)}>{r.pct}%</p>
                  </div>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-3">
                  <div className={cn("h-full rounded-full transition-all", tone.bg)} style={{ width: `${r.pct}%` }} />
                </div>
                {(r.grade || r.remarks) && (
                  <div className="mt-2.5 flex items-center justify-between gap-2">
                    {r.grade && (
                      <Badge variant="secondary" className={cn("text-[10px] font-semibold", tone.soft)}>
                        Grade {r.grade}
                      </Badge>
                    )}
                    {r.remarks && (
                      <p className="truncate text-[11px] italic text-muted-foreground">{r.remarks}</p>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-border-subtle/60 bg-surface-1/70 px-2.5 py-1.5">
      <div className="text-muted-foreground">{icon}</div>
      <div className="min-w-0">
        <p className="text-[14px] font-bold leading-none text-foreground tabular-nums">{value}</p>
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
