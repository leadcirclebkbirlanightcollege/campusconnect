/**
 * SADashboardPage — Enterprise Platform Command Center
 * Desktop-first, three-column layout:
 *   Left/Main: KPI strip + College nodes + Live lectures + Analytics preview
 *   Right rail: Platform activity feed + Quick actions
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useMetricCountUp } from "@/components/ui/motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Building2, Users, GraduationCap, CheckSquare, UserCog, Activity,
  Radio, ShieldAlert, TrendingUp, BookOpen, RefreshCw, ArrowRight,
  Zap, Clock, ChevronRight, Globe, Server, AlertTriangle,
} from "lucide-react";

// ─── Data hooks ────────────────────────────────────────────────────────────────

function usePlatformKPIs() {
  return useQuery({
    queryKey: ["sa_dashboard", "kpis"],
    queryFn: async () => {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const [
        { data: analytics },
        { count: adminCount },
        { count: sessions },
        { count: liveLectures },
        { count: attendanceToday },
        { count: securityAlerts },
      ] = await Promise.all([
        supabase.rpc("get_platform_analytics" as any),
        supabase.from("user_roles").select("user_id", { count: "exact", head: true }).eq("role", "admin" as any),
        supabase.from("login_activity").select("id", { count: "exact", head: true })
          .gte("created_at", new Date(Date.now() - 15 * 60_000).toISOString()),
        supabase.from("lectures").select("id", { count: "exact", head: true }).eq("status", "live"),
        supabase.from("attendance").select("id", { count: "exact", head: true })
          .gte("marked_at", todayStart.toISOString()),
        supabase.from("security_alerts").select("id", { count: "exact", head: true }).eq("resolved", false),
      ]);
      return {
        colleges:        (analytics as any)?.total_colleges   ?? 0,
        students:        (analytics as any)?.total_students   ?? 0,
        lectures:        (analytics as any)?.total_lectures   ?? 0,
        attendance:      (analytics as any)?.total_attendance ?? 0,
        admins:          adminCount ?? 0,
        sessions:        sessions ?? 0,
        liveLectures:    liveLectures ?? 0,
        attendanceToday: attendanceToday ?? 0,
        securityAlerts:  securityAlerts ?? 0,
      };
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

function useCollegeNodes() {
  return useQuery({
    queryKey: ["sa_dashboard", "college_nodes"],
    queryFn: async () => {
      const { data: colleges } = await supabase.from("colleges").select("id, college_name, logo_url, is_active");
      const nodes = await Promise.all((colleges ?? []).map(async (c) => {
        const [{ count: students }, { count: liveCount }] = await Promise.all([
          supabase.from("profiles").select("id", { count: "exact", head: true })
            .eq("college_id", c.id).eq("is_deleted", false),
          supabase.from("lectures").select("id", { count: "exact", head: true })
            .eq("college_id", c.id).eq("status", "live"),
        ]);
        return { ...c, students: students ?? 0, live: liveCount ?? 0 };
      }));
      return nodes.sort((a, b) => b.students - a.students);
    },
    staleTime: 60_000,
  });
}

function useLiveLectures() {
  return useQuery({
    queryKey: ["sa_dashboard", "live_lectures"],
    queryFn: async () => {
      const { data } = await supabase
        .from("lectures")
        .select("id, topic, venue, college_id, start_at, end_at, colleges:college_id(college_name)")
        .eq("status", "live")
        .order("live_started_at", { ascending: false })
        .limit(6);
      return data ?? [];
    },
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}

function useActivityFeed() {
  return useQuery({
    queryKey: ["sa_dashboard", "activity_feed"],
    queryFn: async () => {
      const { data: attendanceLogs } = await supabase
        .from("attendance")
        .select("id, marked_at, status, college_id, colleges:college_id(college_name)")
        .order("marked_at", { ascending: false })
        .limit(4);
      const { data: auditLogs } = await supabase
        .from("audit_logs")
        .select("id, action, target_entity, created_at, college_id, colleges:college_id(college_name)")
        .order("created_at", { ascending: false })
        .limit(6);

      const feed = [
        ...(attendanceLogs ?? []).map((a: any) => ({
          id: `att_${a.id}`,
          type: "attendance" as const,
          message: `Attendance marked`,
          detail: (a.colleges as any)?.college_name ?? "Unknown",
          time: a.marked_at,
        })),
        ...(auditLogs ?? []).map((a: any) => ({
          id: `aud_${a.id}`,
          type: "audit" as const,
          message: a.action.replace(/_/g, " "),
          detail: (a.colleges as any)?.college_name ?? "Platform",
          time: a.created_at,
        })),
      ]
        .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
        .slice(0, 10);

      return feed;
    },
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function KPICard({
  icon: Icon, label, value, sub, color, bg, danger, idx,
}: {
  icon: React.ElementType; label: string; value: number;
  sub?: string; color: string; bg: string; danger?: boolean; idx: number;
}) {
  const counted = useMetricCountUp(value, 600 + idx * 80);
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.05, duration: 0.25 }}
      className={cn(
        "relative rounded-2xl border p-4 space-y-2 overflow-hidden group cursor-default",
        "transition-all duration-200 hover:shadow-md hover:-translate-y-0.5",
        danger && value > 0
          ? "border-danger/30 bg-danger/5"
          : "border-border-subtle bg-surface-1 hover:border-primary/20",
      )}
    >
      {/* Glow on hover */}
      <div className={cn(
        "absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300",
        "bg-gradient-to-br from-primary/3 to-transparent pointer-events-none",
      )} />
      <div className="flex items-center justify-between relative">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground/60">{label}</p>
        <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center shrink-0", bg)}>
          <Icon className={cn("h-3.5 w-3.5", color)} />
        </div>
      </div>
      <p className={cn(
        "text-[28px] font-black tabular-nums leading-none relative",
        danger && value > 0 ? "text-danger" : "text-foreground",
      )}>
        {counted.toLocaleString()}
      </p>
      {sub && <p className="text-[10px] text-muted-foreground/60 relative">{sub}</p>}
    </motion.div>
  );
}

function CollegeNode({
  college, idx, onClick,
}: {
  college: { id: string; college_name: string; logo_url?: string | null; is_active: boolean; students: number; live: number };
  idx: number;
  onClick: () => void;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: idx * 0.04, duration: 0.2 }}
      onClick={onClick}
      className={cn(
        "group relative text-left rounded-2xl border p-4 space-y-3 cursor-pointer w-full",
        "border-border-subtle bg-surface-1 hover:bg-surface-2 hover:border-primary/25",
        "transition-all duration-200 hover:shadow-md hover:-translate-y-0.5",
        !college.is_active && "opacity-50",
      )}
    >
      {college.live > 0 && (
        <span className="absolute top-3 right-3 flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-danger" />
        </span>
      )}
      <div className="flex items-center gap-2.5">
        <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
          {college.logo_url
            ? <img src={college.logo_url} className="h-6 w-6 object-contain rounded" alt="" />
            : <Building2 className="h-4 w-4 text-primary" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold text-foreground leading-tight truncate">{college.college_name}</p>
          <Badge variant={college.is_active ? "outline" : "secondary"} className="text-[9px] h-4 px-1.5 mt-0.5">
            {college.is_active ? "Active" : "Inactive"}
          </Badge>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-muted/30 px-2.5 py-1.5 text-center">
          <p className="text-[16px] font-bold text-foreground tabular-nums">{college.students.toLocaleString()}</p>
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Students</p>
        </div>
        <div className={cn("rounded-lg px-2.5 py-1.5 text-center", college.live > 0 ? "bg-danger/10" : "bg-muted/30")}>
          <p className={cn("text-[16px] font-bold tabular-nums", college.live > 0 ? "text-danger" : "text-foreground")}>{college.live}</p>
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Live Now</p>
        </div>
      </div>
      <div className="flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        <span className="text-[10px] text-primary">View college →</span>
      </div>
    </motion.button>
  );
}

function LiveLectureCard({ lecture, idx }: { lecture: any; idx: number }) {
  const now = Date.now();
  const endMs = new Date(lecture.end_at).getTime();
  const remaining = Math.max(0, Math.round((endMs - now) / 60_000));

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: idx * 0.05 }}
      className="flex items-start gap-3 p-3 rounded-xl bg-danger/5 border border-danger/15"
    >
      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-danger/15">
        <Radio className="h-3 w-3 text-danger" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-semibold text-foreground truncate">{lecture.topic}</p>
        <p className="text-[10px] text-muted-foreground truncate">
          {(lecture.colleges as any)?.college_name ?? "—"} · {lecture.venue}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-[11px] font-bold text-danger tabular-nums">{remaining}m</p>
        <p className="text-[9px] text-muted-foreground">remaining</p>
      </div>
    </motion.div>
  );
}

function ActivityFeedItem({ item, idx }: { item: any; idx: number }) {
  const relTime = (() => {
    const diff = Date.now() - new Date(item.time).getTime();
    const m = Math.round(diff / 60_000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.round(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.round(h / 24)}d ago`;
  })();

  const typeConfig = {
    attendance: { color: "text-success", bg: "bg-success/10", icon: CheckSquare },
    audit:      { color: "text-primary",  bg: "bg-primary/10",  icon: Zap },
  }[item.type as "attendance" | "audit"] ?? { color: "text-muted-foreground", bg: "bg-muted/20", icon: Activity };
  const Icon = typeConfig.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: idx * 0.04 }}
      className="flex items-start gap-2.5 py-2 border-b border-border-subtle/40 last:border-0"
    >
      <div className={cn("mt-0.5 h-5 w-5 shrink-0 rounded-md flex items-center justify-center", typeConfig.bg)}>
        <Icon className={cn("h-2.5 w-2.5", typeConfig.color)} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium text-foreground capitalize leading-snug truncate">{item.message}</p>
        <p className="text-[10px] text-muted-foreground truncate">{item.detail}</p>
      </div>
      <span className="text-[9px] text-muted-foreground/60 shrink-0 tabular-nums">{relTime}</span>
    </motion.div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function SADashboardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const kpiQ          = usePlatformKPIs();
  const collegeQ      = useCollegeNodes();
  const liveLecturesQ = useLiveLectures();
  const activityQ     = useActivityFeed();

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["sa_dashboard"] });

  const kpis = [
    { icon: Building2,  label: "Colleges",       value: kpiQ.data?.colleges        ?? 0, sub: "Registered institutions",     color: "text-primary",  bg: "bg-primary/10"  },
    { icon: Users,      label: "Students",        value: kpiQ.data?.students        ?? 0, sub: "Active student profiles",    color: "text-success",  bg: "bg-success/10"  },
    { icon: GraduationCap, label: "Lectures",     value: kpiQ.data?.lectures        ?? 0, sub: "Total conducted sessions",   color: "text-accent",   bg: "bg-accent/10"   },
    { icon: CheckSquare,label: "Attendance",      value: kpiQ.data?.attendance      ?? 0, sub: "All-time records",           color: "text-warning",  bg: "bg-warning/10"  },
    { icon: UserCog,    label: "Admins",          value: kpiQ.data?.admins          ?? 0, sub: "College administrators",     color: "text-premium",  bg: "bg-premium/10"  },
    { icon: Activity,   label: "Active Sessions", value: kpiQ.data?.sessions        ?? 0, sub: "Last 15 minutes",            color: "text-info",     bg: "bg-info/10"     },
    { icon: Radio,      label: "Live Now",        value: kpiQ.data?.liveLectures    ?? 0, sub: "Broadcasting lectures",      color: "text-danger",   bg: "bg-danger/10",   danger: true },
    { icon: ShieldAlert,label: "Security Alerts", value: kpiQ.data?.securityAlerts  ?? 0, sub: "Unresolved alerts",          color: "text-danger",   bg: "bg-danger/10",   danger: true },
  ];

  const quickActions = [
    { label: "Colleges",       icon: Building2,     path: "/platform/admin-control/colleges",          color: "text-primary"  },
    { label: "Admins",         icon: UserCog,       path: "/platform/admin-control/admins",            color: "text-premium"  },
    { label: "Students",       icon: Users,         path: "/platform/admin-control/students",          color: "text-success"  },
    { label: "Analytics",      icon: TrendingUp,    path: "/platform/admin-control/analytics",         color: "text-accent"   },
    { label: "Security",       icon: ShieldAlert,   path: "/platform/admin-control/security",          color: "text-danger"   },
    { label: "System Health",  icon: Server,        path: "/platform/admin-control/system-health",     color: "text-warning"  },
    { label: "Notifications",  icon: Globe,         path: "/platform/admin-control/notifications",     color: "text-info"     },
    { label: "Platform Ctrl",  icon: AlertTriangle, path: "/platform/admin-control/platform-settings", color: "text-muted-foreground" },
  ];

  return (
    <div className="min-h-full space-y-6 px-4 md:px-0">
      {/* ── Page header ───────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-black text-foreground leading-tight tracking-tight">
            Platform Command Center
          </h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            Real-time visibility across all colleges, admins &amp; student activity
          </p>
        </div>
        <Button
          size="sm" variant="outline"
          className="h-8 gap-1.5 text-xs shrink-0"
          onClick={refresh}
          disabled={kpiQ.isFetching}
        >
          <RefreshCw className={cn("h-3 w-3", kpiQ.isFetching && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* ── Two-column desktop layout ─────────────────────────────────────── */}
      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        {/* ── LEFT / MAIN COLUMN ── */}
        <div className="space-y-6 min-w-0">

          {/* KPI strip */}
          <section>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {kpiQ.isLoading
                ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-[104px] rounded-2xl" />)
                : kpis.map((k, i) => <KPICard key={k.label} idx={i} {...k} />)
              }
            </div>
          </section>

          {/* Live lectures */}
          <section className="rounded-2xl border border-border-subtle bg-surface-1 p-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-danger/10 flex items-center justify-center">
                  <Radio className="h-3.5 w-3.5 text-danger" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-foreground leading-tight">Live Lectures</p>
                  <p className="text-[10px] text-muted-foreground">Broadcasting across all colleges</p>
                </div>
                {(kpiQ.data?.liveLectures ?? 0) > 0 && (
                  <Badge className="bg-danger/15 text-danger border-danger/20 text-[10px] h-5">
                    {kpiQ.data?.liveLectures} Live
                  </Badge>
                )}
              </div>
              <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => navigate("/platform/admin-control/lectures")}>
                View all <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
            {liveLecturesQ.isLoading
              ? <div className="space-y-2">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
              : (liveLecturesQ.data ?? []).length === 0
                ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Radio className="h-8 w-8 text-muted-foreground/30 mb-2" />
                    <p className="text-[12px] text-muted-foreground">No lectures currently live</p>
                  </div>
                )
                : <div className="space-y-2">
                    {(liveLecturesQ.data ?? []).map((l, i) => <LiveLectureCard key={l.id} lecture={l} idx={i} />)}
                  </div>
            }
          </section>

          {/* College nodes */}
          <section className="space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[14px] font-semibold text-foreground">Colleges</p>
                <p className="text-[11px] text-muted-foreground">Live status for each institution</p>
              </div>
              <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => navigate("/platform/admin-control/colleges")}>
                Manage all <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
            {collegeQ.isLoading
              ? <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                  {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[148px] rounded-2xl" />)}
                </div>
              : (collegeQ.data ?? []).length === 0
                ? (
                  <div className="rounded-2xl border border-dashed border-border-subtle p-10 text-center">
                    <Building2 className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-[13px] text-muted-foreground">No colleges yet.</p>
                    <Button size="sm" variant="outline" className="mt-3 text-xs" onClick={() => navigate("/platform/admin-control/create-college")}>
                      Add first college
                    </Button>
                  </div>
                )
                : <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                    {(collegeQ.data ?? []).map((c, i) => (
                      <CollegeNode key={c.id} college={c} idx={i} onClick={() => navigate("/platform/admin-control/colleges")} />
                    ))}
                  </div>
            }
          </section>

          {/* Quick Actions grid */}
          <section className="rounded-2xl border border-border-subtle bg-surface-1 p-5 space-y-3.5">
            <p className="text-[13px] font-semibold text-foreground">Quick Navigation</p>
            <div className="grid grid-cols-4 gap-2">
              {quickActions.map((a) => {
                const Icon = a.icon;
                return (
                  <button
                    key={a.label}
                    onClick={() => navigate(a.path)}
                    className={cn(
                      "group flex flex-col items-center gap-1.5 rounded-xl border border-border-subtle",
                      "bg-surface-1 hover:bg-surface-2 hover:border-primary/20 p-3",
                      "transition-all duration-150 hover:shadow-sm hover:-translate-y-0.5",
                    )}
                  >
                    <Icon className={cn("h-4 w-4", a.color)} />
                    <span className="text-[10px] font-medium text-muted-foreground group-hover:text-foreground transition-colors text-center leading-snug">{a.label}</span>
                  </button>
                );
              })}
            </div>
          </section>

        </div>

        {/* ── RIGHT RAIL ── */}
        <div className="space-y-5">

          {/* Platform status pill */}
          <div className="rounded-2xl border border-success/20 bg-success/5 p-4 flex items-center gap-3">
            <div className="relative">
              <span className="absolute inset-0 rounded-full bg-success animate-ping opacity-40" />
              <div className="relative h-3 w-3 rounded-full bg-success" />
            </div>
            <div>
              <p className="text-[12px] font-semibold text-foreground">Platform Operational</p>
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Clock className="h-2.5 w-2.5" />
                {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} local time
              </p>
            </div>
          </div>

          {/* Platform Activity Feed */}
          <div className="rounded-2xl border border-border-subtle bg-surface-1 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-3.5 w-3.5 text-primary" />
                <p className="text-[12px] font-semibold text-foreground">Platform Activity</p>
              </div>
              <Badge variant="secondary" className="text-[9px] gap-1 h-4">
                <motion.span
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ repeat: Infinity, duration: 1.8 }}
                  className="inline-block h-1.5 w-1.5 rounded-full bg-success"
                />
                Live
              </Badge>
            </div>
            {activityQ.isLoading
              ? <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)}</div>
              : (activityQ.data ?? []).length === 0
                ? <p className="text-[11px] text-muted-foreground py-4 text-center">No recent activity</p>
                : <div className="divide-y divide-border-subtle/30">
                    <AnimatePresence>
                      {(activityQ.data ?? []).map((item, i) => (
                        <ActivityFeedItem key={item.id} item={item} idx={i} />
                      ))}
                    </AnimatePresence>
                  </div>
            }
          </div>

          {/* Stat summary strip */}
          <div className="rounded-2xl border border-border-subtle bg-surface-1 p-4 space-y-2.5">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Today's Stats</p>
            {[
              { label: "Attendance marks",    value: kpiQ.data?.attendanceToday ?? 0, icon: CheckSquare, color: "text-success" },
              { label: "Live lectures",        value: kpiQ.data?.liveLectures    ?? 0, icon: Radio,        color: "text-danger"  },
              { label: "Unresolved alerts",    value: kpiQ.data?.securityAlerts  ?? 0, icon: ShieldAlert,  color: "text-warning" },
              { label: "Active sessions (15m)",value: kpiQ.data?.sessions        ?? 0, icon: Activity,     color: "text-primary" },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className={cn("h-3 w-3 shrink-0", s.color)} />
                    <span className="text-[11px] text-muted-foreground">{s.label}</span>
                  </div>
                  {kpiQ.isLoading
                    ? <Skeleton className="h-4 w-8" />
                    : <span className="text-[12px] font-bold text-foreground tabular-nums">{s.value.toLocaleString()}</span>
                  }
                </div>
              );
            })}
          </div>

          {/* CTA buttons */}
          <div className="space-y-2">
            <Button className="w-full justify-between text-xs h-9" variant="outline" onClick={() => navigate("/platform/admin-control/colleges")}>
              <span className="flex items-center gap-2"><Building2 className="h-3.5 w-3.5" /> Manage Colleges</span>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
            <Button className="w-full justify-between text-xs h-9" variant="outline" onClick={() => navigate("/platform/admin-control/admins")}>
              <span className="flex items-center gap-2"><UserCog className="h-3.5 w-3.5" /> Manage Admins</span>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
            <Button className="w-full justify-between text-xs h-9" variant="outline" onClick={() => navigate("/platform/admin-control/analytics")}>
              <span className="flex items-center gap-2"><TrendingUp className="h-3.5 w-3.5" /> Platform Analytics</span>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
            <Button className="w-full justify-between text-xs h-9" variant="outline" onClick={() => navigate("/platform/admin-control/security")}>
              <span className="flex items-center gap-2"><ShieldAlert className="h-3.5 w-3.5 text-danger" /> Security Monitor</span>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </div>

        </div>
      </div>
    </div>
  );
}
