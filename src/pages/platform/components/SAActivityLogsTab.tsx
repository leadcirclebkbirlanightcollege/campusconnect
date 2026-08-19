import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SlideUp, FadeIn } from "@/components/ui/motion";
import { Shield, Search, Clock, User, ArrowRight, RefreshCw, Filter } from "@/components/icons";
import { formatDistanceToNow, format } from "date-fns";

type AuditEntry = {
  id: string;
  attendance_id: string | null;
  lecture_id: string;
  student_user_id: string;
  changed_by: string;
  changed_at: string;
  old_status: string | null;
  new_status: string | null;
  reason: string;
};

type ProfileMap = Record<string, string>;

const STATUS_COLOR: Record<string, string> = {
  present: "bg-success/10 text-success border-success/20",
  absent: "bg-destructive/10 text-destructive border-destructive/20",
  late: "bg-amber-500/10 text-amber-400 border-amber-500/20",
};

export default function SAActivityLogsTab() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 25;

  // Audit log entries
  const { data: logs = [], isLoading, refetch, isFetching } = useQuery<AuditEntry[]>({
    queryKey: ["sa_audit_logs", page],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance_audit_log")
        .select("*")
        .order("changed_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 20_000,
  });

  // Fetch profile names for changed_by IDs
  const changedByIds = [...new Set(logs.map(l => l.changed_by).filter(Boolean))];
  const studentIds = [...new Set(logs.map(l => l.student_user_id).filter(Boolean))];
  const allIds = [...new Set([...changedByIds, ...studentIds])];

  const { data: profileMap = {} } = useQuery<ProfileMap>({
    queryKey: ["sa_audit_profiles", allIds.join(",")],
    queryFn: async () => {
      if (allIds.length === 0) return {};
      const { data } = await supabase
        .from("profiles")
        .select("user_id, name, email")
        .in("user_id", allIds);
      const map: ProfileMap = {};
      (data ?? []).forEach(p => { map[p.user_id] = p.name ?? p.email ?? p.user_id.slice(0, 8); });
      return map;
    },
    enabled: allIds.length > 0,
    staleTime: 120_000,
  });

  const filtered = logs.filter(l => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (profileMap[l.changed_by] ?? "").toLowerCase().includes(q) ||
      (profileMap[l.student_user_id] ?? "").toLowerCase().includes(q) ||
      l.reason.toLowerCase().includes(q) ||
      (l.old_status ?? "").includes(q) ||
      (l.new_status ?? "").includes(q)
    );
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <FadeIn>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-base font-semibold text-foreground">Activity Logs</h2>
            <p className="text-xs text-muted-foreground">All attendance corrections &amp; admin actions (immutable)</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs gap-1">
              <Shield className="w-3 h-3" />
              Append-only
            </Badge>
            <Button
              variant="ghost" size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>
      </FadeIn>

      {/* Search + Filter bar */}
      <SlideUp>
        <div className="flex gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by user, action, status…"
              className="pl-9 h-9 text-xs bg-background border-border-subtle"
            />
          </div>
          <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs border-border-subtle">
            <Filter className="w-3.5 h-3.5" />
            Filter
          </Button>
        </div>
      </SlideUp>

      {/* Log table */}
      <SlideUp delay={0.04}>
        <Card className="bg-surface-1 border-border-subtle">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              Attendance Audit Trail
              <Badge variant="secondary" className="ml-auto text-[10px]">{filtered.length} entries</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(6)].map((_, i) => <div key={i} className="h-14 rounded-lg bg-surface-2 animate-pulse" />)}
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">
                {search ? "No results match your search." : "No audit logs recorded yet."}
              </p>
            ) : (
              <div className="space-y-2">
                {filtered.map((entry, i) => (
                  <SlideUp key={entry.id} delay={i * 0.02}>
                    <div className="rounded-lg bg-surface-2 border border-border-subtle p-3">
                      <div className="flex items-start gap-3">
                        {/* Status change */}
                        <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                          {entry.old_status && (
                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 border ${STATUS_COLOR[entry.old_status] ?? ""}`}>
                              {entry.old_status}
                            </Badge>
                          )}
                          {entry.old_status && <ArrowRight className="w-3 h-3 text-muted-foreground" />}
                          {entry.new_status && (
                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 border ${STATUS_COLOR[entry.new_status] ?? ""}`}>
                              {entry.new_status}
                            </Badge>
                          )}
                          {!entry.old_status && !entry.new_status && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">manual</Badge>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          {/* Who changed whom */}
                          <div className="flex items-center gap-1 flex-wrap">
                            <User className="w-3 h-3 text-muted-foreground shrink-0" />
                            <span className="text-xs font-medium text-foreground">
                              {profileMap[entry.changed_by] ?? entry.changed_by.slice(0, 8) + "…"}
                            </span>
                            <span className="text-xs text-muted-foreground">edited</span>
                            <span className="text-xs font-medium text-foreground">
                              {profileMap[entry.student_user_id] ?? entry.student_user_id.slice(0, 8) + "…"}
                            </span>
                          </div>

                          {/* Reason */}
                          <p className="text-xs text-muted-foreground mt-0.5 italic">"{entry.reason}"</p>

                          {/* Timestamp */}
                          <div className="flex items-center gap-1 mt-1">
                            <Clock className="w-3 h-3 text-muted-foreground/50" />
                            <span className="text-[10px] text-muted-foreground/60">
                              {format(new Date(entry.changed_at), "MMM d, yyyy 'at' HH:mm")}
                              {" · "}
                              {formatDistanceToNow(new Date(entry.changed_at), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </SlideUp>
                ))}
              </div>
            )}

            {/* Pagination */}
            {!isLoading && (
              <div className="flex items-center justify-between pt-4 border-t border-border-subtle mt-4">
                <span className="text-xs text-muted-foreground">Page {page + 1}</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="h-8 text-xs border-border-subtle" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                    Previous
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 text-xs border-border-subtle" disabled={logs.length < PAGE_SIZE} onClick={() => setPage(p => p + 1)}>
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </SlideUp>
    </div>
  );
}
