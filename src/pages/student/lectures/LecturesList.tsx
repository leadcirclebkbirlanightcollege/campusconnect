import { useCallback, useMemo } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { BookOpen, Clock3, Radio, TrendingUp } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useLiveLecture } from "@/hooks/use-live-lecture";
import { useGrowthInsights } from "@/hooks/use-growth-insights";

import { PageContainer } from "@/layout/PageContainer";
import { PageHeader } from "@/layout/PageHeader";
import { PullToRefresh } from "@/components/mobile/PullToRefresh";
import { PageSkeleton } from "@/components/skeleton/PageSkeleton";
import { GlassCard } from "@/components/ui/GlassCard";
import { MetricCard } from "@/components/ui/MetricCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import {
  SECTION_REVEAL_ITEM,
  SECTION_REVEAL_PARENT,
} from "@/motion/microInteractions";

import { LectureCalendarPreview } from "./components/LectureCalendarPreview";
import { LectureHistorySection } from "./components/LectureHistorySection";
import { LectureInsightsPanel } from "./components/LectureInsightsPanel";
import { LectureLiveBanner } from "./components/LectureLiveBanner";
import { UpcomingLecturesSection } from "./components/UpcomingLecturesSection";
import type { HistoryLectureRecord, LectureRecord } from "./types";

const HISTORY_PAGE_SIZE = 10;

type ProgrammeFilter = {
  allottedProgrammeIds: Set<string>;
  lectureProgrammeMap: Map<string, string>;
};

function applyProgrammeFilter(lectures: LectureRecord[], filter: ProgrammeFilter | undefined) {
  if (!filter) return lectures;

  return lectures.filter((lecture) => {
    const taggedProgramme = filter.lectureProgrammeMap.get(lecture.id);
    if (!taggedProgramme) return true;
    return filter.allottedProgrammeIds.has(taggedProgramme);
  });
}

export default function LecturesList() {
  const liveLectureQuery = useLiveLecture();
  const growthQuery = useGrowthInsights();

  const userQuery = useQuery({
    queryKey: ["student", "auth-user-id"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user?.id ?? null;
    },
    staleTime: 60_000,
  });

  const userId = userQuery.data;

  const programmeFilterQuery = useQuery({
    queryKey: ["student", "lectures", "programme-filter", userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<ProgrammeFilter> => {
      const [{ data: allotments }, { data: tags }] = await Promise.all([
        supabase
          .from("student_programme_allotments")
          .select("programme_id")
          .eq("student_user_id", userId),
        supabase
          .from("lecture_programme_tags")
          .select("lecture_id,programme_id"),
      ]);

      return {
        allottedProgrammeIds: new Set((allotments ?? []).map((item) => item.programme_id)),
        lectureProgrammeMap: new Map((tags ?? []).map((item) => [item.lecture_id, item.programme_id])),
      };
    },
    staleTime: 120_000,
    gcTime: 10 * 60_000,
  });

  const upcomingQuery = useQuery({
    queryKey: ["student", "lectures", "upcoming", userId],
    enabled: !userQuery.isLoading,
    queryFn: async (): Promise<LectureRecord[]> => {
      const today = new Date().toISOString().slice(0, 10);

      const { data, error } = await supabase
        .from("lectures")
        .select("id,topic,lecture_date,start_time,end_time,venue,status")
        .gte("lecture_date", today)
        .in("status", ["scheduled", "live"])
        .order("lecture_date", { ascending: true })
        .order("start_time", { ascending: true })
        .limit(12);

      if (error) throw error;
      return applyProgrammeFilter((data ?? []) as LectureRecord[], programmeFilterQuery.data);
    },
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const historyQuery = useInfiniteQuery({
    queryKey: ["student", "lectures", "history", userId],
    enabled: !userQuery.isLoading,
    initialPageParam: 0,
    queryFn: async ({ pageParam }): Promise<HistoryLectureRecord[]> => {
      const today = new Date().toISOString().slice(0, 10);
      const start = Number(pageParam);
      const end = start + HISTORY_PAGE_SIZE - 1;

      const { data: historyRows, error: historyError } = await supabase
        .from("lectures")
        .select("id,topic,lecture_date,start_time,end_time,venue,status")
        .lt("lecture_date", today)
        .order("lecture_date", { ascending: false })
        .order("start_time", { ascending: false })
        .range(start, end);

      if (historyError) throw historyError;

      const filteredRows = applyProgrammeFilter((historyRows ?? []) as LectureRecord[], programmeFilterQuery.data);
      if (!filteredRows.length || !userId) {
        return filteredRows.map((row) => ({ ...row, attendance_status: "missed" }));
      }

      const { data: attendanceRows } = await supabase
        .from("attendance")
        .select("lecture_id,status")
        .eq("student_user_id", userId)
        .in("lecture_id", filteredRows.map((row) => row.id));

      const attendanceMap = new Map((attendanceRows ?? []).map((row) => [row.lecture_id, row.status]));

      return filteredRows.map((row) => {
        const status = (attendanceMap.get(row.id) ?? "absent").toLowerCase();

        if (status === "present") {
          return { ...row, attendance_status: "attended" as const };
        }

        if (status === "late") {
          return { ...row, attendance_status: "late" as const };
        }

        return { ...row, attendance_status: "missed" as const };
      });
    },
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length < HISTORY_PAGE_SIZE ? undefined : allPages.length * HISTORY_PAGE_SIZE,
    staleTime: 45_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const historyRows = useMemo(
    () => historyQuery.data?.pages.flatMap((page) => page) ?? [],
    [historyQuery.data],
  );

  const attendanceRate = useMemo(() => {
    if (historyRows.length === 0) return 0;
    const attended = historyRows.filter((row) => row.attendance_status !== "missed").length;
    return Math.round((attended / historyRows.length) * 100);
  }, [historyRows]);

  const handlePullRefresh = useCallback(async () => {
    await Promise.all([
      liveLectureQuery.refetch(),
      growthQuery.refetch(),
      programmeFilterQuery.refetch(),
      upcomingQuery.refetch(),
      historyQuery.refetch(),
    ]);
  }, [growthQuery, historyQuery, liveLectureQuery, programmeFilterQuery, upcomingQuery]);

  const recentMissed = historyRows[0]?.attendance_status === "missed";
  const trendDirection = (growthQuery.data?.trend_direction ?? "stable") as
    | "improving"
    | "declining"
    | "stable";

  const isInitialLoading =
    userQuery.isLoading ||
    (programmeFilterQuery.isLoading && !!userId) ||
    (upcomingQuery.isLoading && !upcomingQuery.data) ||
    (historyQuery.isLoading && historyRows.length === 0);

  if (isInitialLoading) {
    return (
      <PageContainer>
        <PageSkeleton variant="dashboard" className="px-0" />
      </PageContainer>
    );
  }

  return (
    <PageContainer className="space-y-6" withBottomNav>
      <PageHeader
        title="Lectures"
        subtitle="Live, upcoming, and past sessions in one place"
        variant="large"
        gradient
      />

      <motion.div variants={SECTION_REVEAL_PARENT} initial="hidden" animate="show" className="space-y-6">
        <motion.section variants={SECTION_REVEAL_ITEM} className="space-y-3">
          <SectionHeader title="Live Lecture" subtitle="Jump into active sessions instantly" />
          <LectureLiveBanner lecture={(liveLectureQuery.data as LectureRecord | null) ?? null} />
        </motion.section>

        <motion.section variants={SECTION_REVEAL_ITEM} className="space-y-3">
          <SectionHeader title="Lecture Snapshot" subtitle="Your academic pulse today" />
          <div className="grid grid-cols-2 gap-3">
            <MetricCard icon={BookOpen} value={upcomingQuery.data?.length ?? 0} label="Upcoming" />
            <MetricCard icon={Clock3} value={historyRows.length} label="History Loaded" />
            <MetricCard icon={TrendingUp} value={attendanceRate} suffix="%" label="Attendance Rate" />
            <GlassCard className="space-y-2" hover={false}>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Current State</p>
              <p className="text-sm font-semibold text-foreground">
                {liveLectureQuery.data ? "Live lecture available" : "No live lecture"}
              </p>
              <div className="inline-flex items-center gap-1 text-xs text-primary">
                <Radio className="h-3.5 w-3.5" />
                Central academic timeline
              </div>
            </GlassCard>
          </div>
        </motion.section>

        <motion.section variants={SECTION_REVEAL_ITEM} className="space-y-3">
          <SectionHeader title="Upcoming Lectures" subtitle="Your next academic sessions" />
          <UpcomingLecturesSection lectures={upcomingQuery.data ?? []} isLoading={upcomingQuery.isLoading} />
        </motion.section>

        <motion.section variants={SECTION_REVEAL_ITEM} className="space-y-3">
          <SectionHeader title="Weekly Calendar" subtitle="Next 7 days preview" />
          <LectureCalendarPreview lectures={upcomingQuery.data ?? []} />
        </motion.section>

        <motion.section variants={SECTION_REVEAL_ITEM} className="space-y-3">
          <SectionHeader title="Lecture History" subtitle="Past sessions and attendance status" />
          <LectureHistorySection
            rows={historyRows}
            isLoading={historyQuery.isLoading}
            hasNextPage={Boolean(historyQuery.hasNextPage)}
            isFetchingNextPage={historyQuery.isFetchingNextPage}
            onLoadMore={() => historyQuery.fetchNextPage()}
          />
        </motion.section>

        <motion.section variants={SECTION_REVEAL_ITEM} className="space-y-3">
          <SectionHeader title="Lecture Insights" subtitle="Smart guidance from your lecture patterns" />
          <LectureInsightsPanel
            attendanceRate={attendanceRate}
            recentMissed={Boolean(recentMissed)}
            trendDirection={trendDirection}
          />
        </motion.section>
      </motion.div>
    </PageContainer>
  );
}
