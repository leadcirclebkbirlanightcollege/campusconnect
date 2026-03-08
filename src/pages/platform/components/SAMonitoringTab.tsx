/**
 * SAMonitoringTab — Real-time platform monitoring for Super Admin.
 * Tracks: DAU, live lectures, attendance today, active sessions, feedback open.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users, Radio, CheckSquare, MessageSquare,
  TrendingUp, Activity, RefreshCw, Clock,
  BarChart3, ShieldAlert,
} from "lucide-react";
import { motion } from "framer-motion";
import { useMetricCountUp } from "@/components/ui/motion";
import SystemHealthPanel from "@/pages/admin/system/SystemHealthPanel";
import { cn } from "@/lib/utils";

type MonMetrics = {
  dau: number;
  wau: number;
  liveCount: number;
  attendanceToday: number;
  feedbackOpen: number;
  securityAlertsOpen: number;
  topColleges: { name: string; students: number }[];
};

function useMonitoringMetrics() {
  return useQuery<MonMetrics>({
    queryKey: ["sa_monitoring"],
    queryFn: async () => {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 7);

      const [
        { count: dau },
        { count: wau },
        { count: liveCount },
        { count: attendanceToday },
        { count: feedbackOpen },
        { count: securityAlertsOpen },
      ] = await Promise.all([
        supabase.from("login_activity").select("id", { count: "exact", head: true }).gte("created_at", todayStart.toISOString()),
        supabase.from("login_activity").select("id", { count: "exact", head: true }).gte("created_at", weekStart.toISOString()),
        supabase.from("lectures").select("id", { count: "exact", head: true }).eq("status", "live"),
        supabase.from("attendance").select("id", { count: "exact", head: true }).gte("marked_at", todayStart.toISOString()),
        (supabase as any).from("feedback").select("id", { count: "exact", head: true }).eq("status", "open"),
        supabase.from("security_alerts").select("id", { count: "exact", head: true }).eq("resolved", false),
      ]);

      // Top colleges by student count
      const { data: collegeData } = await supabase
        .from("profiles")
        .select("college_id, colleges:college_id(college_name)")
        .eq("is_deleted", false)
        .not("college_id", "is", null)
        .limit(500);

      // Count per college
      const map: Record<string, { name: string; count: number }> = {};
      for (const row of (collegeData ?? []) as any[]) {
        const cid  = row.college_id as string;
        const name = row.colleges?.college_name ?? "Unknown";
        if (!map[cid]) map[cid] = { name, count: 0 };
        map[cid].count++;
      }
      const topColleges = Object.values(map)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
        .map((c) => ({ name: c.name, students: c.count }));

      return {
        dau:                dau ?? 0,
        wau:                wau ?? 0,
        liveCount:          liveCount ?? 0,
        attendanceToday:    attendanceToday ?? 0,
        feedbackOpen:       feedbackOpen ?? 0,
        securityAlertsOpen: securityAlertsOpen ?? 0,
        topColleges,
      };
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

function MetricCard({
  label, value, icon: Icon, colorClass, bgClass, sublabel, index, danger,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  colorClass: string;
  bgClass: string;
  sublabel?: string;
  index: number;
  danger?: boolean;
}) {
  const counted = useMetricCountUp(value, 700 + index * 60);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={cn(
        "rounded-xl border border-border-subtle p-4 space-y-2",
        danger && value > 0 ? "bg-danger/5 border-danger/20" : "bg-surface-1"
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">{label}</span>
        <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center", bgClass)}>
          <Icon className={cn("h-3.5 w-3.5", colorClass)} />
        </div>
      </div>
      <p className={cn(
        "text-3xl font-black tabular-nums leading-none",
        danger && value > 0 ? "text-danger" : "text-foreground"
      )}>
        {counted.toLocaleString()}
      </p>
      {sublabel && <p className="text-[10px] text-muted-foreground">{sublabel}</p>}
    </motion.div>
  );
}

export default function SAMonitoringTab() {
  const { data, isLoading, isFetching, refetch, dataUpdatedAt } = useMonitoringMetrics();

  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : "—";

  return (
    <div className="space-y-5">
      {/* Header strip */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Live Platform Metrics</span>
          <Badge variant="secondary" className="text-[10px] gap-1">
            <motion.span animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 2 }}
              className="inline-block w-1.5 h-1.5 rounded-full bg-success"
            />
            Auto-refresh 60s
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" /> Updated {lastUpdated}
          </span>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={cn("h-3 w-3", isFetching && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <MetricCard index={0} label="Logins Today"       value={data?.dau ?? 0}                icon={Users}       colorClass="text-primary"   bgClass="bg-primary/10"   sublabel="Login events today" />
          <MetricCard index={1} label="Logins This Week"   value={data?.wau ?? 0}                icon={TrendingUp}  colorClass="text-success"   bgClass="bg-success/10"   sublabel="7-day login events" />
          <MetricCard index={2} label="Live Lectures"      value={data?.liveCount ?? 0}          icon={Radio}       colorClass="text-danger"    bgClass="bg-danger/10"    sublabel="Currently broadcasting" />
          <MetricCard index={3} label="Attendance Today"   value={data?.attendanceToday ?? 0}    icon={CheckSquare} colorClass="text-accent"    bgClass="bg-accent/10"    sublabel="Marks recorded today" />
          <MetricCard index={4} label="Feedback Open"      value={data?.feedbackOpen ?? 0}       icon={MessageSquare} colorClass="text-warning" bgClass="bg-warning/10"   sublabel="Awaiting review" danger />
          <MetricCard index={5} label="Security Alerts"    value={data?.securityAlertsOpen ?? 0} icon={ShieldAlert} colorClass="text-danger"    bgClass="bg-danger/10"    sublabel="Unresolved alerts" danger />
        </div>
      )}

      {/* Top colleges by students */}
      {!isLoading && (data?.topColleges?.length ?? 0) > 0 && (
        <div className="rounded-xl border border-border-subtle bg-surface-1 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            <span className="text-[12px] font-semibold text-foreground">Top Colleges by Student Count</span>
          </div>
          <div className="space-y-2">
            {(data?.topColleges ?? []).map((col, i) => {
              const maxStudents = data?.topColleges?.[0]?.students ?? 1;
              const pct = Math.round((col.students / maxStudents) * 100);
              return (
                <div key={i} className="space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-foreground font-medium truncate max-w-[200px]">{col.name}</span>
                    <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">{col.students.toLocaleString()} students</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted/40">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ delay: 0.3 + i * 0.07, duration: 0.5 }}
                      className="h-full rounded-full bg-primary"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* System health below */}
      <SystemHealthPanel />
    </div>
  );
}
