import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Clock, User, ArrowRightLeft } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

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
      const userIds = [...new Set([
        ...entries.map((e) => e.student_user_id),
        ...entries.map((e) => e.changed_by),
      ])];

      if (userIds.length === 0) return entries;

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name")
        .in("user_id", userIds);

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
      const [total, today] = await Promise.all([
        supabase.from("attendance_audit_log").select("id", { count: "exact", head: true }),
        supabase.from("attendance_audit_log").select("id", { count: "exact", head: true }).gte("changed_at", todayStart.toISOString()),
      ]);
      return { total: total.count ?? 0, today: today.count ?? 0 };
    },
    staleTime: 30_000,
  });

  const entries = auditQuery.data ?? [];
  const metrics = metricsQuery.data;

  const statusBadge = (status: string | null) => {
    if (!status) return <span className="text-muted-foreground text-xs">—</span>;
    const present = status === "present";
    return (
      <Badge variant={present ? "default" : "secondary"} className={`text-[10px] ${present ? "bg-success/15 text-success border-success/20" : "bg-destructive/10 text-destructive border-destructive/20"}`}>
        {status}
      </Badge>
    );
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold text-foreground">Security & Audit Logs</h2>
        <p className="text-xs text-muted-foreground">Immutable record of all attendance modifications</p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-surface-1 border-border-subtle">
          <CardContent className="p-4 flex items-center gap-3">
            <Shield className="w-5 h-5 text-primary shrink-0" />
            <div>
              <p className="text-xl font-bold text-foreground">{metrics?.today ?? "—"}</p>
              <p className="text-xs text-muted-foreground">Edits today</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-surface-1 border-border-subtle">
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="w-5 h-5 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xl font-bold text-foreground">{metrics?.total?.toLocaleString() ?? "—"}</p>
              <p className="text-xs text-muted-foreground">All-time edits</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Log */}
      {auditQuery.isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 rounded-lg bg-surface-2 animate-pulse" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <Card className="bg-surface-1 border-border-subtle border-dashed">
          <CardContent className="py-10 text-center">
            <Shield className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No audit entries yet</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-surface-1 border-border-subtle overflow-hidden">
          <CardHeader className="pb-2 border-b border-border-subtle">
            <CardTitle className="text-sm font-medium">Recent Modifications</CardTitle>
          </CardHeader>
          <div className="divide-y divide-border-subtle/50">
            {entries.map((entry) => (
              <div key={entry.id} className="px-4 py-3 hover:bg-surface-2/40 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-1 text-xs">
                        <User className="w-3 h-3 text-muted-foreground" />
                        <span className="font-medium text-foreground">{entry.student_name}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <ArrowRightLeft className="w-3 h-3" />
                        {statusBadge(entry.old_status)}
                        <span>→</span>
                        {statusBadge(entry.new_status)}
                      </div>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      By <span className="text-foreground/80">{entry.admin_name}</span> · {entry.reason}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[11px] text-muted-foreground">
                      {formatDistanceToNow(new Date(entry.changed_at), { addSuffix: true })}
                    </p>
                    <p className="text-[10px] text-muted-foreground/60">
                      {format(new Date(entry.changed_at), "d MMM, HH:mm")}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
