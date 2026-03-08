import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, Clock, User, ArrowRight, Lock, Activity } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

type AuditEntry = {
  id: string;
  student_user_id: string;
  changed_by: string;
  changed_at: string;
  lecture_id: string;
  old_status: string | null;
  new_status: string | null;
  reason: string;
  student_name?: string;
  admin_name?: string;
};

const STATUS_STYLE: Record<string, string> = {
  present: "bg-success/10 text-success border-success/20",
  absent: "bg-danger/10 text-danger border-danger/20",
};

export default function SASecurityTab() {
  const auditQuery = useQuery<AuditEntry[]>({
    queryKey: ["sa_audit_log"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance_audit_log")
        .select("*")
        .order("changed_at", { ascending: false })
        .limit(100);
      if (error) throw error;

      const entries = (data ?? []) as AuditEntry[];
      const userIds = [...new Set([...entries.map((e) => e.student_user_id), ...entries.map((e) => e.changed_by)])];
      if (userIds.length === 0) return entries;

      const { data: profiles } = await supabase.from("profiles").select("user_id, name").in("user_id", userIds);
      const nameMap = new Map((profiles ?? []).map((p) => [p.user_id, p.name]));
      return entries.map((e) => ({
        ...e,
        student_name: nameMap.get(e.student_user_id) ?? "Unknown Student",
        admin_name: nameMap.get(e.changed_by) ?? "Unknown Admin",
      }));
    },
    staleTime: 30_000,
  });

  const metricsQuery = useQuery({
    queryKey: ["sa_audit_metrics"],
    queryFn: async () => {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const [total, today, admins] = await Promise.all([
        supabase.from("attendance_audit_log").select("id", { count: "exact", head: true }),
        supabase.from("attendance_audit_log").select("id", { count: "exact", head: true }).gte("changed_at", todayStart.toISOString()),
        supabase.from("user_roles").select("id", { count: "exact", head: true }).in("role", ["admin", "super_admin"]),
      ]);
      return { total: total.count ?? 0, today: today.count ?? 0, admins: admins.count ?? 0 };
    },
    staleTime: 30_000,
  });

  const entries = auditQuery.data ?? [];
  const metrics = metricsQuery.data;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold text-foreground">Security &amp; Audit Monitor</h2>
        <p className="text-xs text-muted-foreground">Immutable record of all attendance modifications &amp; system events</p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Edits Today",   value: metrics?.today,  icon: Activity, bg: "bg-warning/10", color: "text-warning" },
          { label: "Total Edits",   value: metrics?.total,  icon: Clock,    bg: "bg-primary/10", color: "text-primary" },
          { label: "Active Admins", value: metrics?.admins, icon: Lock,     bg: "bg-success/10", color: "text-success" },
        ].map(({ label, value, icon: Icon, bg, color }) => (
          <div key={label} className="rounded-2xl border border-border-subtle bg-surface-1 p-4 shadow-xs dashboard-panel">
            <div className="flex items-center gap-3">
              <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0", bg)}>
                <Icon className={cn("h-4 w-4", color)} />
              </div>
              <div>
                {metricsQuery.isLoading ? <Skeleton className="h-6 w-10" /> : (
                  <p className="text-xl font-bold text-foreground tabular-nums">{(value ?? 0).toLocaleString()}</p>
                )}
                <p className="text-[11px] text-muted-foreground">{label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Audit log */}
      <div className="rounded-2xl border border-border-subtle bg-surface-1 overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Shield className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-foreground">Attendance Audit Trail</p>
              <p className="text-[11px] text-muted-foreground">All corrections — append-only &amp; immutable</p>
            </div>
          </div>
          <Badge variant="secondary" className="text-[10px]">{entries.length} entries</Badge>
        </div>

        {auditQuery.isLoading ? (
          <div className="p-5 space-y-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
          </div>
        ) : entries.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <Shield className="h-8 w-8 text-muted-foreground mx-auto opacity-40" />
            <p className="text-[13px] text-muted-foreground">No audit entries yet</p>
          </div>
        ) : (
          <div className="divide-y divide-border-subtle">
            {entries.map((entry) => (
              <div key={entry.id} className="flex items-start gap-3 px-5 py-3.5 hover:bg-surface-2/50 transition-colors">
                <div className="h-7 w-7 rounded-full bg-surface-3 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[12px] font-semibold text-foreground">{entry.admin_name}</span>
                    <span className="text-[11px] text-muted-foreground">edited</span>
                    <span className="text-[12px] font-medium text-foreground">{entry.student_name}</span>
                    <div className="flex items-center gap-1 ml-1">
                      {entry.old_status && (
                        <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 border", STATUS_STYLE[entry.old_status] ?? "")}>
                          {entry.old_status}
                        </Badge>
                      )}
                      {entry.old_status && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
                      {entry.new_status && (
                        <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 border", STATUS_STYLE[entry.new_status] ?? "")}>
                          {entry.new_status}
                        </Badge>
                      )}
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
        )}
      </div>
    </div>
  );
}
