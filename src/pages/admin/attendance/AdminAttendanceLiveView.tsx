import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Users, Filter } from "lucide-react";

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
  id: string;
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
  is_verified: boolean;
};

type Row = {
  attendanceId: string;
  studentUserId: string;
  name: string;
  studentId: string;
  department: string;
  className: string;
  status: string;
  timestamp: string;
  isVerified: boolean;
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
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const enabled = Boolean(lectureId);

  // Use RPC for consistent attendance count
  const summaryQuery = useQuery({
    queryKey: ["admin", "attendance", "summary", lectureId],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_lecture_attendance_summary", { p_lecture_id: lectureId });
      if (error) throw error;
      return data as { present_count: number; total_students: number; attendance_percentage: number };
    },
    refetchInterval: 5_000,
  });

  const presentQuery = useQuery({
    queryKey: ["admin", "attendance", "present", lectureId, { verifiedOnly }],
    enabled,
    queryFn: async (): Promise<Row[]> => {
      const { data: attendance, error: aErr } = await supabase
        .from("attendance")
        .select("id,student_user_id,status,marked_at")
        .eq("lecture_id", lectureId)
        .eq("status", "present")
        .order("marked_at", { ascending: true })
        .limit(1000);
      if (aErr) throw aErr;

      const userIds = Array.from(new Set((attendance ?? []).map((a) => a.student_user_id)));
      if (userIds.length === 0) return [];

      let profilesQuery = supabase
        .from("profiles")
        .select("user_id,name,student_id,department,class_name,is_verified")
        .in("user_id", userIds);

      if (verifiedOnly) profilesQuery = profilesQuery.eq("is_verified", true);

      const { data: profiles, error: pErr } = await profilesQuery;
      if (pErr) throw pErr;

      const map: Record<string, ProfileRow> = {};
      for (const p of (profiles ?? []) as ProfileRow[]) map[p.user_id] = p;

      return ((attendance ?? []) as AttendanceRow[])
        .filter((a) => Boolean(map[a.student_user_id]))
        .map((a) => {
          const p = map[a.student_user_id];
          return {
            attendanceId: a.id,
            studentUserId: a.student_user_id,
            name: p?.name ?? a.student_user_id,
            studentId: p?.student_id ?? "—",
            department: p?.department ?? "—",
            className: p?.class_name ?? "—",
            status: a.status,
            timestamp: new Date(a.marked_at).toLocaleString(),
            isVerified: Boolean(p?.is_verified),
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
          presentQuery.refetch();
          summaryQuery.refetch();
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
            <Badge variant="secondary">{summaryQuery.data?.present_count ?? exportRows.length} present</Badge>
            {summaryQuery.data && summaryQuery.data.total_students > 0 && (
              <Badge variant="outline">{summaryQuery.data.attendance_percentage}%</Badge>
            )}
            <Button
              type="button"
              variant={verifiedOnly ? "secondary" : "outline"}
              className="gap-2"
              onClick={() => setVerifiedOnly((v) => !v)}
            >
              <Filter className="h-4 w-4" />
              {verifiedOnly ? "Verified only" : "All"}
            </Button>
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
                    <TableCell className="font-medium">
                      <span className="inline-flex items-center gap-2">
                        {r.name}
                        {r.isVerified ? (
                          <span
                            className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground"
                            aria-label="Verified"
                            title="Verified"
                          >
                            <span className="sr-only">Verified</span>
                            <svg
                              viewBox="0 0 24 24"
                              className="h-3.5 w-3.5"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M20 6 9 17l-5-5" />
                            </svg>
                          </span>
                        ) : null}
                      </span>
                    </TableCell>
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
