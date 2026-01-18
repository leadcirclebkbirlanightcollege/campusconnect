import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Users } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type AttendanceRow = {
  student_user_id: string;
  status: string;
  marked_at: string;
};

type ProfileRow = {
  user_id: string;
  name: string;
  student_id: string | null;
  department: string | null;
  class_name: string | null;
};

type Row = {
  name: string;
  studentId: string;
  department: string;
  className: string;
  status: string;
  timestamp: string;
};

function downloadCsv(filename: string, rows: Row[]) {
  const header = ["Name", "Student ID", "Department", "Class", "Status", "Timestamp"];
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;

  const csv = [
    header.join(","),
    ...rows.map((r) =>
      [r.name, r.studentId, r.department, r.className, r.status, r.timestamp].map(escape).join(","),
    ),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function AdminAttendanceLiveView({ lectureId }: { lectureId: string }) {
  const enabled = Boolean(lectureId);

  const presentQuery = useQuery({
    queryKey: ["admin", "attendance", "present", lectureId],
    enabled,
    queryFn: async (): Promise<Row[]> => {
      const { data: attendance, error: aErr } = await supabase
        .from("attendance")
        .select("student_user_id,status,marked_at")
        .eq("lecture_id", lectureId)
        .eq("status", "present")
        .order("marked_at", { ascending: true })
        .limit(1000);
      if (aErr) throw aErr;

      const userIds = Array.from(new Set((attendance ?? []).map((a) => a.student_user_id)));
      if (userIds.length === 0) return [];

      const { data: profiles, error: pErr } = await supabase
        .from("profiles")
        .select("user_id,name,student_id,department,class_name")
        .in("user_id", userIds);
      if (pErr) throw pErr;

      const map: Record<string, ProfileRow> = {};
      for (const p of (profiles ?? []) as ProfileRow[]) map[p.user_id] = p;

      return ((attendance ?? []) as AttendanceRow[]).map((a) => {
        const p = map[a.student_user_id];
        return {
          name: p?.name ?? a.student_user_id,
          studentId: p?.student_id ?? "—",
          department: p?.department ?? "—",
          className: p?.class_name ?? "—",
          status: a.status,
          timestamp: new Date(a.marked_at).toLocaleString(),
        };
      });
    },
    refetchInterval: 5_000,
  });

  useEffect(() => {
    if (!enabled) return;

    const channel = supabase
      .channel(`admin_attendance_live_${lectureId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "attendance", filter: `lecture_id=eq.${lectureId}` },
        () => {
          // react-query refetch interval covers it, but this makes it feel instant
          presentQuery.refetch();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, lectureId]);

  const exportRows = useMemo(() => presentQuery.data ?? [], [presentQuery.data]);

  if (!enabled) return null;

  return (
    <Card className="border-primary/10">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Live Check-ins
            </CardTitle>
            <CardDescription>Realtime list of students marked present for this lecture.</CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{exportRows.length} present</Badge>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => {
                try {
                  downloadCsv(`attendance-${lectureId}.csv`, exportRows);
                } catch {
                  toast.error("Failed to export");
                }
              }}
              disabled={exportRows.length === 0}
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="rounded-lg border border-border/60 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Student ID</TableHead>
                <TableHead className="hidden md:table-cell">Department</TableHead>
                <TableHead className="hidden md:table-cell">Class</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {presentQuery.isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    Loading live attendance…
                  </TableCell>
                </TableRow>
              ) : exportRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    No students checked in yet.
                  </TableCell>
                </TableRow>
              ) : (
                exportRows.map((r) => (
                  <TableRow key={`${r.studentId}-${r.timestamp}`}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell>{r.studentId}</TableCell>
                    <TableCell className="hidden md:table-cell">{r.department}</TableCell>
                    <TableCell className="hidden md:table-cell">{r.className}</TableCell>
                    <TableCell>
                      <Badge className="bg-success text-success-foreground">Present</Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">{r.timestamp}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
