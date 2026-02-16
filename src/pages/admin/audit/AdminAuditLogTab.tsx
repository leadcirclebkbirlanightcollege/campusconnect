import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { FileText, ArrowRight, Filter, ChevronLeft, ChevronRight } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const PAGE_SIZE = 20;

export default function AdminAuditLogTab() {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");

  const auditQuery = useQuery({
    queryKey: ["admin", "audit_log", page],
    queryFn: async () => {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error, count } = await supabase
        .from("attendance_audit_log")
        .select("*", { count: "exact" })
        .order("changed_at", { ascending: false })
        .range(from, to);

      if (error) throw error;
      return { rows: data ?? [], total: count ?? 0 };
    },
  });

  // Fetch profiles for display names
  const adminIds = [...new Set((auditQuery.data?.rows ?? []).map((r) => r.changed_by))];
  const studentIds = [...new Set((auditQuery.data?.rows ?? []).map((r) => r.student_user_id))];
  const allIds = [...new Set([...adminIds, ...studentIds])];

  const profilesQuery = useQuery({
    queryKey: ["admin", "audit_profiles", allIds.join(",")],
    enabled: allIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, name")
        .in("user_id", allIds);
      const map: Record<string, string> = {};
      for (const p of data ?? []) map[p.user_id] = p.name;
      return map;
    },
  });

  const getName = (id: string) => profilesQuery.data?.[id] ?? id.slice(0, 8);

  const todayEdits = (auditQuery.data?.rows ?? []).filter(
    (r) => new Date(r.changed_at).toDateString() === new Date().toDateString()
  ).length;

  const rows = (auditQuery.data?.rows ?? []).filter((r) => {
    if (!search) return true;
    const s = search.toLowerCase();
    const name = getName(r.student_user_id).toLowerCase();
    const admin = getName(r.changed_by).toLowerCase();
    return name.includes(s) || admin.includes(s) || r.reason?.toLowerCase().includes(s);
  });

  const totalPages = Math.ceil((auditQuery.data?.total ?? 0) / PAGE_SIZE);

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card className="border-border/50">
          <CardContent className="pt-4 pb-3">
            <div className="text-xs text-muted-foreground">Total Edits (All Time)</div>
            <div className="text-2xl font-bold">{auditQuery.data?.total ?? "—"}</div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-4 pb-3">
            <div className="text-xs text-muted-foreground">Edits Today</div>
            <div className="text-2xl font-bold">{todayEdits}</div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-4 pb-3">
            <div className="text-xs text-muted-foreground">Unique Admins</div>
            <div className="text-2xl font-bold">{adminIds.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-primary/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Attendance Audit Log
          </CardTitle>
          <CardDescription>Immutable record of all historical attendance modifications.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search student, admin, or reason…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
          </div>

          <div className="rounded-lg border border-border/60 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Status Change</TableHead>
                  <TableHead className="hidden md:table-cell">Reason</TableHead>
                  <TableHead className="hidden sm:table-cell">Changed By</TableHead>
                  <TableHead className="text-right">Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditQuery.isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-40" /></TableCell>
                      <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-28 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                      No audit records found.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{getName(r.student_user_id)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Badge variant={r.old_status === "present" ? "default" : "secondary"} className="text-xs">
                            {r.old_status ?? "—"}
                          </Badge>
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          <Badge variant={r.new_status === "present" ? "default" : "secondary"} className="text-xs">
                            {r.new_status ?? "—"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground max-w-[200px] truncate">
                        {r.reason}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm">{getName(r.changed_by)}</TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {format(new Date(r.changed_at), "dd MMM yyyy, HH:mm")}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Page {page + 1} of {totalPages}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
