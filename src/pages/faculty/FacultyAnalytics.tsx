import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  format,
  subDays,
  isAfter,
  parseISO,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
} from "date-fns";
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import {
  BarChart2, BookOpen, Users, TrendingUp, Activity,
  Award, AlertTriangle, Calendar, Plus, CheckCircle2,
  Clock, FileText, ChevronRight
} from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

import ScheduleLectureDialog from "./components/ScheduleLectureDialog";

type TimeRange = "7d" | "30d" | "90d" | "all";

export default function FacultyAnalytics() {
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);

  // 1. Fetch all lectures created by this faculty
  const { data: rawLectures = [], isLoading: isLoadingLectures } = useQuery({
    queryKey: ["faculty", "analytics-lectures", user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lectures")
        .select("*")
        .eq("created_by", user!.id)
        .order("lecture_date", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const lectureIds = useMemo(() => rawLectures.map((l) => l.id), [rawLectures]);

  // 2. Fetch all attendance records for these lectures
  const { data: rawAttendance = [], isLoading: isLoadingAttendance } = useQuery({
    queryKey: ["faculty", "analytics-attendance", user?.id, lectureIds],
    enabled: !!user && lectureIds.length > 0,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance")
        .select("id,student_user_id,status,marked_at,lecture_id,profiles:student_user_id(name,student_id,department,avatar_url)")
        .in("lecture_id", lectureIds);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Filter data based on time range
  const filteredLectures = useMemo(() => {
    if (timeRange === "all") return rawLectures;
    const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;
    const cutoff = subDays(new Date(), days);
    return rawLectures.filter((l) => isAfter(parseISO(l.lecture_date), cutoff));
  }, [rawLectures, timeRange]);

  const filteredLectureIds = useMemo(() => new Set(filteredLectures.map((l) => l.id)), [filteredLectures]);

  const filteredAttendance = useMemo(() => {
    return rawAttendance.filter((a) => filteredLectureIds.has(a.lecture_id));
  }, [rawAttendance, filteredLectureIds]);

  // Summary KPI Calculations
  const stats = useMemo(() => {
    const totalLectures = filteredLectures.length;
    const completedLectures = filteredLectures.filter((l) => l.status === "ended" || l.status === "completed").length;
    const liveLectures = filteredLectures.filter((l) => l.status === "live").length;
    const upcomingLectures = filteredLectures.filter((l) => l.status === "scheduled").length;

    const totalAttendanceMarks = filteredAttendance.filter((a) => a.status === "present").length;
    const avgAttendancePerLecture = totalLectures > 0 ? Math.round(totalAttendanceMarks / Math.max(completedLectures || 1, 1)) : 0;

    // Unique students taught
    const uniqueStudents = new Set(filteredAttendance.map((a) => a.student_user_id)).size;

    return {
      totalLectures,
      completedLectures,
      liveLectures,
      upcomingLectures,
      totalAttendanceMarks,
      avgAttendancePerLecture,
      uniqueStudents,
    };
  }, [filteredLectures, filteredAttendance]);

  // Attendance Trend Chart Data (by lecture date)
  const attendanceTrendData = useMemo(() => {
    const countsByDate: Record<string, number> = {};
    filteredAttendance.forEach((a) => {
      if (a.status === "present" && a.marked_at) {
        const dateKey = format(parseISO(a.marked_at), "MMM d");
        countsByDate[dateKey] = (countsByDate[dateKey] ?? 0) + 1;
      }
    });

    return Object.entries(countsByDate).map(([date, count]) => ({
      date,
      attendees: count,
    }));
  }, [filteredAttendance]);

  // Lecture Attendance Comparison (per lecture topic)
  const lectureComparisonData = useMemo(() => {
    const countsByLecture: Record<string, { topic: string; count: number }> = {};
    filteredLectures.forEach((l) => {
      countsByLecture[l.id] = {
        topic: l.topic.length > 16 ? l.topic.slice(0, 16) + "…" : l.topic,
        count: 0,
      };
    });

    filteredAttendance.forEach((a) => {
      if (a.status === "present" && countsByLecture[a.lecture_id]) {
        countsByLecture[a.lecture_id].count += 1;
      }
    });

    return Object.values(countsByLecture).slice(-8);
  }, [filteredLectures, filteredAttendance]);

  // Top Attenders Leaderboard
  const studentRankings = useMemo(() => {
    const map = new Map<string, { profile: any; count: number }>();
    filteredAttendance.forEach((a) => {
      if (a.status === "present" && a.profiles) {
        const uid = a.student_user_id;
        if (!map.has(uid)) {
          map.set(uid, { profile: a.profiles, count: 0 });
        }
        map.get(uid)!.count += 1;
      }
    });

    const sorted = Array.from(map.values()).sort((a, b) => b.count - a.count);
    const topAttenders = sorted.slice(0, 5);

    // At risk students (attended less than 60% of completed sessions)
    const atRisk = sorted
      .filter((s) => stats.completedLectures >= 3 && (s.count / stats.completedLectures) < 0.75)
      .slice(0, 5);

    return { topAttenders, atRisk };
  }, [filteredAttendance, stats.completedLectures]);

  const isLoading = isLoadingLectures || (lectureIds.length > 0 && isLoadingAttendance);

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header & Range Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-bold text-foreground tracking-tight">Faculty Analytics</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            Evaluate teaching performance, student engagement, and attendance patterns.
          </p>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
            <SelectTrigger className="h-9 text-[12.5px] w-[140px] rounded-xl bg-card border-border/50">
              <SelectValue placeholder="Timeframe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">This Semester</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-border/50 bg-card p-4 shadow-2xs">
          <p className="text-[11.5px] font-medium text-muted-foreground">Total Sessions</p>
          <p className="text-[22px] font-bold text-foreground mt-1 tabular-nums">
            {stats.totalLectures}
          </p>
          <p className="text-[10.5px] text-muted-foreground mt-0.5">
            {stats.completedLectures} completed · {stats.upcomingLectures} upcoming
          </p>
        </div>

        <div className="rounded-2xl border border-border/50 bg-card p-4 shadow-2xs">
          <p className="text-[11.5px] font-medium text-muted-foreground">Total Attendees</p>
          <p className="text-[22px] font-bold text-foreground mt-1 tabular-nums">
            {stats.totalAttendanceMarks}
          </p>
          <p className="text-[10.5px] text-muted-foreground mt-0.5">
            Verified check-ins
          </p>
        </div>

        <div className="rounded-2xl border border-border/50 bg-card p-4 shadow-2xs">
          <p className="text-[11.5px] font-medium text-muted-foreground">Avg. per Lecture</p>
          <p className="text-[22px] font-bold text-success mt-1 tabular-nums">
            {stats.avgAttendancePerLecture}
          </p>
          <p className="text-[10.5px] text-muted-foreground mt-0.5">
            Students per session
          </p>
        </div>

        <div className="rounded-2xl border border-border/50 bg-card p-4 shadow-2xs">
          <p className="text-[11.5px] font-medium text-muted-foreground">Unique Students</p>
          <p className="text-[22px] font-bold text-foreground mt-1 tabular-nums">
            {stats.uniqueStudents}
          </p>
          <p className="text-[10.5px] text-muted-foreground mt-0.5">
            Across enrolled courses
          </p>
        </div>
      </div>

      {/* Main Charts & Visualizations */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-72 rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      ) : rawLectures.length === 0 ? (
        <div className="rounded-2xl border border-border/50 bg-card p-12 text-center shadow-2xs">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
            <BarChart2 className="h-6 w-6" />
          </div>
          <h3 className="text-[15px] font-bold text-foreground">No lecture data yet</h3>
          <p className="text-[12.5px] text-muted-foreground max-w-sm mx-auto mt-1">
            Create your first lecture to start building attendance analytics and student insights.
          </p>
          <Button
            onClick={() => setShowScheduleDialog(true)}
            size="sm"
            className="mt-4 rounded-xl text-[12.5px] gap-1.5"
          >
            <Plus className="h-4 w-4" /> Schedule Lecture
          </Button>
        </div>
      ) : (
        <>
          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Chart 1: Attendance Volume per Lecture */}
            <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-2xs">
              <div className="mb-4">
                <h3 className="text-[13.5px] font-bold text-foreground">Attendance per Lecture</h3>
                <p className="text-[11.5px] text-muted-foreground">Number of verified present students</p>
              </div>

              {lectureComparisonData.length === 0 ? (
                <div className="h-52 flex items-center justify-center text-[12px] text-muted-foreground">
                  No attendance records in this period
                </div>
              ) : (
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={lectureComparisonData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} opacity={0.6} />
                      <XAxis
                        dataKey="topic"
                        tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                        angle={-25}
                        textAnchor="end"
                        tickLine={false}
                      />
                      <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          borderColor: "hsl(var(--border))",
                          borderRadius: "12px",
                          fontSize: "12px",
                        }}
                        formatter={(value) => [value, "Students Present"]}
                      />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Chart 2: Daily Attendance Trend Area */}
            <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-2xs">
              <div className="mb-4">
                <h3 className="text-[13.5px] font-bold text-foreground">Attendance Timeline</h3>
                <p className="text-[11.5px] text-muted-foreground">Daily attendance check-ins over time</p>
              </div>

              {attendanceTrendData.length === 0 ? (
                <div className="h-52 flex items-center justify-center text-[12px] text-muted-foreground">
                  No trend data available for this range
                </div>
              ) : (
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={attendanceTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                      <defs>
                        <linearGradient id="attGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} opacity={0.6} />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                        tickLine={false}
                      />
                      <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          borderColor: "hsl(var(--border))",
                          borderRadius: "12px",
                          fontSize: "12px",
                        }}
                        formatter={(val) => [val, "Check-ins"]}
                      />
                      <Area
                        type="monotone"
                        dataKey="attendees"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#attGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          {/* Student Engagement & Leaderboard Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Top Consistent Students */}
            <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-2xs">
              <div className="flex items-center gap-2 mb-3">
                <Award className="h-4 w-4 text-warning" />
                <h3 className="text-[13.5px] font-bold text-foreground">Top Attending Students</h3>
              </div>

              {studentRankings.topAttenders.length === 0 ? (
                <p className="text-[12px] text-muted-foreground py-6 text-center">
                  No attendance records recorded yet
                </p>
              ) : (
                <div className="divide-y divide-border/30">
                  {studentRankings.topAttenders.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between py-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="h-6 w-6 rounded-full bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-foreground truncate">
                            {item.profile?.name || "Student"}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            ID: {item.profile?.student_id || "—"} · {item.profile?.department || "General"}
                          </p>
                        </div>
                      </div>
                      <span className="text-[12px] font-bold text-success tabular-nums shrink-0">
                        {item.count} {item.count === 1 ? "session" : "sessions"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Students Requiring Attention */}
            <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-2xs">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <h3 className="text-[13.5px] font-bold text-foreground">Students Requiring Attention</h3>
              </div>

              {studentRankings.atRisk.length === 0 ? (
                <div className="py-6 text-center">
                  <CheckCircle2 className="h-6 w-6 text-success mx-auto mb-1.5 opacity-80" />
                  <p className="text-[12.5px] font-medium text-foreground">Good Engagement</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    No students currently below the attendance threshold.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border/30">
                  {studentRankings.atRisk.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between py-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-6 w-6 rounded-full bg-destructive/10 text-destructive text-[11px] font-bold flex items-center justify-center shrink-0">
                          !
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-foreground truncate">
                            {item.profile?.name || "Student"}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            ID: {item.profile?.student_id || "—"}
                          </p>
                        </div>
                      </div>
                      <span className="text-[11.5px] font-bold text-destructive tabular-nums shrink-0">
                        {item.count} / {stats.completedLectures} sessions
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Schedule Lecture Dialog */}
      <ScheduleLectureDialog
        open={showScheduleDialog}
        onOpenChange={setShowScheduleDialog}
      />
    </div>
  );
}
