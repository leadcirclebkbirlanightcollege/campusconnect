import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BookOpen, Users, CheckSquare, TrendingUp, Clock, Zap, Plus, QrCode, ArrowRight, Sparkles } from "@/components/icons";
import { format, isToday } from "date-fns";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const TONE_CLASSES: Record<string, { bg: string; fg: string; border: string }> = {
  primary: { bg: "bg-primary/10", fg: "text-primary", border: "border-primary/20" },
  success: { bg: "bg-success/10", fg: "text-success", border: "border-success/20" },
  warning: { bg: "bg-warning/10", fg: "text-warning", border: "border-warning/20" },
  accent:  { bg: "bg-accent/10",  fg: "text-accent", border: "border-accent/20" },
  info:    { bg: "bg-sky-500/10", fg: "text-sky-500", border: "border-sky-500/20" },
};

function StatCard({ icon: Icon, label, value, sub, tone = "primary" }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; tone?: keyof typeof TONE_CLASSES;
}) {
  const t = TONE_CLASSES[tone] ?? TONE_CLASSES.primary;
  return (
    <div className="rounded-2xl border border-border-subtle bg-surface-1 p-4 flex items-start gap-3.5 shadow-sm transition-all duration-180 hover:-translate-y-0.5 hover:shadow-md hover:border-primary/30">
      <div className={cn("h-10 w-10 rounded-xl border flex items-center justify-center shrink-0 shadow-sm", t.bg, t.fg, t.border)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="font-heading text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
        <p className="font-heading text-[24px] font-black text-foreground leading-tight tabular-nums mt-0.5">{value}</p>
        {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function FacultyDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

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
      {/* Modern Academic Hero Cockpit */}
      <div className="relative overflow-hidden rounded-3xl border border-border-subtle bg-gradient-to-br from-surface-1 via-surface-2 to-surface-1 p-6 sm:p-8 shadow-sm">
        <div className="pointer-events-none absolute top-0 right-0 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <span className="text-[10.5px] font-bold uppercase tracking-[0.2em] text-primary">Faculty Operations Hub</span>
            <h1 className="font-heading text-2xl sm:text-3xl font-black tracking-tight text-foreground">Faculty Dashboard</h1>
            <p className="text-[13px] text-muted-foreground">{format(new Date(), "EEEE, MMMM d, yyyy")}</p>
          </div>
          <div className="flex items-center gap-2.5">
            <Button
              onClick={() => navigate("/faculty/my-lectures")}
              className="h-10 rounded-xl font-bold text-xs gap-1.5 shadow-md shadow-primary/20"
            >
              <Plus className="h-4 w-4" />
              Schedule Lecture
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/faculty/attendance")}
              className="h-10 rounded-xl font-semibold text-xs border-border-strong bg-surface-1 hover:bg-surface-2 gap-1.5"
            >
              <QrCode className="h-4 w-4 text-primary" />
              Live Monitor
            </Button>
          </div>
        </div>
      </div>

      {/* Operational Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard icon={Zap}         label="Live Class"        value={stats.live}                       sub="Active sessions right now" tone="success" />
        <StatCard icon={Clock}       label="Today's Classes"   value={stats.today}                      sub="Scheduled for today" tone="warning" />
        <StatCard icon={Users}       label="Unique Students"   value={stats.uniqueStudents}             sub="Total reached" tone="accent" />
        <StatCard icon={BookOpen}    label="Total Lectures"    value={stats.total}                      sub="All time delivered" tone="primary" />
        <StatCard icon={CheckSquare} label="Upcoming"          value={stats.upcoming}                   sub="Ahead in calendar" tone="info" />
        <StatCard icon={TrendingUp}  label="Total Attendance"  value={attendanceSummary?.length ?? 0}   sub="Verified check-ins" tone="primary" />
      </div>

      {/* Today's Schedule Agenda */}
      {todayLectures.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Today's Class Agenda</h2>
            <span className="text-[11px] font-bold text-primary">{todayLectures.length} scheduled</span>
          </div>
          <div className="space-y-2">
            {todayLectures.map((l) => (
              <div
                key={l.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border-subtle bg-surface-1 px-5 py-3.5 shadow-sm transition-all hover:border-primary/30"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className={cn(
                    "h-3 w-3 rounded-full shrink-0",
                    l.status === "live" ? "bg-danger animate-ping" : "bg-muted-foreground/50"
                  )} />
                  <div className="min-w-0">
                    <p className="text-[14px] font-bold text-foreground truncate">{l.topic}</p>
                    <p className="text-[12px] text-muted-foreground">{l.venue} · {l.start_time} – {l.end_time}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className={cn(
                    "text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider",
                    l.status === "live" ? "bg-danger/10 text-danger border border-danger/25" :
                    l.status === "ended" ? "bg-muted text-muted-foreground border border-border-subtle" :
                    "bg-warning/10 text-warning border border-warning/25"
                  )}>
                    {l.status}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => navigate("/faculty/attendance")}
                    className="h-8 rounded-lg text-xs font-semibold"
                  >
                    Manage →
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Upcoming Lectures Timeline */}
      {upcomingLectures.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Upcoming Lectures</h2>
            <Link to="/faculty/my-lectures" className="text-[11px] font-semibold text-primary hover:underline">
              View All →
            </Link>
          </div>
          <div className="rounded-2xl border border-border-subtle bg-surface-1 divide-y divide-border-subtle overflow-hidden shadow-sm">
            {upcomingLectures.map((l) => (
              <div key={l.id} className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-surface-2/60 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <BookOpen className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold text-foreground truncate">{l.topic}</p>
                    <p className="text-[11px] text-muted-foreground">{format(new Date(l.lecture_date), "EEE, MMM d")} · {l.start_time}</p>
                  </div>
                </div>
                <span className="text-[11px] font-medium text-muted-foreground shrink-0">{l.venue}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {!lecturesLoading && lectures.length === 0 && (
        <div className="text-center py-16 rounded-3xl border border-dashed border-border-subtle bg-surface-1/50 p-8 space-y-3">
          <div className="h-12 w-12 rounded-2xl bg-surface-2 flex items-center justify-center mx-auto text-muted-foreground">
            <BookOpen className="h-6 w-6 opacity-60" />
          </div>
          <div>
            <p className="text-[15px] font-bold text-foreground">No lectures created yet</p>
            <p className="text-[12px] text-muted-foreground mt-0.5">Schedule your first lecture to start taking attendance.</p>
          </div>
          <Button onClick={() => navigate("/faculty/my-lectures")} className="h-9 rounded-xl text-xs font-bold mt-2">
            <Plus className="h-3.5 w-3.5 mr-1" /> Schedule Lecture
          </Button>
        </div>
      )}
    </div>
  );
}
