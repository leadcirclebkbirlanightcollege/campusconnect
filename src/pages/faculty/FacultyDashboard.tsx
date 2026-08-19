import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { useMemo } from "react";
import { BookOpen, Users, CheckSquare, TrendingUp, Clock, Zap } from "@/components/icons";
import { format, isToday } from "date-fns";

/* ── helpers ─────────────────────────────────────────────────── */
const TONE_CLASSES: Record<string, { bg: string; fg: string }> = {
  primary: { bg: "bg-primary/12", fg: "text-primary" },
  success: { bg: "bg-success/12", fg: "text-success" },
  warning: { bg: "bg-warning/12", fg: "text-warning" },
  accent:  { bg: "bg-accent/15",  fg: "text-accent" },
  info:    { bg: "bg-primary/10", fg: "text-primary" },
};

function StatCard({ icon: Icon, label, value, sub, tone = "primary" }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; tone?: keyof typeof TONE_CLASSES;
}) {
  const t = TONE_CLASSES[tone] ?? TONE_CLASSES.primary;
  return (
    <div className="rounded-2xl border border-border-subtle bg-surface-1/90 p-4 flex items-start gap-3 shadow-card transition-[transform,box-shadow] duration-180 hover:-translate-y-0.5 hover:shadow-lg">
      <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${t.bg} ${t.fg}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="font-heading text-[10.5px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
        <p className="font-heading text-[24px] font-black text-foreground leading-tight tabular-nums">{value}</p>
        {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function FacultyDashboard() {
  const { user } = useAuth();

  /* fetch lectures created by this faculty */
  const { data: lectures = [], isLoading: lecturesLoading } = useQuery({
    queryKey: ["faculty", "lectures", user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("lectures")
        .select("id,topic,venue,lecture_date,start_time,end_time,status")
        .eq("created_by", user!.id)
        .order("lecture_date", { ascending: false })
        .limit(100);
      return data ?? [];
    },
  });

  /* fetch attendance for this faculty's lectures */
  const { data: attendanceSummary } = useQuery({
    queryKey: ["faculty", "attendance-summary", user?.id],
    enabled: lectures.length > 0,
    staleTime: 60_000,
    queryFn: async () => {
      const ids = lectures.map((l) => l.id);
      const { data } = await supabase
        .from("attendance")
        .select("lecture_id, student_user_id")
        .in("lecture_id", ids);
      return data ?? [];
    },
  });

  const stats = useMemo(() => {
    const live = lectures.filter((l) => l.status === "live").length;
    const upcoming = lectures.filter((l) => l.status === "scheduled").length;
    const today = lectures.filter((l) => isToday(new Date(l.lecture_date)));
    const uniqueStudents = new Set(attendanceSummary?.map((a) => a.student_user_id) ?? []).size;
    return { live, upcoming, today: today.length, uniqueStudents, total: lectures.length };
  }, [lectures, attendanceSummary]);

  const todayLectures = useMemo(
    () => lectures.filter((l) => isToday(new Date(l.lecture_date))),
    [lectures]
  );
  const upcomingLectures = useMemo(
    () => lectures.filter((l) => l.status === "scheduled" && !isToday(new Date(l.lecture_date))).slice(0, 5),
    [lectures]
  );

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Premium gradient header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary to-primary/80 p-6 text-primary-foreground shadow-lg">
        <div className="absolute inset-0 opacity-20 [background:radial-gradient(circle_at_85%_15%,white,transparent_55%)]" aria-hidden />
        <div className="relative space-y-1.5">
          <p className="font-heading text-[10.5px] font-bold uppercase tracking-[0.18em] opacity-80">Faculty Cockpit</p>
          <h1 className="font-heading text-[28px] font-black tracking-tight">Faculty Dashboard</h1>
          <p className="text-[13px] opacity-85">{format(new Date(), "EEEE, MMMM d, yyyy")}</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard icon={Zap}         label="Live Now"          value={stats.live}                       sub="Active lectures" tone="success" />
        <StatCard icon={BookOpen}    label="Total Lectures"    value={stats.total}                      sub="All time" />
        <StatCard icon={Clock}       label="Today"             value={stats.today}                      sub="Scheduled today" tone="warning" />
        <StatCard icon={CheckSquare} label="Upcoming"          value={stats.upcoming}                   sub="Scheduled ahead" />
        <StatCard icon={Users}       label="Students Reached"  value={stats.uniqueStudents}             sub="Unique attendees" tone="accent" />
        <StatCard icon={TrendingUp}  label="Total Attendance"  value={attendanceSummary?.length ?? 0}   sub="Records" tone="info" />
      </div>

      {/* Today's Schedule */}
      {todayLectures.length > 0 && (
        <section>
          <h2 className="font-heading text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground mb-3">Today's Schedule</h2>
          <div className="space-y-2">
            {todayLectures.map((l) => (
              <div key={l.id} className="flex items-center gap-3 rounded-xl border border-border/50 bg-card px-4 py-3">
                <div className={`h-2 w-2 rounded-full shrink-0 ${l.status === "live" ? "bg-success animate-pulse" : "bg-muted-foreground"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-foreground truncate">{l.topic}</p>
                  <p className="text-[11px] text-muted-foreground">{l.venue} · {l.start_time} – {l.end_time}</p>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  l.status === "live" ? "bg-success/10 text-success" :
                  l.status === "ended" ? "bg-muted text-muted-foreground" :
                  "bg-warning/10 text-warning"
                }`}>
                  {l.status.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Upcoming Lectures */}
      {upcomingLectures.length > 0 && (
        <section>
          <h2 className="font-heading text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground mb-3">Upcoming Lectures</h2>
          <div className="rounded-xl border border-border/50 bg-card divide-y divide-border/30">
            {upcomingLectures.map((l) => (
              <div key={l.id} className="flex items-center gap-3 px-4 py-3">
                <BookOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-foreground truncate">{l.topic}</p>
                  <p className="text-[11px] text-muted-foreground">{format(new Date(l.lecture_date), "MMM d")} · {l.start_time}</p>
                </div>
                <span className="text-[11px] text-muted-foreground">{l.venue}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {!lecturesLoading && lectures.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-[14px] font-medium">No lectures yet</p>
          <p className="text-[12px] mt-1">Lectures you create will appear here.</p>
        </div>
      )}
    </div>
  );
}
