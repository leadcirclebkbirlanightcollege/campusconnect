import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";

import KpiCards from "./KpiCards";
import LiveOperationsPanel from "./LiveOperationsPanel";
import QuickActionsGrid from "./QuickActionsGrid";
import ProgrammeHealthSection from "./ProgrammeHealthSection";
import QuickInsightsPanel from "./QuickInsightsPanel";

interface OverviewStats {
  students: number;
  programmes: number;
  attendanceToday: number;
  attendanceTotal: number;
  manualOverrides: number;
  avgAttendancePct: number;
}

export default function AdminOverviewTab({
  onNavigateTab,
}: {
  onNavigateTab: (tab: string) => void;
}) {
  const { startIso, endIso, todayDate, monthStart } = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    const ms = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      startIso: start.toISOString(),
      endIso: end.toISOString(),
      todayDate: start.toISOString().slice(0, 10),
      monthStart: ms.toISOString(),
    };
  }, []);

  const statsQuery = useQuery({
    queryKey: ["admin", "overview-v2", todayDate],
    queryFn: async (): Promise<OverviewStats> => {
      const [
        { count: studentsCount },
        { count: programmesCount },
        { count: attendanceTodayCount },
        { count: monthAttendanceCount },
        { count: manualCount },
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("is_deleted", false),
        supabase
          .from("programmes")
          .select("id", { count: "exact", head: true })
          .eq("is_active", true),
        supabase
          .from("attendance")
          .select("id", { count: "exact", head: true })
          .eq("status", "present")
          .gte("marked_at", startIso)
          .lt("marked_at", endIso),
        supabase
          .from("attendance")
          .select("id", { count: "exact", head: true })
          .eq("status", "present")
          .gte("marked_at", monthStart),
        supabase
          .from("points_ledger")
          .select("id", { count: "exact", head: true })
          .in("source", ["admin_adjustment", "manual"]),
      ]);

      const students = studentsCount ?? 0;
      const monthAtt = monthAttendanceCount ?? 0;

      // Rough avg: month attendance / (students * days elapsed)
      const daysElapsed = Math.max(1, new Date().getDate());
      const avgPct = students > 0 ? Math.min(100, Math.round((monthAtt / (students * daysElapsed)) * 100)) : 0;

      return {
        students,
        programmes: programmesCount ?? 0,
        attendanceToday: attendanceTodayCount ?? 0,
        attendanceTotal: students,
        manualOverrides: manualCount ?? 0,
        avgAttendancePct: avgPct,
      };
    },
    staleTime: 15_000,
  });

  const stats = statsQuery.data;
  const loading = statsQuery.isLoading;

  return (
    <div className="space-y-8 px-4 sm:px-0">
      {/* 1. KPI Cards */}
      <KpiCards
        students={stats?.students ?? 0}
        programmes={stats?.programmes ?? 0}
        avgAttendancePct={stats?.avgAttendancePct ?? 0}
        manualOverrides={stats?.manualOverrides ?? 0}
        loading={loading}
      />

      {/* 2. Live Operations + Quick Insights side by side on desktop */}
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <LiveOperationsPanel
            attendanceToday={stats?.attendanceToday ?? 0}
            totalStudents={stats?.attendanceTotal ?? 0}
            loading={loading}
            onGoToAttendance={() => onNavigateTab("attendance")}
          />
        </div>
        <div className="lg:col-span-2">
          <QuickInsightsPanel
            attendanceToday={stats?.attendanceToday ?? 0}
            manualOverrides={stats?.manualOverrides ?? 0}
            loading={loading}
          />
        </div>
      </div>

      {/* 3. Quick Actions */}
      <QuickActionsGrid onNavigateTab={onNavigateTab} />

      {/* 4. Programme Health */}
      <ProgrammeHealthSection onNavigateTab={onNavigateTab} />
    </div>
  );
}
