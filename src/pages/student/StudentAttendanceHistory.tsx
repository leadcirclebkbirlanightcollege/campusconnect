import { useCallback, useMemo, useState } from "react";
import {
  useInfiniteQuery,
  useQuery,
} from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  CalendarCheck,
  ChartLine,
  Clock3,
  Download,
  Loader2,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  UserX,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useGrowthInsights } from "@/hooks/use-growth-insights";
import { cn } from "@/lib/utils";
import { QueryErrorState } from "@/components/ui/QueryErrorState";

import { PageContainer } from "@/layout/PageContainer";
import { PageHeader } from "@/layout/PageHeader";
import { ModuleHero, HeroOverlap } from "@/layout/ModuleHero";
import { PullToRefresh } from "@/components/mobile/PullToRefresh";
import { PageSkeleton } from "@/components/skeleton/PageSkeleton";
import { PremiumEmpty } from "@/components/ui/premium-empty";
import { GlowButton } from "@/components/ui/GlowButton";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  SECTION_REVEAL_ITEM,
  SECTION_REVEAL_PARENT,
} from "@/motion/microInteractions";

const PAGE_SIZE = 20;
const THRESHOLD = 0.75;

type AttendanceHistoryRow = {
  id: string;
  lecture_id: string;
  status: string;
  marked_at: string;
  points_earned: number;
  lectures: {
    topic: string;
    lecture_date: string;
    start_time: string;
    venue: string;
  } | null;
};

function getStatusTone(status: string): "active" | "completed" | "upcoming" {
  const normalized = status.toLowerCase();
  if (normalized === "present") return "active";
  if (normalized === "late") return "upcoming";
  return "completed";
}

function getStatusLabel(status: string): string {
  const normalized = status.toLowerCase();
  if (normalized === "present") return "Present";
  if (normalized === "late") return "Late";
  return "Absent";
}

function formatDateTime(value: string) {
  const date = new Date(value);
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Small card shell used across this analytics dashboard. */
function Panel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
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
      <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground/70">
        {title}
      </h2>
      {hint && <span className="text-[10.5px] text-muted-foreground/55">{hint}</span>}
    </div>
  );
}

export default function StudentAttendanceHistory() {
  const [exporting, setExporting] = useState(false);
  const growth = useGrowthInsights();

  const userQuery = useQuery({
    queryKey: ["student", "auth-user-id"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user?.id ?? null;
    },
    staleTime: 60_000,
  });

  const userId = userQuery.data;

  const totalsQuery = useQuery({
    queryKey: ["student", "attendance", "totals", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const [
        { count: total },
        { count: present },
        { count: late },
      ] = await Promise.all([
        supabase
          .from("attendance")
          .select("id", { count: "exact", head: true })
          .eq("student_user_id", userId)
          .in("status", ["present", "absent", "late"]),
        supabase
          .from("attendance")
          .select("id", { count: "exact", head: true })
          .eq("student_user_id", userId)
          .eq("status", "present"),
        supabase
          .from("attendance")
          .select("id", { count: "exact", head: true })
          .eq("student_user_id", userId)
          .eq("status", "late"),
      ]);

      const totalCount = total ?? 0;
      const presentCount = present ?? 0;
      const lateCount = late ?? 0;
      const attendedCount = presentCount + lateCount;
      const missedCount = Math.max(0, totalCount - attendedCount);
      const percentage = totalCount > 0 ? Math.round((attendedCount / totalCount) * 100) : 0;

      return {
        totalCount,
        attendedCount,
        missedCount,
        lateCount,
        percentage,
      };
    },
    staleTime: 45_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const historyQuery = useInfiniteQuery({
    queryKey: ["student", "attendance", "history", userId],
    enabled: Boolean(userId),
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const start = Number(pageParam);
      const end = start + PAGE_SIZE - 1;

      const { data, error } = await supabase
        .from("attendance")
        .select(
          "id,lecture_id,status,marked_at,points_earned,lectures(topic,lecture_date,start_time,venue)",
        )
        .eq("student_user_id", userId)
        .order("marked_at", { ascending: false })
        .range(start, end);

      if (error) throw error;
      return (data ?? []) as AttendanceHistoryRow[];
    },
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length < PAGE_SIZE ? undefined : allPages.length * PAGE_SIZE,
    staleTime: 45_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const timelineRows = useMemo(
    () => historyQuery.data?.pages.flatMap((page) => page) ?? [],
    [historyQuery.data],
  );

  const handlePullRefresh = useCallback(async () => {
    await Promise.all([
      totalsQuery.refetch(),
      historyQuery.refetch(),
      growth.refetch(),
    ]);
  }, [growth, historyQuery, totalsQuery]);

  const handleExportCSV = useCallback(async () => {
    if (!userId) return;
    setExporting(true);
    try {
      const { data, error } = await supabase
        .from("attendance")
        .select("status,marked_at,points_earned,lectures(topic,lecture_date,start_time,venue)")
        .eq("student_user_id", userId)
        .order("marked_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      const headers = ["Lecture", "Date", "Time", "Venue", "Status", "Points", "Marked At"];
      const rows = (data ?? []).map((r: any) => [
        r.lectures?.topic ?? "",
        r.lectures?.lecture_date ?? "",
        r.lectures?.start_time ?? "",
        r.lectures?.venue ?? "",
        r.status ?? "",
        r.points_earned ?? 0,
        r.marked_at ? new Date(r.marked_at).toLocaleString() : "",
      ]);
      const csv = [headers.join(","), ...rows.map(r => r.map((v: any) => `"${String(v).replace(/"/g, '""')}"`).join(","))].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `my-attendance-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Attendance exported!");
    } catch (e: any) {
      toast.error("Export failed");
    } finally {
      setExporting(false);
    }
  }, [userId]);

  /* ── Derived analytics (presentation only) ─────────────────── */

  const attended = (s: string) => s === "present" || s === "late";

  const subjects = useMemo(() => {
    const map = new Map<string, { total: number; present: number }>();
    for (const row of timelineRows) {
      const key = row.lectures?.topic?.trim() || "General";
      const entry = map.get(key) ?? { total: 0, present: 0 };
      entry.total += 1;
      if (attended(row.status.toLowerCase())) entry.present += 1;
      map.set(key, entry);
    }
    return [...map.entries()]
      .map(([name, v]) => ({ name, ...v, pct: Math.round((v.present / v.total) * 100) }))
      .sort((a, b) => a.pct - b.pct)
      .slice(0, 6);
  }, [timelineRows]);

  const weekly = useMemo(() => {
    const buckets: { label: string; total: number; present: number }[] = [];
    const now = new Date();
    for (let w = 5; w >= 0; w--) {
      const end = new Date(now);
      end.setDate(now.getDate() - w * 7);
      const start = new Date(end);
      start.setDate(end.getDate() - 6);
      const rows = timelineRows.filter((r) => {
        const d = new Date(r.marked_at);
        return d >= start && d <= end;
      });
      buckets.push({
        label: w === 0 ? "Now" : `-${w}w`,
        total: rows.length,
        present: rows.filter((r) => attended(r.status.toLowerCase())).length,
      });
    }
    return buckets;
  }, [timelineRows]);

  const totals = totalsQuery.data;

  const needed = useMemo(() => {
    if (!totals || totals.totalCount === 0) return 0;
    const { totalCount, attendedCount } = totals;
    if (attendedCount / totalCount >= THRESHOLD) return 0;
    // (A + n) / (T + n) >= 0.75  →  n >= (0.75T - A) / 0.25
    return Math.ceil((THRESHOLD * totalCount - attendedCount) / (1 - THRESHOLD));
  }, [totals]);

  const canSkip = useMemo(() => {
    if (!totals || totals.totalCount === 0) return 0;
    const { totalCount, attendedCount } = totals;
    // A / (T + n) >= 0.75  →  n <= A/0.75 - T
    return Math.max(0, Math.floor(attendedCount / THRESHOLD - totalCount));
  }, [totals]);

  const isInitialLoading =
    userQuery.isLoading ||
    (totalsQuery.isLoading && !totals) ||
    (historyQuery.isLoading && timelineRows.length === 0);

  if (isInitialLoading) {
    return (
      <PageContainer>
        <PageSkeleton variant="dashboard" className="px-0" />
      </PageContainer>
    );
  }

  if (!userId || totalsQuery.isError || historyQuery.isError) {
    return (
      <PageContainer className="space-y-6">
        <PageHeader
          title="Attendance"
          subtitle="Unable to load attendance right now"
          variant="large"
        />
        <QueryErrorState
          onRetry={() => { totalsQuery.refetch(); historyQuery.refetch(); }}
          isRetrying={totalsQuery.isFetching || historyQuery.isFetching}
          error={(totalsQuery.error ?? historyQuery.error) as Error}
        />
      </PageContainer>
    );
  }

  const trendDirection = growth.data?.trend_direction ?? "stable";
  const trendLabel =
    trendDirection === "improving"
      ? "Improving"
      : trendDirection === "declining"
        ? "Declining"
        : "Stable";

  const trendIcon =
    trendDirection === "improving"
      ? TrendingUp
      : trendDirection === "declining"
        ? TrendingDown
        : CalendarCheck;

  const risk =
    totals.percentage >= 75
      ? { tone: "success" as const, label: "Safe", copy: "You are above the 75% requirement. Keep this consistency." }
      : totals.percentage >= 65
        ? { tone: "warning" as const, label: "At risk", copy: "You are close to the threshold. Attend the next few lectures." }
        : { tone: "danger" as const, label: "Critical", copy: "Missing another lecture will pull you further below 75%." };

  const RISK_STYLE = {
    success: { chip: "bg-success/12 text-success", bar: "bg-success", ring: "border-success/25" },
    warning: { chip: "bg-warning/12 text-warning", bar: "bg-warning", ring: "border-warning/25" },
    danger: { chip: "bg-danger/12 text-danger", bar: "bg-danger", ring: "border-danger/25" },
  }[risk.tone];

  const insights = [
    { icon: risk.tone === "success" ? TrendingUp : risk.tone === "warning" ? AlertTriangle : UserX, title: risk.tone === "success" ? "Healthy attendance" : risk.tone === "warning" ? "Close to threshold" : "High attendance risk", text: risk.copy, tone: risk.tone },
    trendDirection === "improving"
      ? { icon: Sparkles, title: "Weekly momentum", text: "Your attendance improved this week. Continue this pace.", tone: "primary" as const }
      : trendDirection === "declining"
        ? { icon: TrendingDown, title: "Trend alert", text: "Your weekly attendance is declining. Prioritize upcoming classes.", tone: "warning" as const }
        : { icon: CalendarCheck, title: "Consistent pattern", text: "Your attendance trend is stable. Push for a higher streak.", tone: "primary" as const },
  ];

  const hasData = totals.totalCount > 0;

  return (
    <PullToRefresh onRefresh={handlePullRefresh}>
      <PageContainer className="pb-24" noPadding withBottomNav>
        <ModuleHero
          tone="academics"
          eyebrow="Academics"
          title="Attendance"
          subtitle="Your attendance health, trends and forecast"
          action={
            <button
              onClick={handleExportCSV}
              disabled={exporting}
              className="flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/12 px-2.5 py-1.5 text-[11px] font-semibold text-white backdrop-blur-sm transition active:scale-95"
            >
              {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              Export
            </button>
          }
        >
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-white/15 p-1.5 ring-1 ring-white/25 backdrop-blur">
              <ProgressRing value={totals.percentage} size={92} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-heading text-[38px] font-black leading-none tabular-nums">
                {totals.percentage}%
              </p>
              <p className="mt-1.5 text-[12px] text-white/80">
                {totals.attendedCount} of {totals.totalCount} lectures attended
              </p>
              <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/12 px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wider">
                {risk.label}
              </span>
            </div>
          </div>
        </ModuleHero>

        <HeroOverlap>
          <motion.div variants={SECTION_REVEAL_PARENT} initial="hidden" animate="show" className="space-y-5">
            {/* Stat trio */}
            <motion.div variants={SECTION_REVEAL_ITEM} className="grid grid-cols-3 gap-2.5">
              {[
                { icon: CalendarCheck, label: "Attended", value: totals.attendedCount, tone: "text-success" },
                { icon: UserX, label: "Missed", value: totals.missedCount, tone: "text-danger" },
                { icon: trendIcon, label: "Trend", value: trendLabel, tone: "text-primary", isText: true },
              ].map((s, i) => {
                const Icon = s.icon as any;
                return (
                  <div
                    key={i}
                    className="rounded-2xl border border-border-subtle bg-card px-3 py-3 shadow-[0_12px_30px_-20px_hsl(var(--foreground)/0.4)]"
                  >
                    <Icon className={cn("h-4 w-4", s.tone)} />
                    <p className={cn("mt-1.5 font-heading font-black tabular-nums leading-none text-foreground", s.isText ? "text-[14px]" : "text-[20px]")}>
                      {s.value}
                    </p>
                    <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{s.label}</p>
                  </div>
                );
              })}
            </motion.div>

            {!hasData ? (
              <motion.div variants={SECTION_REVEAL_ITEM}>
                <PremiumEmpty
                  art="attendance"
                  tone="primary"
                  title="No attendance yet"
                  description="Once you mark your first lecture, your percentage, trends and forecast will appear here."
                  hint="Tip: scan the lecture QR to mark yourself present"
                  action={{ label: "Scan attendance", href: "/app/scan" }}
                />
              </motion.div>
            ) : (
              <>
                {/* Risk + 75% calculator */}
                <motion.section variants={SECTION_REVEAL_ITEM} className="space-y-2">
                  <GroupTitle title="Requirement" hint="75% minimum" />
                  <Panel className={cn("space-y-3", RISK_STYLE.ring)}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl", RISK_STYLE.chip)}>
                          <Target className="h-4 w-4" />
                        </span>
                        <div>
                          <p className="font-heading text-[13.5px] font-bold text-foreground">
                            {needed > 0 ? `${needed} lecture${needed === 1 ? "" : "s"} to reach 75%` : "Requirement met"}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {needed > 0
                              ? "Attend these consecutively without a miss."
                              : `You can miss ${canSkip} more lecture${canSkip === 1 ? "" : "s"} and stay safe.`}
                          </p>
                        </div>
                      </div>
                      <span className={cn("rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider", RISK_STYLE.chip)}>
                        {risk.label}
                      </span>
                    </div>

                    <div className="relative h-2 overflow-hidden rounded-full bg-surface-3">
                      <div
                        className={cn("h-full rounded-full transition-[width] duration-500", RISK_STYLE.bar)}
                        style={{ width: `${Math.min(100, totals.percentage)}%` }}
                      />
                      <span className="absolute inset-y-0 left-[75%] w-px bg-foreground/40" />
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>0%</span>
                      <span>75% required</span>
                      <span>100%</span>
                    </div>
                  </Panel>
                </motion.section>

                {/* Weekly trend */}
                <motion.section variants={SECTION_REVEAL_ITEM} className="space-y-2">
                  <GroupTitle title="Trend" hint="Last 6 weeks" />
                  <Panel>
                    <div className="flex items-end justify-between gap-2">
                      {weekly.map((w) => {
                        const pct = w.total ? Math.round((w.present / w.total) * 100) : 0;
                        return (
                          <div key={w.label} className="flex flex-1 flex-col items-center gap-1.5">
                            <span className="text-[10px] font-semibold tabular-nums text-muted-foreground">
                              {w.total ? `${pct}%` : "–"}
                            </span>
                            <div className="flex h-[72px] w-full items-end overflow-hidden rounded-lg bg-surface-3">
                              <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: `${Math.max(pct, w.total ? 6 : 0)}%` }}
                                transition={{ duration: 0.45, ease: [0, 0, 0.2, 1] }}
                                className={cn(
                                  "w-full rounded-lg",
                                  pct >= 75 ? "bg-success" : pct >= 60 ? "bg-warning" : "bg-danger",
                                )}
                              />
                            </div>
                            <span className="text-[10px] text-muted-foreground/70">{w.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </Panel>
                </motion.section>

                {/* Subject-wise */}
                {subjects.length > 0 && (
                  <motion.section variants={SECTION_REVEAL_ITEM} className="space-y-2">
                    <GroupTitle title="Subject-wise" hint="Lowest first" />
                    <div className="space-y-2.5">
                      {subjects.map((s) => (
                        <Panel key={s.name} className="py-3">
                          <div className="flex items-center justify-between gap-3">
                            <p className="min-w-0 flex-1 truncate font-heading text-[13px] font-bold text-foreground">
                              {s.name}
                            </p>
                            <span
                              className={cn(
                                "shrink-0 text-[13px] font-black tabular-nums",
                                s.pct >= 75 ? "text-success" : s.pct >= 60 ? "text-warning" : "text-danger",
                              )}
                            >
                              {s.pct}%
                            </span>
                          </div>
                          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-3">
                            <div
                              className={cn(
                                "h-full rounded-full transition-[width] duration-500",
                                s.pct >= 75 ? "bg-success" : s.pct >= 60 ? "bg-warning" : "bg-danger",
                              )}
                              style={{ width: `${s.pct}%` }}
                            />
                          </div>
                          <p className="mt-1.5 text-[10.5px] text-muted-foreground">
                            {s.present} of {s.total} attended
                          </p>
                        </Panel>
                      ))}
                    </div>
                  </motion.section>
                )}

                {/* Insights */}
                <motion.section variants={SECTION_REVEAL_ITEM} className="space-y-2">
                  <GroupTitle title="Insights" hint="Personalised" />
                  <div className="space-y-2.5">
                    {insights.map((insight, idx) => (
                      <Panel key={`${insight.title}-${idx}`} className="flex items-start gap-3">
                        <div
                          className={cn(
                            "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                            insight.tone === "success" && "bg-success/12 text-success",
                            insight.tone === "warning" && "bg-warning/12 text-warning",
                            insight.tone === "danger" && "bg-danger/12 text-danger",
                            insight.tone === "primary" && "bg-primary/12 text-primary",
                          )}
                        >
                          <insight.icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-heading text-[13px] font-bold text-foreground">{insight.title}</p>
                          <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">{insight.text}</p>
                        </div>
                      </Panel>
                    ))}
                  </div>
                </motion.section>

                {/* Timeline */}
                <motion.section variants={SECTION_REVEAL_ITEM} className="space-y-2">
                  <GroupTitle title="Recent lectures" hint={`${timelineRows.length} records`} />
                  {timelineRows.length === 0 ? (
                    <PremiumEmpty
                      art="attendance"
                      compact
                      title="Nothing marked yet"
                      description="Your lecture-by-lecture history will appear here."
                    />
                  ) : (
                    <div className="overflow-hidden rounded-[20px] border border-border-subtle bg-surface-1 shadow-[0_16px_38px_-30px_hsl(var(--foreground)/0.55)]">
                      {timelineRows.map((row, index) => (
                        <motion.div
                          key={row.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.18, delay: Math.min(index * 0.02, 0.16) }}
                          className={cn(
                            "flex items-center gap-3 px-3.5 py-3",
                            index !== timelineRows.length - 1 && "border-b border-border-subtle/60",
                          )}
                        >
                          <span
                            className={cn(
                              "h-8 w-1 shrink-0 rounded-full",
                              row.status.toLowerCase() === "present"
                                ? "bg-success"
                                : row.status.toLowerCase() === "late"
                                  ? "bg-warning"
                                  : "bg-danger",
                            )}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-heading text-[13px] font-bold text-foreground">
                              {row.lectures?.topic ?? "Lecture"}
                            </p>
                            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                              {formatDateTime(row.marked_at)} · {row.lectures?.venue ?? "Venue TBA"}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <StatusBadge
                              status={getStatusTone(row.status)}
                              className={cn(
                                row.status.toLowerCase() === "absent" &&
                                  "border-danger/30 bg-danger/12 text-danger",
                              )}
                            >
                              {getStatusLabel(row.status)}
                            </StatusBadge>
                            <p className="mt-1 text-[10px] tabular-nums text-muted-foreground">
                              {row.points_earned > 0 ? `+${row.points_earned} pts` : "0 pts"}
                            </p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}

                  {historyQuery.hasNextPage && (
                    <GlowButton
                      onClick={() => historyQuery.fetchNextPage()}
                      disabled={historyQuery.isFetchingNextPage}
                      className="w-full"
                    >
                      {historyQuery.isFetchingNextPage ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading more
                        </>
                      ) : (
                        <>
                          <Clock3 className="h-4 w-4" />
                          Load more history
                        </>
                      )}
                    </GlowButton>
                  )}
                </motion.section>
              </>
            )}
          </motion.div>
        </HeroOverlap>
      </PageContainer>
    </PullToRefresh>
  );
}
