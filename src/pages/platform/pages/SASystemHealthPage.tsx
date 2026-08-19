/**
 * SASystemHealthPage — Dedicated System Health Monitor for Super Admin.
 * Route: /platform/admin-control/system-health
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageContainer } from "@/layout";
import { motion } from "framer-motion";
import { PullToRefresh } from "@/components/mobile/PullToRefresh";
import { useQueryClient } from "@tanstack/react-query";
import {
  Activity, AlertTriangle, CheckCircle2, Clock,
  Database, Radio, RefreshCw, Server, Shield,
  TrendingUp, Users, Wifi, XCircle, Zap,
} from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useMetricCountUp } from "@/components/ui/motion";

// ── Types ─────────────────────────────────────────────────────────────────────
type HealthStatus = "healthy" | "warning" | "critical" | "unknown";

interface ServiceHealth {
  name: string;
  status: HealthStatus;
  latencyMs: number | null;
  description: string;
}

// ── Data hook ─────────────────────────────────────────────────────────────────
function useSystemHealth() {
  return useQuery({
    queryKey: ["sa_system_health"],
    queryFn: async () => {
      const start = performance.now();

      // 1. DB latency via lightweight query
      const dbStart = performance.now();
      await supabase.from("platform_settings").select("key").limit(1);
      const dbLatency = Math.round(performance.now() - dbStart);

      // 2. Auth service check
      const authStart = performance.now();
      await supabase.auth.getSession();
      const authLatency = Math.round(performance.now() - authStart);

      // 3. Platform live metrics
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const [
        { count: activeSessions },
        { count: liveCount },
        { count: attendanceToday },
        { count: errorAlerts },
        { count: openFeedback },
        { count: totalColleges },
        { count: totalStudents },
      ] = await Promise.all([
        supabase.from("login_activity").select("id", { count: "exact", head: true }).gte("created_at", new Date(Date.now() - 15 * 60 * 1000).toISOString()),
        supabase.from("lectures").select("id", { count: "exact", head: true }).eq("status", "live"),
        supabase.from("attendance").select("id", { count: "exact", head: true }).gte("marked_at", todayStart.toISOString()),
        supabase.from("security_alerts").select("id", { count: "exact", head: true }).eq("resolved", false),
        (supabase as any).from("feedback").select("id", { count: "exact", head: true }).eq("status", "open"),
        supabase.from("colleges").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_deleted", false),
      ]);

      const totalLatency = Math.round(performance.now() - start);

      return {
        dbLatency,
        authLatency,
        totalLatency,
        activeSessions: activeSessions ?? 0,
        liveCount: liveCount ?? 0,
        attendanceToday: attendanceToday ?? 0,
        errorAlerts: errorAlerts ?? 0,
        openFeedback: openFeedback ?? 0,
        totalColleges: totalColleges ?? 0,
        totalStudents: totalStudents ?? 0,
      };
    },
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}

// ── Helper — status from latency ──────────────────────────────────────────────
function latencyStatus(ms: number | null): HealthStatus {
  if (ms === null) return "unknown";
  if (ms < 300) return "healthy";
  if (ms < 800) return "warning";
  return "critical";
}

const STATUS_CONFIG: Record<HealthStatus, { label: string; color: string; icon: React.ElementType }> = {
  healthy:  { label: "Healthy",  color: "text-success",  icon: CheckCircle2 },
  warning:  { label: "Degraded", color: "text-warning",  icon: AlertTriangle },
  critical: { label: "Critical", color: "text-danger",   icon: XCircle },
  unknown:  { label: "Unknown",  color: "text-muted-foreground", icon: Clock },
};

// ── Sub-components ────────────────────────────────────────────────────────────
function ServiceCard({ service, index }: { service: ServiceHealth; index: number }) {
  const cfg = STATUS_CONFIG[service.status];
  const Icon = cfg.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className={cn(
        "rounded-xl border p-4 space-y-2 bg-surface-1",
        service.status === "critical" ? "border-danger/30" :
        service.status === "warning"  ? "border-warning/30" :
        "border-border-subtle"
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-foreground">{service.name}</span>
        <div className={cn("flex items-center gap-1 text-[10px] font-medium", cfg.color)}>
          <Icon className="h-3 w-3" />
          {cfg.label}
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground">{service.description}</p>
      {service.latencyMs !== null && (
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-muted-foreground">Latency:</span>
          <span className={cn("text-[11px] font-bold tabular-nums", cfg.color)}>{service.latencyMs}ms</span>
        </div>
      )}
    </motion.div>
  );
}

function MetricTile({ icon: Icon, value, label, sub, danger }: {
  icon: React.ElementType; value: number; label: string; sub?: string; danger?: boolean;
}) {
  const counted = useMetricCountUp(value, 600);
  return (
    <div className={cn(
      "rounded-xl border p-4 space-y-1",
      danger && value > 0 ? "bg-danger/5 border-danger/20" : "bg-surface-1 border-border-subtle"
    )}>
      <div className="flex items-center gap-1.5">
        <Icon className={cn("h-3.5 w-3.5", danger && value > 0 ? "text-danger" : "text-primary")} />
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</span>
      </div>
      <p className={cn("text-3xl font-black tabular-nums", danger && value > 0 ? "text-danger" : "text-foreground")}>
        {counted.toLocaleString()}
      </p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function SASystemHealthPage() {
  const { data, isLoading, isFetching, refetch, dataUpdatedAt } = useSystemHealth();
  const queryClient = useQueryClient();

  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : "—";

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["sa_system_health"] });
  };

  // Services derived from live latency
  const services: ServiceHealth[] = isLoading ? [] : [
    {
      name: "Database",
      status: latencyStatus(data?.dbLatency ?? null),
      latencyMs: data?.dbLatency ?? null,
      description: "Primary Postgres database — reads/writes and RLS enforcement",
      icon: Database,
    } as any,
    {
      name: "Auth Service",
      status: latencyStatus(data?.authLatency ?? null),
      latencyMs: data?.authLatency ?? null,
      description: "Supabase Auth — session verification and token refresh",
    },
    {
      name: "API Gateway",
      status: latencyStatus(data?.totalLatency ?? null),
      latencyMs: data?.totalLatency ?? null,
      description: "End-to-end REST API round-trip for compound queries",
    },
    {
      name: "Security Monitor",
      status: (data?.errorAlerts ?? 0) > 0 ? "warning" : "healthy",
      latencyMs: null,
      description: `${data?.errorAlerts ?? 0} unresolved security alert${(data?.errorAlerts ?? 0) !== 1 ? "s" : ""} detected`,
    },
  ];

  const overallStatus: HealthStatus = isLoading ? "unknown"
    : services.some((s) => s.status === "critical") ? "critical"
    : services.some((s) => s.status === "warning") ? "warning"
    : "healthy";

  const OverallIcon = STATUS_CONFIG[overallStatus].icon;

  return (
    <PageContainer size="tablet" withBottomNav={false} className="py-4">
      <PullToRefresh onRefresh={handleRefresh} className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-lg font-bold text-foreground">System Health Monitor</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Real-time infrastructure diagnostics and platform metrics</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {!isLoading && (
              <Badge
                variant="outline"
                className={cn(
                  "gap-1.5 text-[11px] border",
                  overallStatus === "healthy"  ? "text-success border-success/30 bg-success/8" :
                  overallStatus === "warning"  ? "text-warning border-warning/30 bg-warning/8" :
                  overallStatus === "critical" ? "text-danger  border-danger/30  bg-danger/8"  :
                  "text-muted-foreground border-border-subtle"
                )}
              >
                <OverallIcon className="h-3 w-3" />
                {STATUS_CONFIG[overallStatus].label}
              </Badge>
            )}
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <Clock className="h-3 w-3" />
              Updated {lastUpdated}
            </div>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={cn("h-3 w-3", isFetching && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Service status grid */}
        <section className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">Services</h2>
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-24 rounded-xl bg-surface-2 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {services.map((svc, i) => <ServiceCard key={svc.name} service={svc} index={i} />)}
            </div>
          )}
        </section>

        {/* Live platform metrics */}
        <section className="space-y-2">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">Live Platform Metrics</h2>
            <Badge variant="secondary" className="text-[10px] gap-1">
              <motion.span animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 2 }}
                className="inline-block w-1.5 h-1.5 rounded-full bg-success"
              />
              Auto-refresh 30s
            </Badge>
          </div>
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-24 rounded-xl bg-surface-2 animate-pulse" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <MetricTile icon={Users}      value={data?.activeSessions ?? 0}   label="Active Sessions"  sub="Last 15 minutes" />
              <MetricTile icon={Radio}      value={data?.liveCount ?? 0}         label="Live Lectures"    sub="Broadcasting now" />
              <MetricTile icon={Activity}   value={data?.attendanceToday ?? 0}   label="Attendance Today" sub="Marks recorded" />
              <MetricTile icon={Server}     value={data?.totalColleges ?? 0}     label="Active Colleges"  sub="Institutions online" />
              <MetricTile icon={TrendingUp} value={data?.totalStudents ?? 0}     label="Total Students"   sub="Active profiles" />
              <MetricTile icon={Shield}     value={data?.errorAlerts ?? 0}       label="Security Alerts"  sub="Unresolved" danger />
            </div>
          )}
        </section>

        {/* Latency thresholds legend */}
        <section className="rounded-xl border border-border-subtle bg-surface-1 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Zap className="h-3.5 w-3.5 text-primary" />
            <span className="text-[12px] font-semibold text-foreground">Latency Thresholds</span>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { range: "< 300ms", status: "Healthy",  color: "text-success",  bg: "bg-success/8  border-success/20" },
              { range: "300–800ms", status: "Degraded", color: "text-warning",  bg: "bg-warning/8  border-warning/20" },
              { range: "> 800ms", status: "Critical",  color: "text-danger",   bg: "bg-danger/8   border-danger/20" },
            ].map(({ range, status, color, bg }) => (
              <div key={status} className={cn("rounded-lg border p-2.5 space-y-0.5", bg)}>
                <p className={cn("text-[13px] font-bold", color)}>{range}</p>
                <p className={cn("text-[10px] font-medium", color)}>{status}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Network status */}
        <div className={cn(
          "rounded-xl border p-3 flex items-center gap-3",
          navigator.onLine ? "border-success/20 bg-success/5" : "border-danger/20 bg-danger/5"
        )}>
          <Wifi className={cn("h-4 w-4 shrink-0", navigator.onLine ? "text-success" : "text-danger")} />
          <div>
            <p className={cn("text-[12px] font-semibold", navigator.onLine ? "text-success" : "text-danger")}>
              {navigator.onLine ? "Network: Online" : "Network: Offline"}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {navigator.onLine ? "All services reachable" : "Check your internet connection"}
            </p>
          </div>
        </div>
      </PullToRefresh>
    </PageContainer>
  );
}
