import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  AlarmClock, ArrowRight, Bell, BookOpen, CheckSquare, Clock, Coins,
  GraduationCap, Megaphone, PlayCircle, Radio, ScanLine, Sparkles, Store,
  TriangleAlert, TrendingUp, Users, Zap, FileEdit, BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useMetricCountUp } from "@/components/ui/motion";
import AdminAnalyticsChart from "./AdminAnalyticsChart";

/* ── Types ─────────────────────────────────────────── */
type CommandMetrics = {
  totalStudents: number;
  totalFaculty: number;
  lecturesConducted: number;
  attendanceToday: number;
  activeLectures: number;
  totalProgrammes: number;
  totalPoints: number;
  studentsAtRisk: number;
};

type LiveLecture = {
  id: string;
  topic: string;
  venue: string;
  start_time: string;
  end_time: string;
  lecture_date: string;
  presentCount: number;
};

type ActivityItem = {
  id: string;
  action: string;
  target_entity: string;
  created_at: string;
  performed_by: string;
};

type UpcomingLec = {
  id: string;
  topic: string;
  lecture_date: string;
  start_time: string;
  end_time: string;
  venue: string;
  faculty_name: string;
};

/* ── Helpers ───────────────────────────────────────── */
function formatTime(val: string) {
  return new Date(val).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

/* ── KPI Card (Neo-Industrial compact) ─────────────── */
function KpiCard({ label, value, icon: Icon, colorCls, bgCls, loading, suffix = "", danger, idx }: {
  label: string; value: number; icon: React.ElementType;
  colorCls: string; bgCls: string; loading: boolean;
  suffix?: string; danger?: boolean; idx: number;
}) {
  const counted = useMetricCountUp(loading ? 0 : value, 700 + idx * 60);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay: idx * 0.03 }}
      className={cn(
        "group relative rounded-2xl border p-4 flex flex-col justify-between min-h-[110px]",
        "bg-surface-1 border-border-subtle transition-all duration-200",
        "hover:border-primary/40 hover:shadow-[0_0_0_1px_hsl(var(--primary)/0.15),0_10px_30px_-15px_hsl(var(--primary)/0.35)]",
        danger && value > 0 && "border-danger/40 bg-danger/[0.04] hover:border-danger/60 hover:shadow-[0_0_0_1px_hsl(var(--danger)/0.2),0_10px_30px_-15px_hsl(var(--danger)/0.35)]",
      )}
    >
      <div className="flex items-start justify-between">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground leading-tight">{label}</p>
        <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center shrink-0", bgCls)}>
          <Icon className={cn("h-3.5 w-3.5", colorCls)} />
        </div>
      </div>
      {loading ? (
        <Skeleton className="h-8 w-20 mt-2" />
      ) : (
        <div className="flex items-baseline gap-1.5 mt-2">
          <p className={cn(
            "font-heading text-[28px] font-bold tracking-tight tabular-nums leading-none",
            danger && value > 0 ? "text-danger" : "text-foreground",
          )}>
            {counted.toLocaleString()}{suffix}
          </p>
        </div>
      )}
    </motion.div>
  );
}

/* ── Quick Action Tile (Neo-Industrial 2-col grid) ─── */
function QuickAction({ icon: Icon, label, to, color, bg }: {
  icon: React.ElementType; label: string; to: string; color: string; bg: string;
}) {
  return (
    <Link to={to} className={cn(
      "group relative flex flex-col items-start gap-2 p-3 rounded-xl border border-border-subtle bg-surface-2/60",
      "hover:border-primary/40 hover:bg-surface-1 hover:shadow-[0_0_0_1px_hsl(var(--primary)/0.15)]",
      "transition-all duration-200 cursor-pointer",
    )}>
      <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-110", bg)}>
        <Icon className={cn("h-4 w-4", color)} />
      </div>
      <span className="text-[11px] font-semibold text-foreground leading-tight">{label}</span>
    </Link>
  );
}

/* ── Main Component ────────────────────────────────── */
export default function AdminOverviewTab({ onNavigateTab }: { onNavigateTab?: (tab: string) => void }) {
  const qc = useQueryClient();
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementBody, setAnnouncementBody] = useState("");

  const { startIso, endIso } = useMemo(() => {
    const now = new Date();
    const start = new Date(now); start.setHours(0, 0, 0, 0);
    const end = new Date(start); end.setDate(end.getDate() + 1);
    return { startIso: start.toISOString(), endIso: end.toISOString() };
  }, []);

  /* ── Metrics Query ── */
  const metricsQ = useQuery({
    queryKey: ["admin", "cc", "metrics", startIso],
    queryFn: async (): Promise<CommandMetrics> => {
      const [students, faculty, lectures, todayAtt, live, progs, platform, risk] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_deleted", false),
        supabase.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "faculty"),
        supabase.from("lectures").select("id", { count: "exact", head: true }),
        supabase.from("attendance").select("id", { count: "exact", head: true }).gte("marked_at", startIso).lt("marked_at", endIso),
        supabase.from("lectures").select("id", { count: "exact", head: true }).eq("status", "live"),
        supabase.from("programmes").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.rpc("get_platform_analytics"),
        supabase.from("student_intelligence").select("id", { count: "exact", head: true }).or("attendance_consistency.lt.50,engagement_index.lt.40"),
      ]);
      return {
        totalStudents: students.count ?? 0,
        totalFaculty: faculty.count ?? 0,
        lecturesConducted: lectures.count ?? 0,
        attendanceToday: todayAtt.count ?? 0,
        activeLectures: live.count ?? 0,
        totalProgrammes: progs.count ?? 0,
        totalPoints: Number((platform.data as any)?.total_points_awarded ?? 0),
        studentsAtRisk: risk.count ?? 0,
      };
    },
    staleTime: 30_000,
  });

  /* ── Live Lectures Query ── */
  const liveQ = useQuery({
    queryKey: ["admin", "cc", "live"],
    queryFn: async (): Promise<LiveLecture[]> => {
      const { data } = await supabase.from("lectures").select("id,topic,venue,start_time,end_time,lecture_date").eq("status", "live").order("start_time").limit(3);
      const rows = data ?? [];
      const counts = await Promise.all(
        rows.map(async (r) => {
          const { count } = await supabase.from("attendance").select("id", { count: "exact", head: true }).eq("lecture_id", r.id).eq("status", "present");
          return count ?? 0;
        }),
      );
      return rows.map((r, i) => ({ ...r, presentCount: counts[i] }));
    },
    staleTime: 15_000,
    refetchInterval: 20_000,
  });

  /* ── Upcoming Lectures ── */
  const upcomingQ = useQuery({
    queryKey: ["admin", "cc", "upcoming"],
    queryFn: async (): Promise<UpcomingLec[]> => {
      const today = new Date().toISOString().slice(0, 10);
      const { data } = await supabase.from("lectures").select("id,topic,lecture_date,start_time,end_time,venue,created_by")
        .gte("lecture_date", today).in("status", ["scheduled"]).order("lecture_date").order("start_time").limit(5);
      const rows = data ?? [];
      const creatorIds = [...new Set(rows.map((r) => r.created_by))];
      let nameMap: Record<string, string> = {};
      if (creatorIds.length) {
        const { data: profs } = await supabase.from("profiles").select("user_id,name").in("user_id", creatorIds);
        (profs ?? []).forEach((p) => { nameMap[p.user_id] = p.name; });
      }
      return rows.map((r) => ({ ...r, faculty_name: nameMap[r.created_by] ?? "—" }));
    },
    staleTime: 60_000,
  });

  /* ── Activity ── */
  const activityQ = useQuery({
    queryKey: ["admin", "cc", "activity"],
    queryFn: async (): Promise<ActivityItem[]> => {
      const { data } = await supabase.from("audit_logs").select("id,action,target_entity,created_at,performed_by").order("created_at", { ascending: false }).limit(8);
      return (data ?? []) as ActivityItem[];
    },
    staleTime: 30_000,
  });

  /* ── Announcement ── */
  const announceMut = useMutation({
    mutationFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Not authenticated");
      const { error } = await supabase.from("announcements").insert({
        title: announcementTitle.trim(), description: announcementBody.trim(),
        priority: "normal", target: "all", created_by: auth.user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Announcement sent"); setAnnouncementTitle(""); setAnnouncementBody(""); qc.invalidateQueries({ queryKey: ["admin", "cc", "activity"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const m = metricsQ.data;
  const loading = metricsQ.isLoading;

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();
  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="w-full space-y-6">
      {/* ── Neo-Industrial Hero ── */}
      <div className="relative overflow-hidden rounded-2xl border border-border-subtle bg-gradient-to-br from-primary/[0.12] via-surface-1 to-surface-1 p-6 shadow-sm">
        <div className="pointer-events-none absolute -top-16 -right-12 h-56 w-56 rounded-full bg-primary/25 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,transparent,hsl(var(--surface-1))_70%)]" />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                {greeting}
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{today}</span>
            </div>
            <h1 className="font-heading text-3xl md:text-4xl font-bold tracking-tight text-foreground">Command Center</h1>
            <p className="text-sm text-muted-foreground mt-1.5">Real-time institutional overview · auto-refreshing every 30s</p>
          </div>
          <div className="flex items-center gap-2">
            {liveQ.data?.length ? (
              <div className="flex items-center gap-2 rounded-xl border border-success/40 bg-success/10 px-3 py-2 shadow-[0_0_0_1px_hsl(var(--success)/0.15)]">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inset-0 rounded-full bg-success animate-ping opacity-70" />
                  <span className="relative rounded-full h-2 w-2 bg-success" />
                </span>
                <span className="text-xs font-bold text-success tabular-nums">{liveQ.data.length} LIVE</span>
              </div>
            ) : null}
            <div className="hidden md:flex items-center gap-2 rounded-xl border border-border-subtle bg-surface-2 px-3 py-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground">Ops Console</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bento KPI Strip (8-up on xl, 4-up md, 2-up mobile) ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
        <KpiCard idx={0} label="Students"      value={m?.totalStudents ?? 0}     icon={Users}          colorCls="text-primary" bgCls="bg-primary/10" loading={loading} />
        <KpiCard idx={1} label="Faculty"       value={m?.totalFaculty ?? 0}      icon={GraduationCap}  colorCls="text-accent"  bgCls="bg-accent/10"  loading={loading} />
        <KpiCard idx={2} label="Lectures"      value={m?.lecturesConducted ?? 0} icon={BookOpen}       colorCls="text-success" bgCls="bg-success/10" loading={loading} />
        <KpiCard idx={3} label="Att. Today"    value={m?.attendanceToday ?? 0}   icon={CheckSquare}    colorCls="text-warning" bgCls="bg-warning/10" loading={loading} />
        <KpiCard idx={4} label="Live Now"      value={m?.activeLectures ?? 0}    icon={Radio}          colorCls="text-success" bgCls="bg-success/10" loading={loading} />
        <KpiCard idx={5} label="Programmes"    value={m?.totalProgrammes ?? 0}   icon={GraduationCap}  colorCls="text-premium" bgCls="bg-premium/10" loading={loading} />
        <KpiCard idx={6} label="Points"        value={m?.totalPoints ?? 0}       icon={Zap}            colorCls="text-warning" bgCls="bg-warning/10" loading={loading} />
        <KpiCard idx={7} label="At-Risk"       value={m?.studentsAtRisk ?? 0}    icon={TriangleAlert}  colorCls="text-danger"  bgCls="bg-danger/10"  loading={loading} danger />
      </div>

      {/* ── Main Grid: Charts + Live + Quick Actions ── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6">
        {/* Left: Charts */}
        <div className="space-y-6">
          <AdminAnalyticsChart />
        </div>

        {/* Right: Live Operations + Quick Actions */}
        <div className="space-y-5">
          {/* Live Operations */}
          <div className={cn(
            "rounded-2xl border overflow-hidden",
            liveQ.data?.length ? "border-success/40 ring-1 ring-success/15" : "border-border-subtle",
            "bg-surface-1",
          )}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <Radio className={cn("h-4 w-4", liveQ.data?.length ? "text-success" : "text-muted-foreground")} />
                <p className="font-heading text-sm font-bold uppercase tracking-[0.12em] text-foreground">Live Operations</p>
              </div>
              {liveQ.data?.length ? (
                <motion.span animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 1.6 }}
                  className="text-[10px] font-bold text-success bg-success/10 px-2 py-0.5 rounded-full">
                  {liveQ.data.length} LIVE
                </motion.span>
              ) : null}
            </div>
            <div className="p-4 space-y-3">
              {liveQ.isLoading ? (
                <Skeleton className="h-20 w-full rounded-lg" />
              ) : liveQ.data?.length ? (
                liveQ.data.map((l) => (
                  <div key={l.id} className="flex items-center justify-between gap-3 rounded-lg bg-success/5 border border-success/15 px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{l.topic}</p>
                      <p className="text-xs text-muted-foreground">{l.venue} · {l.start_time}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xl font-black text-success tabular-nums">{l.presentCount}</p>
                      <p className="text-[10px] text-muted-foreground">present</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-2 border border-border-subtle">
                  <Clock className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">No active lectures</p>
                    <p className="text-xs text-muted-foreground">Attendance tracking will appear here during live sessions</p>
                  </div>
                </div>
              )}
              {/* Attendance progress today */}
              {!loading && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Today's attendance</span>
                    <span className="font-semibold text-foreground tabular-nums">{m?.attendanceToday ?? 0} marks</span>
                  </div>
                  <Progress value={m?.totalStudents ? Math.min(100, Math.round(((m?.attendanceToday ?? 0) / m.totalStudents) * 100)) : 0} className="h-2" />
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions — 2-col command grid */}
          <div className="rounded-2xl border border-border-subtle bg-surface-1 overflow-hidden">
            <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between">
              <p className="font-heading text-sm font-bold uppercase tracking-[0.12em] text-foreground">Quick Actions</p>
              <span className="text-[10px] font-semibold text-muted-foreground">8 tools</span>
            </div>
            <div className="p-3 grid grid-cols-2 gap-2">
              <QuickAction icon={BookOpen}     label="Create Lecture"  to="/platform/admin/lectures"                color="text-primary" bg="bg-primary/10" />
              <QuickAction icon={Users}        label="Add Student"     to="/platform/admin/students"                color="text-success" bg="bg-success/10" />
              <QuickAction icon={GraduationCap} label="Add Faculty"    to="/platform/admin/faculty"                 color="text-accent"  bg="bg-accent/10" />
              <QuickAction icon={Megaphone}    label="Announcements"   to="/platform/admin/announcements"           color="text-premium" bg="bg-premium/10" />
              <QuickAction icon={Store}        label="Approve Stalls"  to="/platform/admin/stalls"                  color="text-warning" bg="bg-warning/10" />
              <QuickAction icon={Coins}        label="Point Claims"    to="/platform/admin/point-claims"            color="text-warning" bg="bg-warning/10" />
              <QuickAction icon={ScanLine}     label="ID Scanner"      to="/platform/admin/scanner"                 color="text-success" bg="bg-success/10" />
              <QuickAction icon={FileEdit}     label="Corrections"     to="/platform/admin/attendance/corrections"  color="text-danger"  bg="bg-danger/10" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom Grid: Schedule + Activity + Announcement ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Schedule */}
        <div className="rounded-2xl border border-border-subtle bg-surface-1 lg:col-span-1">
          <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <p className="font-heading text-sm font-bold uppercase tracking-[0.12em] text-foreground">Upcoming</p>
            </div>
            <Link to="/platform/admin/lectures" className="text-[11px] text-primary hover:underline font-medium">View All</Link>
          </div>
          <div className="p-3 space-y-1.5 max-h-[340px] overflow-y-auto">
            {upcomingQ.isLoading ? (
              [...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)
            ) : upcomingQ.data?.length ? (
              upcomingQ.data.map((l) => (
                <div key={l.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-2 transition-colors">
                  <div className="text-center shrink-0 w-12">
                    <p className="text-[10px] font-bold text-primary uppercase">
                      {new Date(l.lecture_date).toLocaleDateString("en-GB", { month: "short" })}
                    </p>
                    <p className="text-lg font-black text-foreground leading-none">
                      {new Date(l.lecture_date).getDate()}
                    </p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{l.topic}</p>
                    <p className="text-xs text-muted-foreground">{l.start_time} – {l.end_time} · {l.venue}</p>
                    <p className="text-[11px] text-muted-foreground/70">{l.faculty_name}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No upcoming lectures</p>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="rounded-2xl border border-border-subtle bg-surface-1 lg:col-span-1">
          <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent" />
              <p className="font-heading text-sm font-bold uppercase tracking-[0.12em] text-foreground">Recent Activity</p>
            </div>
            <Link to="/platform/admin/audit" className="text-[11px] text-primary hover:underline font-medium">View All</Link>
          </div>
          <div className="divide-y divide-border-subtle max-h-[340px] overflow-y-auto">
            {activityQ.isLoading ? (
              [...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)
            ) : activityQ.data?.length ? (
              activityQ.data.map((item) => (
                <div key={item.id} className="flex items-start gap-3 px-4 py-3">
                  <div className="h-8 w-8 rounded-lg bg-primary/8 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground truncate">
                      <span className="font-medium">{item.action.replace(/_/g, " ")}</span>
                      <span className="text-muted-foreground"> · {item.target_entity}</span>
                    </p>
                    <p className="text-[11px] text-muted-foreground">{formatTime(item.created_at)}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No recent activity</p>
            )}
          </div>
        </div>

        {/* Broadcast Composer — indigo elevated */}
        <div className="relative rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/[0.10] via-primary/[0.04] to-surface-1 lg:col-span-1 overflow-hidden shadow-[0_0_0_1px_hsl(var(--primary)/0.10)]">
          <div className="pointer-events-none absolute -top-10 -right-8 h-32 w-32 rounded-full bg-primary/25 blur-3xl" />
          <div className="relative px-4 py-3 border-b border-primary/20 flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-primary/15 flex items-center justify-center">
              <Megaphone className="h-3.5 w-3.5 text-primary" />
            </div>
            <p className="font-heading text-sm font-bold uppercase tracking-[0.12em] text-foreground">Broadcast</p>
            <span className="ml-auto text-[10px] font-semibold text-muted-foreground">All students</span>
          </div>
          <div className="relative p-4 space-y-3">
            <Input
              value={announcementTitle} onChange={(e) => setAnnouncementTitle(e.target.value)}
              placeholder="Announcement title" className="h-10 text-sm bg-surface-1/80"
            />
            <Textarea
              value={announcementBody} onChange={(e) => setAnnouncementBody(e.target.value)}
              placeholder="Write message to broadcast campus-wide…" rows={4} className="text-sm resize-none bg-surface-1/80"
            />
            <Button className="w-full gap-2 shadow-[0_8px_24px_-8px_hsl(var(--primary)/0.55)]" onClick={() => announceMut.mutate()}
              disabled={!announcementTitle.trim() || !announcementBody.trim() || announceMut.isPending}>
              <Megaphone className="h-4 w-4" />
              {announceMut.isPending ? "Broadcasting…" : "Broadcast to Campus"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
