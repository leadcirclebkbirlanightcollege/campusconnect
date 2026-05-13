import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Shield, Clock, User, ArrowRight, Lock, Activity, AlertTriangle,
  CheckCircle2, RefreshCw, Eye, LogIn, Coins, Trophy, UserCog,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import ResetStudentsPanel from "@/pages/platform/components/ResetStudentsPanel";

/* ─── Types ──────────────────────────────────────────────────────────────── */
type AuditEntry = {
  id: string;
  action: string;
  performed_by: string;
  target_entity: string;
  target_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
  college_id: string | null;
  performer_name?: string;
};

type AttendanceAuditEntry = {
  id: string;
  student_user_id: string;
  changed_by: string;
  changed_at: string;
  old_status: string | null;
  new_status: string | null;
  reason: string;
  student_name?: string;
  admin_name?: string;
};

type LoginEntry = {
  id: string;
  user_id: string;
  user_agent: string | null;
  ip_address: string | null;
  created_at: string;
  user_name?: string;
};

type Alert = {
  id: string;
  alert_type: string;
  user_id: string | null;
  details: Record<string, unknown>;
  resolved: boolean;
  created_at: string;
};

/* ─── Status helpers ─────────────────────────────────────────────────────── */
const STATUS_STYLE: Record<string, string> = {
  present: "bg-success/10 text-success border-success/20",
  absent:  "bg-danger/10 text-danger border-danger/20",
};

const ACTION_ICON: Record<string, React.FC<{ className?: string }>> = {
  attendance_corrected: Activity,
  points_adjusted:      Coins,
  achievement_unlocked: Trophy,
  admin_created:        UserCog,
  lecture_created:      Clock,
  default:              Shield,
};

const ACTION_COLOR: Record<string, string> = {
  attendance_corrected: "text-warning bg-warning/10",
  points_adjusted:      "text-primary bg-primary/10",
  achievement_unlocked: "text-success bg-success/10",
  admin_created:        "text-purple-500 bg-purple-500/10",
  lecture_created:      "text-info bg-info/10",
  default:              "text-muted-foreground bg-surface-3",
};

/* ─── Shared skeleton ────────────────────────────────────────────────────── */
function ListSkeleton() {
  return (
    <div className="p-5 space-y-3">
      {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
    </div>
  );
}

/* ─── Metric card ────────────────────────────────────────────────────────── */
function MetricCard({ label, value, icon: Icon, color, loading }: {
  label: string; value?: number | null;
  icon: React.FC<{ className?: string }>;
  color: string; loading?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border-subtle bg-surface-1 p-4 shadow-xs dashboard-panel">
      <div className="flex items-center gap-3">
        <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center shrink-0", color.replace("text-", "bg-").replace("/", "/10"))}>
          <Icon className={cn("h-4.5 w-4.5", color)} />
        </div>
        <div>
          {loading ? <Skeleton className="h-6 w-12 mb-1" /> :
            <p className="text-xl font-bold text-foreground tabular-nums">{(value ?? 0).toLocaleString()}</p>}
          <p className="text-[11px] text-muted-foreground leading-tight">{label}</p>
        </div>
      </div>
    </div>
  );
}

/* ─── Attendance Audit tab ───────────────────────────────────────────────── */
function AttendanceAuditTab() {
  const q = useQuery<AttendanceAuditEntry[]>({
    queryKey: ["sa_attendance_audit"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance_audit_log")
        .select("*")
        .order("changed_at", { ascending: false })
        .limit(120);
      if (error) throw error;
      const entries = (data ?? []) as AttendanceAuditEntry[];
      const ids = [...new Set([...entries.map(e => e.student_user_id), ...entries.map(e => e.changed_by)])];
      if (!ids.length) return entries;
      const { data: profiles } = await supabase.from("profiles").select("user_id,name").in("user_id", ids);
      const nm = new Map((profiles ?? []).map(p => [p.user_id, p.name]));
      return entries.map(e => ({ ...e, student_name: nm.get(e.student_user_id) ?? "Unknown", admin_name: nm.get(e.changed_by) ?? "Unknown Admin" }));
    },
    staleTime: 30_000,
  });

  const entries = q.data ?? [];
  if (q.isLoading) return <ListSkeleton />;
  if (!entries.length) return (
    <div className="py-14 text-center space-y-2">
      <Shield className="h-8 w-8 text-muted-foreground mx-auto opacity-30" />
      <p className="text-[13px] text-muted-foreground">No attendance corrections yet</p>
    </div>
  );

  return (
    <div className="divide-y divide-border-subtle">
      {entries.map(entry => (
        <div key={entry.id} className="flex items-start gap-3 px-5 py-3.5 hover:bg-surface-2/40 transition-colors">
          <div className="h-7 w-7 rounded-full bg-surface-3 flex items-center justify-center shrink-0 mt-0.5">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[12px] font-semibold text-foreground">{entry.admin_name}</span>
              <span className="text-[11px] text-muted-foreground">edited</span>
              <span className="text-[12px] font-medium text-foreground">{entry.student_name}</span>
              <div className="flex items-center gap-1 ml-1">
                {entry.old_status && <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 border", STATUS_STYLE[entry.old_status] ?? "")}>{entry.old_status}</Badge>}
                {entry.old_status && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
                {entry.new_status && <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 border", STATUS_STYLE[entry.new_status] ?? "")}>{entry.new_status}</Badge>}
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5 italic">"{entry.reason}"</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[11px] text-muted-foreground">{formatDistanceToNow(new Date(entry.changed_at), { addSuffix: true })}</p>
            <p className="text-[10px] text-muted-foreground/60">{format(new Date(entry.changed_at), "d MMM, HH:mm")}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Generic Audit Log tab ──────────────────────────────────────────────── */
function AuditLogTab() {
  const q = useQuery<AuditEntry[]>({
    queryKey: ["sa_generic_audit"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      const entries = ((data ?? []) as unknown) as AuditEntry[];
      const ids = [...new Set(entries.map(e => e.performed_by))];
      if (!ids.length) return entries;
      const { data: profiles } = await supabase.from("profiles").select("user_id,name").in("user_id", ids);
      const nm = new Map((profiles ?? []).map(p => [p.user_id, p.name]));
      return entries.map(e => ({ ...e, performer_name: nm.get(e.performed_by) ?? "System" }));
    },
    staleTime: 30_000,
  });

  const entries = q.data ?? [];
  if (q.isLoading) return <ListSkeleton />;
  if (!entries.length) return (
    <div className="py-14 text-center space-y-2">
      <Activity className="h-8 w-8 text-muted-foreground mx-auto opacity-30" />
      <p className="text-[13px] text-muted-foreground">No audit events recorded yet</p>
      <p className="text-[11px] text-muted-foreground/60">Events are logged when admins perform critical actions.</p>
    </div>
  );

  return (
    <div className="divide-y divide-border-subtle">
      {entries.map(entry => {
        const Icon = ACTION_ICON[entry.action] ?? ACTION_ICON.default;
        const color = ACTION_COLOR[entry.action] ?? ACTION_COLOR.default;
        return (
          <div key={entry.id} className="flex items-start gap-3 px-5 py-3.5 hover:bg-surface-2/40 transition-colors">
            <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5", color)}>
              <Icon className="h-3.5 w-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-mono">
                  {entry.action.replace(/_/g, " ")}
                </Badge>
                <span className="text-[11px] text-muted-foreground">by</span>
                <span className="text-[12px] font-semibold text-foreground">{entry.performer_name}</span>
                {entry.target_entity && (
                  <span className="text-[11px] text-muted-foreground/70">→ {entry.target_entity}</span>
                )}
              </div>
              {entry.details && Object.keys(entry.details).length > 0 && (
                <p className="text-[10px] text-muted-foreground/60 mt-0.5 font-mono truncate">
                  {JSON.stringify(entry.details).slice(0, 80)}
                </p>
              )}
            </div>
            <div className="text-right shrink-0">
              <p className="text-[11px] text-muted-foreground">{formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}</p>
              <p className="text-[10px] text-muted-foreground/60">{format(new Date(entry.created_at), "d MMM, HH:mm")}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Login Activity tab ─────────────────────────────────────────────────── */
function LoginActivityTab() {
  const q = useQuery<LoginEntry[]>({
    queryKey: ["sa_login_activity"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("login_activity")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      const entries = ((data ?? []) as unknown) as LoginEntry[];
      const ids = [...new Set(entries.map(e => e.user_id))];
      if (!ids.length) return entries;
      const { data: profiles } = await supabase.from("profiles").select("user_id,name").in("user_id", ids);
      const nm = new Map((profiles ?? []).map(p => [p.user_id, p.name]));
      return entries.map(e => ({ ...e, user_name: nm.get(e.user_id) ?? "Unknown User" }));
    },
    staleTime: 30_000,
  });

  const entries = q.data ?? [];
  if (q.isLoading) return <ListSkeleton />;
  if (!entries.length) return (
    <div className="py-14 text-center space-y-2">
      <LogIn className="h-8 w-8 text-muted-foreground mx-auto opacity-30" />
      <p className="text-[13px] text-muted-foreground">No login activity recorded yet</p>
      <p className="text-[11px] text-muted-foreground/60">Login events are tracked via the retention-on-login function.</p>
    </div>
  );

  return (
    <div className="divide-y divide-border-subtle">
      {entries.map(entry => (
        <div key={entry.id} className="flex items-start gap-3 px-5 py-3.5 hover:bg-surface-2/40 transition-colors">
          <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
            <LogIn className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold text-foreground">{entry.user_name}</p>
            <p className="text-[11px] text-muted-foreground/70 truncate">
              {entry.ip_address ? `IP: ${entry.ip_address}` : "IP: unknown"}
              {entry.user_agent ? ` • ${entry.user_agent.slice(0, 50)}` : ""}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[11px] text-muted-foreground">{formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}</p>
            <p className="text-[10px] text-muted-foreground/60">{format(new Date(entry.created_at), "d MMM, HH:mm")}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Security Alerts tab ────────────────────────────────────────────────── */
function SecurityAlertsTab() {
  const qc = useQueryClient();
  const q = useQuery<Alert[]>({
    queryKey: ["sa_security_alerts"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("security_alerts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(60);
      if (error) throw error;
      return ((data ?? []) as unknown) as Alert[];
    },
    staleTime: 30_000,
  });

  const resolve = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("security_alerts")
        .update({ resolved: true, resolved_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sa_security_alerts"] });
      toast.success("Alert resolved");
    },
  });

  const alerts = q.data ?? [];
  if (q.isLoading) return <ListSkeleton />;
  if (!alerts.length) return (
    <div className="py-14 text-center space-y-2">
      <CheckCircle2 className="h-8 w-8 text-success mx-auto opacity-50" />
      <p className="text-[13px] text-muted-foreground">No security alerts — all clear</p>
    </div>
  );

  return (
    <div className="divide-y divide-border-subtle">
      {alerts.map(alert => (
        <div key={alert.id} className="flex items-start gap-3 px-5 py-3.5 hover:bg-surface-2/40 transition-colors">
          <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
            alert.resolved ? "bg-success/10" : "bg-warning/10")}>
            <AlertTriangle className={cn("h-3.5 w-3.5", alert.resolved ? "text-success" : "text-warning")} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-[12px] font-semibold text-foreground capitalize">
                {alert.alert_type.replace(/_/g, " ")}
              </p>
              <Badge variant={alert.resolved ? "default" : "secondary"} className="text-[10px] h-4 px-1.5">
                {alert.resolved ? "Resolved" : "Open"}
              </Badge>
            </div>
            {alert.details && Object.keys(alert.details).length > 0 && (
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {JSON.stringify(alert.details).slice(0, 100)}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <p className="text-[10px] text-muted-foreground/60">{format(new Date(alert.created_at), "d MMM, HH:mm")}</p>
            {!alert.resolved && (
              <Button
                size="sm"
                variant="ghost"
                className="h-6 text-[10px] px-2 text-success hover:bg-success/10"
                onClick={() => resolve.mutate(alert.id)}
                disabled={resolve.isPending}
              >
                <CheckCircle2 className="h-3 w-3 mr-1" /> Resolve
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Main Security Monitor Component
═══════════════════════════════════════════════════════════ */
export default function SASecurityTab() {
  const metricsQ = useQuery({
    queryKey: ["sa_security_metrics"],
    queryFn: async () => {
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
      const [attendanceTotal, attendanceToday, admins, openAlerts, auditTotal, loginTotal] = await Promise.all([
        supabase.from("attendance_audit_log").select("id", { count: "exact", head: true }),
        supabase.from("attendance_audit_log").select("id", { count: "exact", head: true }).gte("changed_at", todayStart.toISOString()),
        supabase.from("user_roles").select("id", { count: "exact", head: true }).in("role", ["admin", "super_admin"]),
        (supabase as any).from("security_alerts").select("id", { count: "exact", head: true }).eq("resolved", false),
        (supabase as any).from("audit_logs").select("id", { count: "exact", head: true }),
        (supabase as any).from("login_activity").select("id", { count: "exact", head: true }),
      ]);
      return {
        attendanceEditsToday: attendanceToday.count ?? 0,
        attendanceTotal: attendanceTotal.count ?? 0,
        activeAdmins: admins.count ?? 0,
        openAlerts: openAlerts.count ?? 0,
        auditEvents: auditTotal.count ?? 0,
        loginEvents: loginTotal.count ?? 0,
      };
    },
    staleTime: 30_000,
  });

  const m = metricsQ.data;

  const metrics = [
    { label: "Attendance Edits Today", value: m?.attendanceEditsToday, icon: Activity,     color: "text-warning" },
    { label: "Open Alerts",            value: m?.openAlerts,           icon: AlertTriangle, color: "text-danger"  },
    { label: "Active Admins",          value: m?.activeAdmins,         icon: Lock,          color: "text-success" },
    { label: "Audit Events",           value: m?.auditEvents,          icon: Eye,           color: "text-primary" },
    { label: "Login Sessions",         value: m?.loginEvents,          icon: LogIn,         color: "text-info"    },
    { label: "Total Corrections",      value: m?.attendanceTotal,      icon: Clock,         color: "text-purple-500" },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Shield className="h-4.5 w-4.5 text-primary" />
            Security &amp; Audit Monitor
          </h2>
          <p className="text-xs text-muted-foreground">
            Immutable record of all critical actions, attendance corrections &amp; login activity
          </p>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 text-[12px] gap-1.5 text-muted-foreground"
          onClick={() => metricsQ.refetch()}
        >
          <RefreshCw className={cn("h-3.5 w-3.5", metricsQ.isFetching && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Metric grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {metrics.map(m => (
          <MetricCard key={m.label} {...m} loading={metricsQ.isLoading} />
        ))}
      </div>

      {/* Tabbed log views */}
      <div className="rounded-2xl border border-border-subtle bg-surface-1 overflow-hidden shadow-sm">
        <Tabs defaultValue="attendance">
          <div className="px-5 pt-4 pb-0 border-b border-border-subtle">
            <TabsList className="h-8 gap-1 bg-transparent p-0">
              {[
                { value: "attendance", label: "Attendance Edits",  icon: Activity     },
                { value: "audit",      label: "Audit Log",         icon: Eye          },
                { value: "logins",     label: "Login Activity",    icon: LogIn        },
                { value: "alerts",     label: "Security Alerts",   icon: AlertTriangle },
              ].map(tab => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="h-8 px-3 text-[11px] gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg"
                >
                  <tab.icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="attendance" className="mt-0"><AttendanceAuditTab /></TabsContent>
          <TabsContent value="audit"      className="mt-0"><AuditLogTab /></TabsContent>
          <TabsContent value="logins"     className="mt-0"><LoginActivityTab /></TabsContent>
          <TabsContent value="alerts"     className="mt-0"><SecurityAlertsTab /></TabsContent>
        </Tabs>
      </div>

      {/* Danger zone */}
      <ResetStudentsPanel />
    </div>
  );
}
