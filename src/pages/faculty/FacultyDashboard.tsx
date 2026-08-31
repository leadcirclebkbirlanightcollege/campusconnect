import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BookOpen, CalendarCheck, Clock, CheckSquare, ArrowRight, Plus,
  FileText, Megaphone, Users, AlertCircle, QrCode, Calendar,
} from "@/components/icons";
import { format, isToday, isFuture, isPast, isAfter, parseISO, formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

// ─────────────────────────────────────────────────────────────────────────────
// Greeting
// ─────────────────────────────────────────────────────────────────────────────
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

// ─────────────────────────────────────────────────────────────────────────────
// Section header — compact, no uppercase overload
// ─────────────────────────────────────────────────────────────────────────────
function SectionHeader({
  title, action,
}: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-[13px] font-semibold text-foreground tracking-tight">{title}</h2>
      {action && <span className="text-[12px]">{action}</span>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Metric tile — 4-column compact overview strip
// ─────────────────────────────────────────────────────────────────────────────
function MetricTile({
  label, value, sub, accent = false,
}: { label: string; value: string | number; sub?: string; accent?: boolean }) {
  return (
    <div className={cn(
      "rounded-xl border bg-card px-4 py-3.5",
      accent
        ? "border-primary/20 bg-primary/5"
        : "border-border/50"
    )}>
      <p className={cn(
        "text-[22px] font-bold tabular-nums leading-none",
        accent ? "text-primary" : "text-foreground"
      )}>{value}</p>
      <p className="text-[11px] font-medium text-muted-foreground mt-1">{label}</p>
      {sub && <p className="text-[10px] text-muted-foreground/70 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Lecture status badge
// ─────────────────────────────────────────────────────────────────────────────
function LectureStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    live:      { label: "Live",      cls: "bg-red-500/10 text-red-600 border-red-500/20" },
    scheduled: { label: "Scheduled", cls: "bg-amber-500/10 text-amber-700 border-amber-500/20" },
    ended:     { label: "Ended",     cls: "bg-muted text-muted-foreground border-border/50" },
    completed: { label: "Completed", cls: "bg-green-500/10 text-green-700 border-green-500/20" },
  };
  const s = map[status] ?? { label: status, cls: "bg-muted text-muted-foreground border-border/50" };
  return (
    <span className={cn(
      "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md border uppercase tracking-wide",
      s.cls
    )}>
      {status === "live" && (
        <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" aria-hidden />
      )}
      {s.label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Compact empty state — not a decorative hero, just a clear contextual note
// ─────────────────────────────────────────────────────────────────────────────
function EmptyState({
  icon: Icon, text, action,
}: { icon: React.ElementType; text: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-4 py-5 rounded-xl border border-dashed border-border/60 bg-card/50">
      <Icon className="h-4 w-4 text-muted-foreground/50 shrink-0" aria-hidden />
      <p className="text-[12px] text-muted-foreground flex-1">{text}</p>
      {action}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton row for loading states
// ─────────────────────────────────────────────────────────────────────────────
function SkeletonRows({ n = 3 }: { n?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border/40 bg-card">
          <Skeleton className="h-7 w-7 rounded-lg shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-3/5" />
            <Skeleton className="h-2.5 w-2/5" />
          </div>
          <Skeleton className="h-5 w-14 rounded-md" />
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
export default function FacultyDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

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
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("lectures")
        .select("id,topic,venue,lecture_date,start_time,end_time,status,class_name")
        .eq("created_by", user!.id)
        .order("lecture_date", { ascending: false })
        .limit(100);
      return data ?? [];
    },
  });

  // ── Attendance per lecture (for snapshot) ────────────────────────────────
  const { data: attendanceRaw = [] } = useQuery({
    queryKey: ["faculty", "attendance-snapshot", user?.id],
    enabled: lectures.length > 0,
    staleTime: 60_000,
    queryFn: async () => {
      const ids = lectures.map((l) => l.id);
      const { data } = await supabase
        .from("attendance")
        .select("lecture_id, student_user_id, status")
        .in("lecture_id", ids);
      return data ?? [];
    },
  });

  // ── Assignments ──────────────────────────────────────────────────────────
  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery({
    queryKey: ["faculty", "assignments"],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("assignments" as any)
        .select("id,title,due_date,max_marks")
        .eq("created_by", user!.id)
        .order("due_date", { ascending: true });
      return (data ?? []) as any[];
    },
  });

  // ── Submissions (pending grading) ────────────────────────────────────────
  const { data: pendingSubmissions = [] } = useQuery({
    queryKey: ["faculty", "pending-submissions"],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("submissions" as any)
        .select("id, assignment_id, student_user_id, submitted_at")
        .eq("status", "submitted")
        .limit(20);
      return (data ?? []) as any[];
    },
  });

  // ── Announcements ────────────────────────────────────────────────────────
  const { data: announcements = [] } = useQuery({
    queryKey: ["faculty", "announcements", user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("announcements")
        .select("id,title,description,created_at")
        .eq("created_by", user!.id)
        .order("created_at", { ascending: false })
        .limit(3);
      return data ?? [];
    },
  });

  // ── Derived data ─────────────────────────────────────────────────────────
  const todayLectures = useMemo(
    () => lectures.filter((l) => isToday(parseISO(l.lecture_date))),
    [lectures]
  );

  const upcomingLectures = useMemo(
    () =>
      lectures
        .filter((l) => l.status === "scheduled" && isFuture(parseISO(l.lecture_date)))
        .slice(0, 4),
    [lectures]
  );

  // Weekly attendance: last 7 days lectures and their attendance %
  const weeklyAttendancePct = useMemo(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentLectures = lectures.filter(
      (l) => isPast(parseISO(l.lecture_date)) && isAfter(parseISO(l.lecture_date), sevenDaysAgo)
    );
    if (recentLectures.length === 0) return null;
    const total = attendanceRaw.filter((a) =>
      recentLectures.some((l) => l.id === a.lecture_id)
    ).length;
    const present = attendanceRaw.filter(
      (a) => recentLectures.some((l) => l.id === a.lecture_id) && a.status === "present"
    ).length;
    if (total === 0) return null;
    return Math.round((present / total) * 100);
  }, [lectures, attendanceRaw]);

  // Attendance snapshot by lecture (completed, up to 5)
  const attendanceByLecture = useMemo(() => {
    const completed = lectures
      .filter((l) => ["ended", "completed", "live"].includes(l.status))
      .slice(0, 5);
    return completed.map((l) => {
      const total = attendanceRaw.filter((a) => a.lecture_id === l.id).length;
      const present = attendanceRaw.filter(
        (a) => a.lecture_id === l.id && a.status === "present"
      ).length;
      const pct = total > 0 ? Math.round((present / total) * 100) : null;
      return { ...l, present, total, pct };
    });
  }, [lectures, attendanceRaw]);

  // Upcoming assignment deadlines (within 7 days)
  const upcomingDeadlines = useMemo(() => {
    const sevenDaysAhead = new Date();
    sevenDaysAhead.setDate(sevenDaysAhead.getDate() + 7);
    return (assignments as any[]).filter((a) => {
      const due = parseISO(a.due_date);
      return isFuture(due) && due <= sevenDaysAhead;
    });
  }, [assignments]);

  // Pending tasks count
  const pendingTasksCount = pendingSubmissions.length + upcomingDeadlines.length;

  // First name only
  const firstName = profile?.name?.split(" ")[0] ?? "there";
  const todayStr = format(new Date(), "EEEE, d MMMM yyyy");

  return (
    <div className="space-y-6 max-w-6xl">
      {/* ── 1. Welcome Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <p className="text-[12px] text-muted-foreground">{todayStr}</p>
          <h1 className="text-[22px] font-bold text-foreground tracking-tight mt-0.5">
            {getGreeting()}, {firstName}
          </h1>
          {profile?.department && (
            <p className="text-[12px] text-muted-foreground mt-0.5">{profile.department}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            className="h-9 rounded-lg text-[12px] font-semibold gap-1.5"
            onClick={() => navigate("/faculty/my-lectures")}
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Schedule Lecture
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-9 rounded-lg text-[12px] font-semibold gap-1.5 border-border/60"
            onClick={() => navigate("/faculty/attendance")}
          >
            <QrCode className="h-3.5 w-3.5" aria-hidden />
            Live Monitor
          </Button>
        </div>
      </div>

      {/* ── 2. Today's Overview metrics ───────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <MetricTile
          label="Lectures Today"
          value={todayLectures.length}
          sub={todayLectures.length === 1 ? "1 class" : `${todayLectures.length} classes`}
          accent={todayLectures.length > 0}
        />
        <MetricTile
          label="Upcoming"
          value={upcomingLectures.length}
          sub="Scheduled ahead"
        />
        <MetricTile
          label="Weekly Attendance"
          value={weeklyAttendancePct !== null ? `${weeklyAttendancePct}%` : "—"}
          sub="Last 7 days"
        />
        <MetricTile
          label="Pending Tasks"
          value={pendingTasksCount}
          sub={pendingTasksCount > 0 ? "Needs attention" : "All clear"}
          accent={pendingTasksCount > 0}
        />
      </div>

      {/* ── 3+4. Main two-column grid: Today's Schedule + Attendance ─────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Today's Schedule — 7 cols */}
        <section className="lg:col-span-7 space-y-0" aria-labelledby="schedule-heading">
          <SectionHeader
            title="Today's Schedule"
            action={
              <Link
                to="/faculty/schedule"
                className="flex items-center gap-0.5 text-primary hover:underline font-medium"
              >
                Full schedule <ArrowRight className="h-3 w-3" aria-hidden />
              </Link>
            }
          />

          <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
            {lecturesLoading ? (
              <div className="p-3"><SkeletonRows n={2} /></div>
            ) : todayLectures.length === 0 ? (
              <div className="px-5 py-6 flex items-start gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground/50 mt-0.5 shrink-0" aria-hidden />
                <div className="space-y-2">
                  <p className="text-[13px] text-muted-foreground">No lectures scheduled for today.</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-[11px] rounded-md gap-1 border-border/60"
                    onClick={() => navigate("/faculty/my-lectures")}
                  >
                    <Plus className="h-3 w-3" aria-hidden />
                    Schedule a lecture
                  </Button>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {todayLectures.map((l) => (
                  <div
                    key={l.id}
                    className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      {/* Time column */}
                      <div className="shrink-0 text-right min-w-[52px]">
                        <p className="text-[11px] font-semibold text-foreground tabular-nums">
                          {l.start_time ?? "—"}
                        </p>
                        <p className="text-[10px] text-muted-foreground tabular-nums">
                          {l.end_time ?? ""}
                        </p>
                      </div>
                      {/* Divider */}
                      <div className="w-px self-stretch bg-border/60 mx-0.5 shrink-0" aria-hidden />
                      {/* Details */}
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-foreground truncate">
                          {l.topic}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {[l.class_name, l.venue].filter(Boolean).join(" · ") || "No venue"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <LectureStatusBadge status={l.status} />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2.5 rounded-md text-[11px] font-medium"
                        onClick={() => navigate("/faculty/attendance")}
                      >
                        Manage
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Upcoming lectures (next few) as a compact list below today's */}
            {upcomingLectures.length > 0 && (
              <>
                <div className="px-5 py-2 border-t border-border/40 bg-muted/20">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Coming up
                  </p>
                </div>
                <div className="divide-y divide-border/30">
                  {upcomingLectures.map((l) => (
                    <div
                      key={l.id}
                      className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-muted/20 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="min-w-[52px] shrink-0">
                          <p className="text-[11px] font-medium text-muted-foreground">
                            {format(parseISO(l.lecture_date), "EEE, d MMM")}
                          </p>
                          <p className="text-[10px] text-muted-foreground/70">
                            {l.start_time ?? "—"}
                          </p>
                        </div>
                        <div className="w-px self-stretch bg-border/40 mx-0.5 shrink-0" aria-hidden />
                        <div className="min-w-0">
                          <p className="text-[12px] font-medium text-foreground truncate">{l.topic}</p>
                          <p className="text-[10px] text-muted-foreground">{l.venue ?? "—"}</p>
                        </div>
                      </div>
                      <LectureStatusBadge status={l.status} />
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>

        {/* Attendance Snapshot — 5 cols */}
        <section className="lg:col-span-5" aria-labelledby="attendance-heading">
          <SectionHeader
            title="Attendance Snapshot"
            action={
              <Link
                to="/faculty/attendance"
                className="flex items-center gap-0.5 text-primary hover:underline font-medium"
              >
                View all <ArrowRight className="h-3 w-3" aria-hidden />
              </Link>
            }
          />

          <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
            {attendanceByLecture.length === 0 ? (
              <div className="px-5 py-6 flex items-start gap-3">
                <CheckSquare className="h-4 w-4 text-muted-foreground/50 mt-0.5 shrink-0" aria-hidden />
                <p className="text-[12px] text-muted-foreground">
                  Attendance data appears here once you start running lectures.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {attendanceByLecture.map((l) => {
                  const pct = l.pct;
                  const isLow = pct !== null && pct < 60;
                  return (
                    <div key={l.id} className="px-5 py-3.5">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <p className="text-[12px] font-medium text-foreground truncate flex-1">
                          {l.topic}
                        </p>
                        <span className={cn(
                          "text-[12px] font-bold tabular-nums shrink-0",
                          isLow ? "text-red-600" : "text-foreground"
                        )}>
                          {pct !== null ? `${pct}%` : "—"}
                        </span>
                      </div>
                      {/* Progress bar */}
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            pct === null ? "w-0" :
                            isLow ? "bg-red-500" :
                            pct < 75 ? "bg-amber-500" :
                            "bg-green-500"
                          )}
                          style={{ width: pct !== null ? `${pct}%` : "0%" }}
                          role="progressbar"
                          aria-valuenow={pct ?? 0}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`${l.topic} attendance: ${pct ?? 0}%`}
                        />
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-[10px] text-muted-foreground">
                          {l.present}/{l.total} present
                        </p>
                        {isLow && (
                          <span className="flex items-center gap-0.5 text-[10px] text-red-600 font-medium">
                            <AlertCircle className="h-3 w-3" aria-hidden />
                            Low
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* ── 5+6. Pending Work + Announcements ────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Pending Work */}
        <section aria-labelledby="pending-heading">
          <SectionHeader
            title="Pending Work"
            action={
              <Link
                to="/faculty/assignments"
                className="flex items-center gap-0.5 text-primary hover:underline font-medium"
              >
                All assignments <ArrowRight className="h-3 w-3" aria-hidden />
              </Link>
            }
          />

          <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
            {assignmentsLoading ? (
              <div className="p-3"><SkeletonRows n={2} /></div>
            ) : pendingSubmissions.length === 0 && upcomingDeadlines.length === 0 ? (
              <div className="px-5 py-5 flex items-center gap-3">
                <CheckSquare className="h-4 w-4 text-muted-foreground/40 shrink-0" aria-hidden />
                <p className="text-[12px] text-muted-foreground">No pending evaluations or deadlines.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {/* Submissions awaiting grading */}
                {pendingSubmissions.length > 0 && (
                  <div className="px-5 py-3.5 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <FileText className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" aria-hidden />
                      <div className="min-w-0">
                        <p className="text-[12px] font-semibold text-foreground">
                          {pendingSubmissions.length} submission{pendingSubmissions.length > 1 ? "s" : ""} awaiting marks
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Review and grade</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-[11px] rounded-md shrink-0 border-border/60"
                      onClick={() => navigate("/faculty/assignments")}
                    >
                      Grade
                    </Button>
                  </div>
                )}

                {/* Upcoming deadlines */}
                {upcomingDeadlines.map((a: any) => (
                  <div key={a.id} className="px-5 py-3.5 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" aria-hidden />
                      <div className="min-w-0">
                        <p className="text-[12px] font-medium text-foreground truncate">{a.title}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Due {formatDistanceToNow(parseISO(a.due_date), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-medium text-amber-700 bg-amber-500/10 px-2 py-0.5 rounded-md shrink-0">
                      Deadline
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Recent Announcements */}
        <section aria-labelledby="announcements-heading">
          <SectionHeader
            title="Recent Announcements"
            action={
              <Link
                to="/faculty/announcements"
                className="flex items-center gap-0.5 text-primary hover:underline font-medium"
              >
                All <ArrowRight className="h-3 w-3" aria-hidden />
              </Link>
            }
          />

          <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
            {announcements.length === 0 ? (
              <div className="px-5 py-5 flex items-start gap-3">
                <Megaphone className="h-4 w-4 text-muted-foreground/40 mt-0.5 shrink-0" aria-hidden />
                <div>
                  <p className="text-[12px] text-muted-foreground">No announcements posted yet.</p>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-[11px] px-0 mt-1 text-primary"
                    onClick={() => navigate("/faculty/announcements")}
                  >
                    Post your first →
                  </Button>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {(announcements as any[]).map((a) => (
                  <div key={a.id} className="px-5 py-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[12px] font-semibold text-foreground leading-snug flex-1">
                        {a.title}
                      </p>
                      <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">
                        {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    {a.description && (
                      <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed line-clamp-2">
                        {a.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* ── 7. Recent Activity ────────────────────────────────────────────── */}
      <section aria-labelledby="activity-heading">
        <SectionHeader title="Recent Activity" />
        <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
          {lecturesLoading ? (
            <div className="p-3"><SkeletonRows n={2} /></div>
          ) : lectures.slice(0, 5).length === 0 ? (
            <EmptyState
              icon={BookOpen}
              text="Your recent activity — lectures completed, attendance marked, and announcements posted — will appear here."
            />
          ) : (
            <div className="divide-y divide-border/40">
              {lectures.slice(0, 5).map((l) => {
                const isLive = l.status === "live";
                const isDone = ["ended", "completed"].includes(l.status);
                return (
                  <div
                    key={l.id}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-muted/20 transition-colors"
                  >
                    <div className={cn(
                      "h-7 w-7 rounded-lg flex items-center justify-center shrink-0",
                      isLive ? "bg-red-500/10" : isDone ? "bg-green-500/10" : "bg-muted"
                    )}>
                      <BookOpen
                        className={cn(
                          "h-3.5 w-3.5",
                          isLive ? "text-red-600" : isDone ? "text-green-700" : "text-muted-foreground"
                        )}
                        aria-hidden
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium text-foreground truncate">{l.topic}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {format(parseISO(l.lecture_date), "EEE, d MMM")} · {l.start_time ?? "—"}
                      </p>
                    </div>
                    <LectureStatusBadge status={l.status} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
