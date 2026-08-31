import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { useTenant } from "@/providers/TenantProvider";
import {
  BookOpen,
  CalendarCheck,
  Clock,
  CheckSquare,
  ArrowRight,
  Plus,
  FileText,
  Megaphone,
  Users,
  AlertCircle,
  QrCode,
  Calendar,
  Radio,
  Play,
  StopCircle,
  Sparkles,
  ChevronRight,
  TrendingUp,
} from "@/components/icons";
import {
  format,
  isToday,
  isFuture,
  isPast,
  isAfter,
  parseISO,
  formatDistanceToNow,
} from "date-fns";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

import ScheduleLectureDialog from "./components/ScheduleLectureDialog";
import CreateAssignmentDialog from "./components/CreateAssignmentDialog";
import CreateAnnouncementDialog from "./components/CreateAnnouncementDialog";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function SectionHeader({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-[13px] font-semibold text-foreground tracking-tight">{title}</h2>
      {action && <div className="text-[12px]">{action}</div>}
    </div>
  );
}

function MetricTile({
  label,
  value,
  sub,
  accent = false,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-card px-4 py-3.5 transition-all shadow-2xs",
        accent ? "border-primary/25 bg-primary/5" : "border-border/50"
      )}
    >
      <p
        className={cn(
          "text-[22px] font-bold tabular-nums leading-none",
          accent ? "text-primary" : "text-foreground"
        )}
      >
        {value}
      </p>
      <p className="text-[11px] font-medium text-muted-foreground mt-1.5">{label}</p>
      {sub && <p className="text-[10px] text-muted-foreground/80 mt-0.5">{sub}</p>}
    </div>
  );
}

function LectureStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    live: { label: "Live", cls: "bg-red-500/10 text-red-600 border-red-500/20" },
    scheduled: { label: "Upcoming", cls: "bg-amber-500/10 text-amber-700 border-amber-500/20" },
    ended: { label: "Completed", cls: "bg-muted text-muted-foreground border-border/50" },
    completed: { label: "Completed", cls: "bg-green-500/10 text-green-700 border-green-500/20" },
  };
  const s = map[status] ?? { label: status, cls: "bg-muted text-muted-foreground border-border/50" };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md border uppercase tracking-wide",
        s.cls
      )}
    >
      {status === "live" && (
        <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" aria-hidden />
      )}
      {s.label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Faculty Dashboard
// ─────────────────────────────────────────────────────────────────────────────
export default function FacultyDashboard() {
  const { user } = useAuth();
  const { collegeId } = useTenant();
  const navigate = useNavigate();
  const qc = useQueryClient();

  // Dialog states
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [showAssignmentDialog, setShowAssignmentDialog] = useState(false);
  const [showAnnouncementDialog, setShowAnnouncementDialog] = useState(false);

  // ── Profile ──────────────────────────────────────────────────────────────
  const { data: profile } = useQuery({
    queryKey: ["faculty", "profile", user?.id],
    enabled: !!user,
    staleTime: 120_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("name, department")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  // ── Lectures ─────────────────────────────────────────────────────────────
  const { data: lectures = [], isLoading: lecturesLoading } = useQuery({
    queryKey: ["faculty", "lectures", user?.id],
    enabled: !!user,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lectures")
        .select("id, topic, venue, lecture_date, start_time, end_time, status, created_at")
        .eq("created_by", user!.id)
        .order("lecture_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // ── Attendance Records ───────────────────────────────────────────────────
  const lectureIds = useMemo(() => lectures.map((l) => l.id), [lectures]);
  const { data: attendanceRaw = [], isLoading: attendanceLoading } = useQuery({
    queryKey: ["faculty", "attendance-snapshot", lectureIds],
    enabled: lectureIds.length > 0,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance")
        .select("id, lecture_id, student_user_id, status, marked_at")
        .in("lecture_id", lectureIds)
        .order("marked_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return data ?? [];
    },
  });

  // ── Assignments ──────────────────────────────────────────────────────────
  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery({
    queryKey: ["faculty", "assignments", user?.id],
    enabled: !!user,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assignments" as any)
        .select("id, title, description, due_date, max_marks, created_at")
        .eq("created_by", user!.id)
        .order("due_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  // ── Submissions ──────────────────────────────────────────────────────────
  const assignmentIds = useMemo(() => assignments.map((a: any) => a.id), [assignments]);
  const { data: submissions = [] } = useQuery({
    queryKey: ["faculty", "submissions", assignmentIds],
    enabled: assignmentIds.length > 0,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("submissions" as any)
        .select("id, assignment_id, student_user_id, status, submitted_at, reviewed_at")
        .in("assignment_id", assignmentIds);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  // ── Announcements ────────────────────────────────────────────────────────
  const { data: announcements = [], isLoading: announcementsLoading } = useQuery({
    queryKey: ["faculty", "announcements", user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select("id, title, description, created_at")
        .eq("created_by", user!.id)
        .order("created_at", { ascending: false })
        .limit(3);
      if (error) throw error;
      return data ?? [];
    },
  });

  // ── Mutations for Lecture Status Control ──────────────────────────────────
  const startLectureMutation = useMutation({
    mutationFn: async (lectureId: string) => {
      const { error } = await supabase
        .from("lectures")
        .update({ status: "live" } as any)
        .eq("id", lectureId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Lecture is now LIVE! Live attendance is active.");
      qc.invalidateQueries({ queryKey: ["faculty"] });
      qc.invalidateQueries({ queryKey: ["student"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to start lecture");
    },
  });

  const endLectureMutation = useMutation({
    mutationFn: async (lectureId: string) => {
      const { error } = await supabase
        .from("lectures")
        .update({ status: "ended" } as any)
        .eq("id", lectureId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Lecture ended successfully.");
      qc.invalidateQueries({ queryKey: ["faculty"] });
      qc.invalidateQueries({ queryKey: ["student"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to end lecture");
    },
  });

  // ── Derived Data & Computations ──────────────────────────────────────────
  const liveLecture = useMemo(
    () => lectures.find((l) => l.status === "live"),
    [lectures]
  );

  const todayLectures = useMemo(
    () =>
      lectures
        .filter((l) => isToday(parseISO(l.lecture_date)))
        .sort((a, b) => (a.start_time || "").localeCompare(b.start_time || "")),
    [lectures]
  );

  const upcomingLectures = useMemo(
    () =>
      lectures
        .filter((l) => l.status === "scheduled" && !isToday(parseISO(l.lecture_date)))
        .sort((a, b) => a.lecture_date.localeCompare(b.lecture_date))
        .slice(0, 5),
    [lectures]
  );

  // Today's total attendance marked
  const todayAttendanceCount = useMemo(() => {
    const todayLectureIds = new Set(todayLectures.map((l) => l.id));
    return attendanceRaw.filter(
      (a) => todayLectureIds.has(a.lecture_id) && a.status === "present"
    ).length;
  }, [todayLectures, attendanceRaw]);

  // Weekly average attendance
  const weeklyAttendanceStats = useMemo(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const pastWeekLectures = lectures.filter((l) => {
      const d = parseISO(l.lecture_date);
      return isPast(d) && isAfter(d, sevenDaysAgo);
    });

    if (pastWeekLectures.length === 0) return { pct: null, total: 0, present: 0 };

    const pwIds = new Set(pastWeekLectures.map((l) => l.id));
    const totalRecords = attendanceRaw.filter((a) => pwIds.has(a.lecture_id));
    const presentRecords = totalRecords.filter((a) => a.status === "present");

    if (totalRecords.length === 0) return { pct: null, total: 0, present: 0 };
    const pct = Math.round((presentRecords.length / totalRecords.length) * 100);
    return { pct, total: totalRecords.length, present: presentRecords.length };
  }, [lectures, attendanceRaw]);

  // Attendance by completed lecture (up to 5 recent)
  const attendanceByLecture = useMemo(() => {
    const completedOrLive = lectures
      .filter((l) => ["ended", "completed", "live"].includes(l.status))
      .slice(0, 5);

    return completedOrLive.map((l) => {
      const records = attendanceRaw.filter((a) => a.lecture_id === l.id);
      const present = records.filter((a) => a.status === "present").length;
      const total = records.length;
      const pct = total > 0 ? Math.round((present / total) * 100) : null;
      return {
        ...l,
        present,
        total,
        pct,
        isLow: pct !== null && pct < 75,
      };
    });
  }, [lectures, attendanceRaw]);

  // Low attendance lectures alert
  const lowAttendanceLectures = useMemo(
    () => attendanceByLecture.filter((l) => l.isLow),
    [attendanceByLecture]
  );

  // Submissions breakdown per assignment
  const assignmentsBreakdown = useMemo(() => {
    return assignments.map((a: any) => {
      const subList = submissions.filter((s: any) => s.assignment_id === a.id);
      const totalSub = subList.length;
      const graded = subList.filter((s: any) => s.status === "graded").length;
      const pending = subList.filter((s: any) => s.status === "submitted").length;
      return {
        ...a,
        totalSub,
        graded,
        pending,
      };
    });
  }, [assignments, submissions]);

  // Total pending evaluations across all assignments
  const totalPendingEvaluations = useMemo(
    () => submissions.filter((s: any) => s.status === "submitted").length,
    [submissions]
  );

  // Upcoming assignment deadlines (due within next 7 days)
  const upcomingAssignmentDeadlines = useMemo(() => {
    const now = new Date();
    const sevenDaysAhead = new Date();
    sevenDaysAhead.setDate(sevenDaysAhead.getDate() + 7);

    return assignments.filter((a: any) => {
      const d = parseISO(a.due_date);
      return isFuture(d) && d <= sevenDaysAhead;
    });
  }, [assignments]);

  // Combined upcoming feed (lectures + deadlines)
  const upcomingTimeline = useMemo(() => {
    const items: Array<{
      id: string;
      title: string;
      date: string;
      time?: string;
      type: "lecture" | "assignment";
      venueOrMarks?: string;
      link: string;
    }> = [];

    upcomingLectures.forEach((l) => {
      items.push({
        id: `lec-${l.id}`,
        title: l.topic,
        date: l.lecture_date,
        time: l.start_time,
        type: "lecture",
        venueOrMarks: l.venue,
        link: "/faculty/my-lectures",
      });
    });

    upcomingAssignmentDeadlines.forEach((a: any) => {
      items.push({
        id: `ass-${a.id}`,
        title: `Deadline: ${a.title}`,
        date: a.due_date,
        type: "assignment",
        venueOrMarks: `${a.max_marks} marks`,
        link: "/faculty/assignments",
      });
    });

    return items
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 6);
  }, [upcomingLectures, upcomingAssignmentDeadlines]);

  // Real recent activity feed synthesized from lectures, attendance, announcements, and assignments
  const recentActivity = useMemo(() => {
    const act: Array<{
      id: string;
      icon: any;
      title: string;
      subtitle: string;
      timestamp: Date;
      tone?: string;
    }> = [];

    // Recent lectures
    lectures.slice(0, 4).forEach((l) => {
      act.push({
        id: `act-lec-${l.id}`,
        icon: BookOpen,
        title:
          l.status === "live"
            ? `Started lecture "${l.topic}"`
            : l.status === "ended"
            ? `Completed lecture "${l.topic}"`
            : `Scheduled lecture "${l.topic}"`,
        subtitle: `${format(parseISO(l.lecture_date), "MMM d")} · ${l.venue || "Venue TBD"}`,
        timestamp: new Date(l.created_at || `${l.lecture_date}T${l.start_time || "10:00"}`),
        tone: l.status === "live" ? "text-red-500" : "text-primary",
      });
    });

    // Recent attendance
    if (attendanceRaw.length > 0) {
      const recentAtt = attendanceRaw[0];
      const matchLec = lectures.find((l) => l.id === recentAtt.lecture_id);
      act.push({
        id: `act-att-${recentAtt.id}`,
        icon: CheckSquare,
        title: `Attendance marked for "${matchLec?.topic || "lecture"}"`,
        subtitle: `Latest verified check-in recorded`,
        timestamp: new Date(recentAtt.marked_at),
        tone: "text-green-600",
      });
    }

    // Recent assignments
    assignments.slice(0, 2).forEach((a: any) => {
      act.push({
        id: `act-ass-${a.id}`,
        icon: FileText,
        title: `Created assignment "${a.title}"`,
        subtitle: `Due ${format(parseISO(a.due_date), "MMM d, yyyy")}`,
        timestamp: new Date(a.created_at || a.due_date),
        tone: "text-amber-600",
      });
    });

    // Recent announcements
    announcements.slice(0, 2).forEach((ann: any) => {
      act.push({
        id: `act-ann-${ann.id}`,
        icon: Megaphone,
        title: `Published announcement "${ann.title}"`,
        subtitle: `Broadcast to students`,
        timestamp: new Date(ann.created_at),
        tone: "text-blue-600",
      });
    });

    return act
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 6);
  }, [lectures, attendanceRaw, assignments, announcements]);

  // Live lecture present count
  const liveLecturePresentCount = useMemo(() => {
    if (!liveLecture) return 0;
    return attendanceRaw.filter(
      (a) => a.lecture_id === liveLecture.id && a.status === "present"
    ).length;
  }, [liveLecture, attendanceRaw]);

  const firstName = profile?.name ? profile.name.split(" ")[0] : "Faculty";
  const todayFormatted = format(new Date(), "EEEE, d MMMM yyyy");

  return (
    <div className="space-y-6 max-w-6xl">
      {/* ── 1. Compact Welcome Header & Command Bar ──────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/40 pb-4">
        <div>
          <p className="text-[12px] font-medium text-muted-foreground">{todayFormatted}</p>
          <h1 className="text-[22px] font-bold text-foreground tracking-tight">
            {getGreeting()}, {firstName}
          </h1>
          {profile?.department && (
            <p className="text-[12px] text-muted-foreground">{profile.department}</p>
          )}
        </div>

        {/* Quick Command Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={() => setShowScheduleDialog(true)}
            className="h-9 rounded-lg text-xs font-semibold gap-1.5 shadow-2xs"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Schedule Lecture
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const firstScheduled = todayLectures.find((l) => l.status === "scheduled");
              if (firstScheduled) {
                startLectureMutation.mutate(firstScheduled.id);
              } else {
                setShowScheduleDialog(true);
              }
            }}
            className="h-9 rounded-lg text-xs font-semibold gap-1.5 border-border/60"
          >
            <Radio className="h-3.5 w-3.5 text-primary" aria-hidden />
            Start Live Class
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowAssignmentDialog(true)}
            className="h-9 rounded-lg text-xs font-semibold gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <FileText className="h-3.5 w-3.5" aria-hidden />
            Assignment
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowAnnouncementDialog(true)}
            className="h-9 rounded-lg text-xs font-semibold gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <Megaphone className="h-3.5 w-3.5" aria-hidden />
            Announcement
          </Button>
        </div>
      </div>

      {/* ── 2. LIVE NOW Control Banner (When active lecture exists) ───────── */}
      {liveLecture && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 sm:p-5 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5 min-w-0">
              <div className="h-10 w-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                <Radio className="h-5 w-5 text-red-600 animate-pulse" aria-hidden />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-red-600 bg-red-500/15 border border-red-500/25 px-2 py-0.5 rounded-full">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-600 animate-ping" />
                    Live Now
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {liveLecture.start_time} – {liveLecture.end_time}
                  </span>
                </div>
                <h2 className="text-base font-bold text-foreground truncate mt-1">
                  {liveLecture.topic}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Venue: <span className="text-foreground font-medium">{liveLecture.venue}</span> ·{" "}
                  <span className="text-primary font-semibold">
                    {liveLecturePresentCount} present
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate("/faculty/attendance")}
                className="h-8 rounded-lg text-xs font-semibold border-border/60 gap-1.5"
              >
                <QrCode className="h-3.5 w-3.5 text-primary" aria-hidden />
                Live Attendance Monitor
              </Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={endLectureMutation.isPending}
                onClick={() => endLectureMutation.mutate(liveLecture.id)}
                className="h-8 rounded-lg text-xs font-semibold gap-1.5"
              >
                <StopCircle className="h-3 w-3" aria-hidden />
                {endLectureMutation.isPending ? "Ending…" : "End Class"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── 3. Overview Metric Strip ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricTile
          label="Lectures Today"
          value={todayLectures.length}
          sub={
            todayLectures.length > 0
              ? `${todayLectures.filter((l) => l.status === "scheduled").length} upcoming · ${
                  todayLectures.filter((l) => l.status === "ended").length
                } completed`
              : "No classes scheduled"
          }
          accent={todayLectures.length > 0}
        />
        <MetricTile
          label="Upcoming Lectures"
          value={upcomingLectures.length}
          sub="Ahead in calendar"
        />
        <MetricTile
          label="Weekly Attendance"
          value={
            weeklyAttendanceStats.pct !== null ? `${weeklyAttendanceStats.pct}%` : "—"
          }
          sub={
            weeklyAttendanceStats.total > 0
              ? `${weeklyAttendanceStats.present}/${weeklyAttendanceStats.total} check-ins`
              : "No sessions in last 7 days"
          }
        />
        <MetricTile
          label="Pending Tasks"
          value={totalPendingEvaluations + upcomingAssignmentDeadlines.length}
          sub={
            totalPendingEvaluations > 0
              ? `${totalPendingEvaluations} to grade · ${upcomingAssignmentDeadlines.length} deadlines`
              : "All up to date"
          }
          accent={totalPendingEvaluations > 0}
        />
      </div>

      {/* ── 4. Main 12-Column Grid: Today's Schedule (7 cols) + Attendance (5 cols) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Today's Schedule — 7 cols */}
        <section className="lg:col-span-7" aria-labelledby="schedule-heading">
          <SectionHeader
            title="Today's Schedule"
            action={
              <Link
                to="/faculty/schedule"
                className="flex items-center gap-1 text-primary hover:underline font-medium"
              >
                Timetable <ArrowRight className="h-3 w-3" aria-hidden />
              </Link>
            }
          />

          <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
            {lecturesLoading ? (
              <div className="p-4 space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : todayLectures.length === 0 ? (
              <div className="px-5 py-6 flex items-start gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground/50 mt-0.5 shrink-0" aria-hidden />
                <div className="space-y-2">
                  <p className="text-[13px] text-muted-foreground">No classes scheduled today.</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowScheduleDialog(true)}
                    className="h-7 text-[11px] rounded-md gap-1 border-border/60"
                  >
                    <Plus className="h-3 w-3" aria-hidden />
                    Schedule Your First Lecture
                  </Button>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {todayLectures.map((l) => {
                  const isLive = l.status === "live";
                  const isScheduled = l.status === "scheduled";
                  const isCompleted = l.status === "ended" || l.status === "completed";

                  return (
                    <div
                      key={l.id}
                      className={cn(
                        "flex items-center justify-between gap-3 px-5 py-3.5 transition-colors",
                        isLive ? "bg-red-500/5" : "hover:bg-muted/20"
                      )}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        {/* Time column */}
                        <div className="shrink-0 text-right min-w-[55px]">
                          <p className="text-[11px] font-bold text-foreground tabular-nums">
                            {l.start_time || "—"}
                          </p>
                          <p className="text-[10px] text-muted-foreground tabular-nums">
                            {l.end_time || ""}
                          </p>
                        </div>

                        {/* Divider */}
                        <div
                          className="w-px self-stretch bg-border/60 mx-0.5 shrink-0"
                          aria-hidden
                        />

                        {/* Details */}
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-foreground truncate">
                            {l.topic}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {l.venue || "Venue not set"}
                          </p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        <LectureStatusBadge status={l.status} />

                        {isScheduled && (
                          <Button
                            size="sm"
                            variant="default"
                            disabled={startLectureMutation.isPending}
                            onClick={() => startLectureMutation.mutate(l.id)}
                            className="h-7 px-2.5 rounded-md text-[11px] font-semibold gap-1"
                          >
                            <Play className="h-3 w-3" aria-hidden />
                            Start Class
                          </Button>
                        )}

                        {isLive && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate("/faculty/attendance")}
                            className="h-7 px-2.5 rounded-md text-[11px] font-semibold border-red-500/30 text-red-600 hover:bg-red-500/10"
                          >
                            Live Monitor
                          </Button>
                        )}

                        {isCompleted && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => navigate("/faculty/attendance")}
                            className="h-7 px-2.5 rounded-md text-[11px] font-medium text-muted-foreground hover:text-foreground"
                          >
                            Attendance
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Attendance Snapshot & Attention — 5 cols */}
        <section className="lg:col-span-5" aria-labelledby="attendance-heading">
          <SectionHeader
            title="Attendance Snapshot"
            action={
              <Link
                to="/faculty/attendance"
                className="flex items-center gap-1 text-primary hover:underline font-medium"
              >
                Review Attendance <ArrowRight className="h-3 w-3" aria-hidden />
              </Link>
            }
          />

          <div className="rounded-xl border border-border/50 bg-card overflow-hidden divide-y divide-border/40">
            {/* Attention Alert (if low attendance lectures exist) */}
            {lowAttendanceLectures.length > 0 && (
              <div className="px-5 py-3 bg-amber-500/10 border-b border-amber-500/20 flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 text-amber-700 mt-0.5 shrink-0" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-bold text-amber-900">Attendance Attention</p>
                  <p className="text-[11px] text-amber-800 leading-snug mt-0.5">
                    {lowAttendanceLectures.length} lecture
                    {lowAttendanceLectures.length > 1 ? "s" : ""} below 75% threshold.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => navigate("/faculty/attendance")}
                  className="h-6 text-[11px] text-amber-900 px-2 font-semibold hover:bg-amber-500/20"
                >
                  Review
                </Button>
              </div>
            )}

            {attendanceLoading ? (
              <div className="p-4 space-y-3">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : attendanceByLecture.length === 0 ? (
              <div className="px-5 py-6 flex items-start gap-3">
                <CheckSquare className="h-4 w-4 text-muted-foreground/50 mt-0.5 shrink-0" aria-hidden />
                <p className="text-[12px] text-muted-foreground">
                  Attendance data appears here once lectures are conducted and check-ins are recorded.
                </p>
              </div>
            ) : (
              attendanceByLecture.map((l) => (
                <div key={l.id} className="px-5 py-3.5">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <p className="text-[12px] font-semibold text-foreground truncate flex-1">
                      {l.topic}
                    </p>
                    <span
                      className={cn(
                        "text-[12px] font-bold tabular-nums shrink-0",
                        l.isLow ? "text-red-600" : "text-foreground"
                      )}
                    >
                      {l.pct !== null ? `${l.pct}%` : "—"}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        l.pct === null
                          ? "w-0"
                          : l.isLow
                          ? "bg-red-500"
                          : l.pct < 85
                          ? "bg-amber-500"
                          : "bg-green-500"
                      )}
                      style={{ width: l.pct !== null ? `${l.pct}%` : "0%" }}
                    />
                  </div>

                  <div className="flex items-center justify-between mt-1 text-[10px] text-muted-foreground">
                    <span>
                      {l.present} / {l.total} check-ins
                    </span>
                    <span>{format(parseISO(l.lecture_date), "MMM d")}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* ── 5. Balanced Row: Pending Assignment Work (6 cols) + Upcoming Timeline (6 cols) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Pending Assignment Work — 6 cols */}
        <section className="lg:col-span-6" aria-labelledby="assignments-heading">
          <SectionHeader
            title="Assignment Work"
            action={
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowAssignmentDialog(true)}
                  className="h-6 text-[11px] px-2 text-primary font-semibold gap-1"
                >
                  <Plus className="h-3 w-3" aria-hidden /> New
                </Button>
                <Link
                  to="/faculty/assignments"
                  className="flex items-center gap-0.5 text-muted-foreground hover:text-foreground font-medium"
                >
                  All <ArrowRight className="h-3 w-3" aria-hidden />
                </Link>
              </div>
            }
          />

          <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
            {assignmentsLoading ? (
              <div className="p-4 space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : assignmentsBreakdown.length === 0 ? (
              <div className="px-5 py-6 flex items-start gap-3">
                <FileText className="h-4 w-4 text-muted-foreground/50 mt-0.5 shrink-0" aria-hidden />
                <div className="space-y-2">
                  <p className="text-[12px] text-muted-foreground">No pending assignment work.</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowAssignmentDialog(true)}
                    className="h-7 text-[11px] rounded-md gap-1 border-border/60"
                  >
                    <Plus className="h-3 w-3" aria-hidden />
                    Create an Assignment
                  </Button>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {assignmentsBreakdown.slice(0, 4).map((a: any) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-muted/20 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-semibold text-foreground truncate">{a.title}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {a.totalSub} submissions · {a.graded} evaluated ·{" "}
                        <span
                          className={cn(
                            a.pending > 0 ? "text-amber-600 font-semibold" : "text-muted-foreground"
                          )}
                        >
                          {a.pending} pending
                        </span>
                      </p>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate("/faculty/assignments")}
                      className="h-7 text-[11px] px-2.5 rounded-md shrink-0 border-border/60 font-semibold"
                    >
                      Evaluate
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Intelligent Upcoming Timeline — 6 cols */}
        <section className="lg:col-span-6" aria-labelledby="upcoming-heading">
          <SectionHeader
            title="Upcoming Schedule & Deadlines"
            action={
              <Link
                to="/faculty/schedule"
                className="flex items-center gap-1 text-primary hover:underline font-medium"
              >
                Schedule <ArrowRight className="h-3 w-3" aria-hidden />
              </Link>
            }
          />

          <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
            {upcomingTimeline.length === 0 ? (
              <div className="px-5 py-6 flex items-start gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground/50 mt-0.5 shrink-0" aria-hidden />
                <p className="text-[12px] text-muted-foreground">
                  No upcoming lectures or assignment deadlines in the next 7 days.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {upcomingTimeline.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => navigate(item.link)}
                    className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-muted/20 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="shrink-0 text-left min-w-[65px]">
                        <p className="text-[11px] font-semibold text-foreground">
                          {format(parseISO(item.date), "EEE, MMM d")}
                        </p>
                        {item.time && (
                          <p className="text-[10px] text-muted-foreground">{item.time}</p>
                        )}
                      </div>

                      <div
                        className="w-px self-stretch bg-border/60 mx-0.5 shrink-0"
                        aria-hidden
                      />

                      <div className="min-w-0">
                        <p className="text-[12px] font-medium text-foreground truncate">
                          {item.title}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {item.venueOrMarks}
                        </p>
                      </div>
                    </div>

                    <span
                      className={cn(
                        "text-[10px] font-semibold px-2 py-0.5 rounded-md border uppercase tracking-wider shrink-0",
                        item.type === "lecture"
                          ? "bg-primary/10 text-primary border-primary/20"
                          : "bg-amber-500/10 text-amber-700 border-amber-500/20"
                      )}
                    >
                      {item.type}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* ── 6. Balanced Row: Announcements (6 cols) + Recent Activity (6 cols) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Recent Announcements — 6 cols */}
        <section className="lg:col-span-6" aria-labelledby="announcements-heading">
          <SectionHeader
            title="Recent Announcements"
            action={
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowAnnouncementDialog(true)}
                  className="h-6 text-[11px] px-2 text-primary font-semibold gap-1"
                >
                  <Plus className="h-3 w-3" aria-hidden /> New
                </Button>
                <Link
                  to="/faculty/announcements"
                  className="flex items-center gap-0.5 text-muted-foreground hover:text-foreground font-medium"
                >
                  All <ArrowRight className="h-3 w-3" aria-hidden />
                </Link>
              </div>
            }
          />

          <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
            {announcementsLoading ? (
              <div className="p-4 space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : announcements.length === 0 ? (
              <div className="px-5 py-6 flex items-start gap-3">
                <Megaphone className="h-4 w-4 text-muted-foreground/50 mt-0.5 shrink-0" aria-hidden />
                <div className="space-y-2">
                  <p className="text-[12px] text-muted-foreground">No recent announcements.</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowAnnouncementDialog(true)}
                    className="h-7 text-[11px] rounded-md gap-1 border-border/60"
                  >
                    <Plus className="h-3 w-3" aria-hidden />
                    Post Your First Announcement
                  </Button>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {(announcements as any[]).map((ann) => (
                  <div key={ann.id} className="px-5 py-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[12px] font-semibold text-foreground leading-snug flex-1">
                        {ann.title}
                      </p>
                      <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">
                        {formatDistanceToNow(new Date(ann.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    {ann.description && (
                      <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed line-clamp-2">
                        {ann.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Real Recent Activity — 6 cols */}
        <section className="lg:col-span-6" aria-labelledby="activity-heading">
          <SectionHeader title="Recent Activity" />

          <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
            {recentActivity.length === 0 ? (
              <div className="px-5 py-6 flex items-start gap-3">
                <Clock className="h-4 w-4 text-muted-foreground/50 mt-0.5 shrink-0" aria-hidden />
                <p className="text-[12px] text-muted-foreground">
                  Your actions—lectures conducted, attendance marked, assignments created—will appear here in real time.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {recentActivity.map((act) => {
                  const Icon = act.icon;
                  return (
                    <div
                      key={act.id}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-muted/20 transition-colors"
                    >
                      <div className="h-7 w-7 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
                        <Icon className={cn("h-3.5 w-3.5", act.tone || "text-foreground")} aria-hidden />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] font-medium text-foreground truncate">
                          {act.title}
                        </p>
                        <p className="text-[10px] text-muted-foreground">{act.subtitle}</p>
                      </div>
                      <span className="text-[10px] text-muted-foreground/80 shrink-0">
                        {formatDistanceToNow(act.timestamp, { addSuffix: true })}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* ── Dialog Modals ─────────────────────────────────────────────────── */}
      <ScheduleLectureDialog
        open={showScheduleDialog}
        onOpenChange={setShowScheduleDialog}
      />
      <CreateAssignmentDialog
        open={showAssignmentDialog}
        onOpenChange={setShowAssignmentDialog}
      />
      <CreateAnnouncementDialog
        open={showAnnouncementDialog}
        onOpenChange={setShowAnnouncementDialog}
      />
    </div>
  );
}
