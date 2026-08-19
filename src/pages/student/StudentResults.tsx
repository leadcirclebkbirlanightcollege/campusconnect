import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { BookOpen, GraduationCap, Trophy, TrendingUp } from "@/components/icons";
import { PageContainer } from "@/layout/PageContainer";
import { ModuleHero, HeroOverlap } from "@/layout/ModuleHero";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SegmentedFilter } from "@/components/ui/SegmentedFilter";
import { PremiumEmpty } from "@/components/ui/premium-empty";
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

const BANDS = [
  { label: "A", min: 85, tone: "bg-success" },
  { label: "B", min: 70, tone: "bg-info" },
  { label: "C", min: 60, tone: "bg-warning" },
  { label: "D", min: 0, tone: "bg-danger" },
];

function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "rounded-[20px] border border-border-subtle bg-surface-1 p-4",
        "shadow-[0_16px_38px_-30px_hsl(var(--foreground)/0.55)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

function GroupTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 px-1">
      <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground/70">{title}</h2>
      {hint && <span className="text-[10.5px] text-muted-foreground/55">{hint}</span>}
    </div>
  );
}

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
  const failedCount = enriched.length - passedCount;
  const topCount = enriched.filter((r) => r.pct >= 85).length;
  const cgpa = (avgPct / 9.5).toFixed(2);

  /* Chronological trend (oldest → newest) */
  const trend = useMemo(
    () =>
      [...enriched]
        .reverse()
        .slice(-8)
        .map((r) => ({ label: r.exams?.subject?.slice(0, 3) ?? "—", pct: r.pct })),
    [enriched],
  );

  const topSubjects = useMemo(
    () => [...enriched].sort((a, b) => b.pct - a.pct).slice(0, 3),
    [enriched],
  );

  const distribution = useMemo(
    () =>
      BANDS.map((b, i) => {
        const upper = i === 0 ? 101 : BANDS[i - 1].min;
        const count = enriched.filter((r) => r.pct >= b.min && r.pct < upper).length;
        return { ...b, count };
      }),
    [enriched],
  );

  const filtered = useMemo(() => {
    if (filter === "passed") return enriched.filter((r) => r.pct >= 60);
    if (filter === "top") return enriched.filter((r) => r.pct >= 85);
    return enriched;
  }, [enriched, filter]);

  return (
    <PageContainer className="pb-24" noPadding>
      <ModuleHero
        tone="academics"
        eyebrow="Academics"
        title="Results"
        subtitle="Your academic performance at a glance"
        icon={GraduationCap}
      >
        <div className="flex items-center gap-4">
          <div className="flex h-[86px] w-[86px] shrink-0 flex-col items-center justify-center rounded-3xl border border-white/20 bg-white/12 backdrop-blur-sm">
            <span className="font-heading text-[26px] font-black leading-none tabular-nums">
              {avgPct.toFixed(0)}<span className="text-[14px]">%</span>
            </span>
            <span className="mt-1 text-[9.5px] font-semibold uppercase tracking-wider text-white/70">
              Average
            </span>
          </div>
          <div className="min-w-0 flex-1 space-y-1.5">
            <p className="font-heading text-[17px] font-bold leading-tight">
              CGPA {enriched.length ? cgpa : "—"}
            </p>
            <p className="text-[12px] text-white/80">
              {results.length} {results.length === 1 ? "exam" : "exams"} recorded
            </p>
            <div className="flex gap-2 pt-0.5">
              <span className="rounded-full border border-white/20 bg-white/12 px-2.5 py-1 text-[10.5px] font-semibold">
                {passedCount} passed
              </span>
              <span className="rounded-full border border-white/20 bg-white/12 px-2.5 py-1 text-[10.5px] font-semibold">
                {topCount} top grade
              </span>
            </div>
          </div>
        </div>
      </ModuleHero>

      <HeroOverlap>
        <div className="space-y-5">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-24 rounded-[20px]" />
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-[20px]" />
              ))}
            </div>
          ) : enriched.length === 0 ? (
            <PremiumEmpty
              art="results"
              tone="primary"
              title="No results published yet"
              description="When your faculty publishes exam marks, your scores, trends and grade breakdown will show up here."
              hint="Results usually appear a few days after each exam"
            />
          ) : (
            <>
              {/* Pass / fail summary */}
              <section className="grid grid-cols-3 gap-2.5">
                {[
                  { label: "Passed", value: passedCount, tone: "text-success", icon: TrendingUp },
                  { label: "Below 60", value: failedCount, tone: "text-danger", icon: BookOpen },
                  { label: "Top grade", value: topCount, tone: "text-warning", icon: Trophy },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="rounded-2xl border border-border-subtle bg-card px-3 py-3 shadow-[0_12px_30px_-20px_hsl(var(--foreground)/0.4)]"
                  >
                    <s.icon className={cn("h-4 w-4", s.tone)} />
                    <p className="mt-1.5 font-heading text-[20px] font-black leading-none tabular-nums text-foreground">
                      {s.value}
                    </p>
                    <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {s.label}
                    </p>
                  </div>
                ))}
              </section>

              {/* Performance trend */}
              {trend.length > 1 && (
                <section className="space-y-2">
                  <GroupTitle title="Performance trend" hint="Recent exams" />
                  <Panel>
                    <div className="flex items-end justify-between gap-1.5">
                      {trend.map((t, i) => (
                        <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                          <span className="text-[10px] font-semibold tabular-nums text-muted-foreground">
                            {t.pct}
                          </span>
                          <div className="flex h-[76px] w-full items-end overflow-hidden rounded-lg bg-surface-3">
                            <motion.div
                              initial={{ height: 0 }}
                              animate={{ height: `${Math.max(t.pct, 6)}%` }}
                              transition={{ duration: 0.45, delay: i * 0.04, ease: [0, 0, 0.2, 1] }}
                              className={cn("w-full rounded-lg", gradeTone(t.pct).bg)}
                            />
                          </div>
                          <span className="w-full truncate text-center text-[9.5px] uppercase text-muted-foreground/70">
                            {t.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </Panel>
                </section>
              )}

              {/* Grade distribution */}
              <section className="space-y-2">
                <GroupTitle title="Grade distribution" />
                <Panel className="space-y-2.5">
                  {distribution.map((d) => {
                    const pct = enriched.length ? (d.count / enriched.length) * 100 : 0;
                    return (
                      <div key={d.label} className="flex items-center gap-3">
                        <span className="w-4 font-heading text-[12px] font-bold text-muted-foreground">{d.label}</span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-3">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.5, ease: [0, 0, 0.2, 1] }}
                            className={cn("h-full rounded-full", d.tone)}
                          />
                        </div>
                        <span className="w-5 text-right text-[11px] font-semibold tabular-nums text-muted-foreground">
                          {d.count}
                        </span>
                      </div>
                    );
                  })}
                </Panel>
              </section>

              {/* Top subjects */}
              {topSubjects.length > 0 && (
                <section className="space-y-2">
                  <GroupTitle title="Top scoring" hint="Best 3" />
                  <div className="grid grid-cols-3 gap-2.5">
                    {topSubjects.map((r, i) => (
                      <div
                        key={r.id}
                        className="rounded-2xl border border-border-subtle bg-surface-1 p-3 text-center shadow-[0_12px_30px_-22px_hsl(var(--foreground)/0.45)]"
                      >
                        <span className="text-[15px]">{["🥇", "🥈", "🥉"][i]}</span>
                        <p className="mt-1 truncate text-[11px] font-semibold text-foreground">
                          {r.exams?.subject ?? "Subject"}
                        </p>
                        <p className={cn("mt-0.5 font-heading text-[15px] font-black tabular-nums", gradeTone(r.pct).text)}>
                          {r.pct}%
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* All results */}
              <section className="space-y-2.5">
                <GroupTitle title="All results" hint={`${enriched.length} total`} />
                <SegmentedFilter
                  value={filter}
                  onChange={(v) => setFilter(v as Filter)}
                  options={[
                    { value: "all", label: "All", count: enriched.length },
                    { value: "passed", label: "Passed", count: passedCount },
                    { value: "top", label: "Top", count: topCount },
                  ]}
                />

                {filtered.length === 0 ? (
                  <PremiumEmpty
                    art="results"
                    compact
                    title="Nothing in this filter"
                    description="Try switching back to “All” to see every published result."
                  />
                ) : (
                  <div className="space-y-2.5">
                    {filtered.map((r, i) => {
                      const tone = gradeTone(r.pct);
                      return (
                        <motion.article
                          key={r.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2, delay: Math.min(i * 0.03, 0.2) }}
                          className="rounded-[20px] border border-border-subtle bg-surface-1 p-4 shadow-[0_16px_38px_-30px_hsl(var(--foreground)/0.55)] transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-elevated"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-heading text-[14px] font-bold text-foreground">
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
                              <p className={cn("font-heading text-[20px] font-black tabular-nums leading-none", tone.text)}>
                                {r.marks_obtained}
                                <span className="text-sm text-muted-foreground">/{r.max}</span>
                              </p>
                              <p className={cn("mt-1 text-[11px] font-semibold", tone.text)}>{r.pct}%</p>
                            </div>
                          </div>
                          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-3">
                            <div className={cn("h-full rounded-full transition-[width] duration-500", tone.bg)} style={{ width: `${r.pct}%` }} />
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
                        </motion.article>
                      );
                    })}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </HeroOverlap>
    </PageContainer>
  );
}
