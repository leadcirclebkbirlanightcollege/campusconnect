import { useCallback, useMemo, useState } from "react";
import {
  useInfiniteQuery,
  useQuery,
} from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  BookOpen,
  CalendarCheck,
  Clock3,
  Download,
  Loader2,
  Sparkles,
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
import { PullToRefresh } from "@/components/mobile/PullToRefresh";
import { PageSkeleton } from "@/components/skeleton/PageSkeleton";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlowButton } from "@/components/ui/GlowButton";
import { MetricCard } from "@/components/ui/MetricCard";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  SECTION_REVEAL_ITEM,
  SECTION_REVEAL_PARENT,
} from "@/motion/microInteractions";

const PAGE_SIZE = 20;

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

  const totals = totalsQuery.data;
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

  const insights = [
    totals.percentage >= 75
      ? {
          icon: TrendingUp,
          title: "Healthy attendance",
          text: "You are above the 75% requirement. Keep this consistency.",
          tone: "success",
        }
      : totals.percentage >= 65
        ? {
            icon: AlertTriangle,
            title: "Close to threshold",
            text: "Attend upcoming lectures to secure the 75% requirement.",
            tone: "warning",
          }
        : {
            icon: UserX,
            title: "High attendance risk",
            text: "Missing the next lecture can significantly reduce your percentage.",
            tone: "danger",
          },
    trendDirection === "improving"
      ? {
          icon: Sparkles,
          title: "Weekly momentum",
          text: "Your attendance improved this week. Continue this pace.",
          tone: "primary",
        }
      : trendDirection === "declining"
        ? {
            icon: TrendingDown,
            title: "Trend alert",
            text: "Your weekly attendance is declining. Prioritize upcoming classes.",
            tone: "warning",
          }
        : {
            icon: CalendarCheck,
            title: "Consistent pattern",
            text: "Your attendance trend is stable. Push for a higher streak.",
            tone: "primary",
          },
  ] as const;

  return (
    <PullToRefresh onRefresh={handlePullRefresh}>
      <PageContainer className="space-y-6" withBottomNav>
        <PageHeader
          title="Attendance"
          subtitle="Track your attendance health"
          variant="large"
          gradient
          action={
            <button
              onClick={handleExportCSV}
              disabled={exporting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-2 border border-border-subtle text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-surface-3 transition-all touch-card"
            >
              {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              Export
            </button>
          }
        />

        <motion.div variants={SECTION_REVEAL_PARENT} initial="hidden" animate="show" className="space-y-6">
          <motion.section variants={SECTION_REVEAL_ITEM} className="space-y-3">
            <SectionHeader title="Attendance Overview" subtitle="Performance at a glance" />
            <GlassCard padding="lg" className="space-y-4" elevation="high">
              <div className="grid grid-cols-2 gap-3">
                <MetricCard icon={CalendarCheck} value={totals.attendedCount} label="Attended" />
                <MetricCard icon={BookOpen} value={totals.totalCount} label="Conducted" />
              </div>
              <MetricCard icon={TrendingUp} value={totals.percentage} suffix="%" label="Attendance" />
            </GlassCard>
          </motion.section>

          <motion.section variants={SECTION_REVEAL_ITEM} className="space-y-3">
            <SectionHeader title="Attendance Ring" subtitle="Visual attendance health" />
            <GlassCard className="flex items-center justify-center" padding="lg">
              <div className="flex flex-col items-center gap-3">
                <ProgressRing value={totals.percentage} size={120} />
                <p className="text-sm font-semibold text-foreground">{totals.percentage}% overall attendance</p>
              </div>
            </GlassCard>
          </motion.section>

          <motion.section variants={SECTION_REVEAL_ITEM} className="space-y-3">
            <SectionHeader title="Summary Metrics" subtitle="Academic attendance breakdown" />
            <div className="grid grid-cols-2 gap-3">
              <MetricCard icon={CalendarCheck} value={totals.attendedCount} label="Lectures Attended" />
              <MetricCard icon={UserX} value={totals.missedCount} label="Lectures Missed" />
              <MetricCard icon={BookOpen} value={totals.percentage} suffix="%" label="Attendance %" />
              <GlassCard className="flex flex-col justify-between" padding="md">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Trend</p>
                  {(() => {
                    const TrendIcon = trendIcon;
                    return <TrendIcon className="h-4 w-4 text-primary" />;
                  })()}
                </div>
                <p className="text-2xl font-black text-foreground">{trendLabel}</p>
                <StatusBadge status={trendDirection === "declining" ? "upcoming" : "active"}>
                  {trendLabel}
                </StatusBadge>
              </GlassCard>
            </div>
          </motion.section>

          <motion.section variants={SECTION_REVEAL_ITEM} className="space-y-3">
            <SectionHeader title="Lecture Timeline" subtitle="Latest attendance records" />
            <div className="space-y-3">
              {timelineRows.length === 0 ? (
                <GlassCard>
                  <p className="text-sm text-muted-foreground">No attendance records yet.</p>
                </GlassCard>
              ) : (
                timelineRows.map((row, index) => (
                  <motion.div
                    key={row.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18, delay: Math.min(index * 0.03, 0.18) }}
                  >
                    <GlassCard className="space-y-3" hover={false}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {row.lectures?.topic ?? "Lecture"}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {formatDateTime(row.marked_at)}
                          </p>
                        </div>
                        <StatusBadge
                          status={getStatusTone(row.status)}
                          className={cn(
                            row.status.toLowerCase() === "absent" &&
                              "border-danger/30 bg-danger/12 text-danger",
                          )}
                        >
                          {getStatusLabel(row.status)}
                        </StatusBadge>
                      </div>

                      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                        <span className="truncate">{row.lectures?.venue ?? "Venue TBA"}</span>
                        <span className="tabular-nums">{row.points_earned > 0 ? `+${row.points_earned} pts` : "0 pts"}</span>
                      </div>
                    </GlassCard>
                  </motion.div>
                ))
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
            </div>
          </motion.section>

          <motion.section variants={SECTION_REVEAL_ITEM} className="space-y-3">
            <SectionHeader title="Attendance Insights" subtitle="Personalized guidance" />
            <div className="space-y-3">
              {insights.map((insight, idx) => (
                <GlassCard key={`${insight.title}-${idx}`} className="flex items-start gap-3" hover={false}>
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
                    <p className="text-sm font-semibold text-foreground">{insight.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{insight.text}</p>
                  </div>
                </GlassCard>
              ))}
            </div>
          </motion.section>
        </motion.div>
      </PageContainer>
    </PullToRefresh>
  );
}
