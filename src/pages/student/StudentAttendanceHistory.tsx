import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  lecture_id: string;
  status: "present" | "absent" | string;
  marked_at: string;
  points_earned: number;
};

type LectureRow = {
  id: string;
  topic: string;
  lecture_date: string;
  start_time: string;
  end_time: string;
};

type Filters = {
  lectureId: string;
  from: string;
  to: string;
};

export default function StudentAttendanceHistory() {
  const [filters, setFilters] = useState<Filters>({ lectureId: "all", from: "", to: "" });

  const lecturesQuery = useQuery({
    queryKey: ["student", "lectures", "all"],
    queryFn: async (): Promise<LectureRow[]> => {
      const { data, error } = await supabase
        .from("lectures")
        .select("id,topic,lecture_date,start_time,end_time")
        .order("lecture_date", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as LectureRow[];
    },
  });

  const attendanceQuery = useQuery({
    queryKey: ["student", "attendance", filters],
    queryFn: async (): Promise<AttendanceRow[]> => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return [];

      let q = supabase
        .from("attendance")
        .select("id,lecture_id,status,marked_at,points_earned")
        .eq("student_user_id", userData.user.id)
        .order("marked_at", { ascending: false })
        .limit(500);

      if (filters.lectureId !== "all") q = q.eq("lecture_id", filters.lectureId);
      if (filters.from) q = q.gte("marked_at", new Date(filters.from).toISOString());
      if (filters.to) {
        const end = new Date(filters.to);
        end.setHours(23, 59, 59, 999);
        q = q.lte("marked_at", end.toISOString());
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as AttendanceRow[];
    },
  });

  const lectureMap = useMemo(() => {
    const map: Record<string, LectureRow> = {};
    for (const l of lecturesQuery.data ?? []) map[l.id] = l;
    return map;
  }, [lecturesQuery.data]);

  const totals = useMemo(() => {
    const rows = attendanceQuery.data ?? [];
    const present = rows.filter((r) => r.status === "present").length;
    const pct = rows.length > 0 ? Math.round((present / rows.length) * 100) : 0;
    return { total: rows.length, present, pct };
  }, [attendanceQuery.data]);

  return (
    <div className="space-y-4">
      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <SummaryItem label="Total Lectures" value={String(totals.total)} loading={attendanceQuery.isLoading} />
        <SummaryItem label="Present" value={String(totals.present)} loading={attendanceQuery.isLoading} />
        <SummaryItem label="Absent" value={String(totals.total - totals.present)} loading={attendanceQuery.isLoading} />
        <SummaryItem label="Attendance %" value={`${totals.pct}%`} loading={attendanceQuery.isLoading} />
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-48">
          <Select value={filters.lectureId} onValueChange={(v) => setFilters((p) => ({ ...p, lectureId: v }))}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="All lectures" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All lectures</SelectItem>
              {(lecturesQuery.data ?? []).map((l) => (
                <SelectItem key={l.id} value={l.id}>{l.lecture_date} — {l.topic}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground uppercase tracking-wide">From</label>
          <input
            type="date"
            value={filters.from}
            onChange={(e) => setFilters((p) => ({ ...p, from: e.target.value }))}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground uppercase tracking-wide">To</label>
          <input
            type="date"
            value={filters.to}
            onChange={(e) => setFilters((p) => ({ ...p, to: e.target.value }))}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          />
        </div>
        {(filters.lectureId !== "all" || filters.from || filters.to) && (
          <Button variant="outline" size="sm" className="h-9 text-xs" onClick={() => setFilters({ lectureId: "all", from: "", to: "" })}>
            Reset
          </Button>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Lecture</TableHead>
                  <TableHead className="w-24">Status</TableHead>
                  <TableHead>Marked At</TableHead>
                  <TableHead className="text-right w-20">Points</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendanceQuery.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">Loading...</TableCell>
                  </TableRow>
                ) : (attendanceQuery.data ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">No records found.</TableCell>
                  </TableRow>
                ) : (
                  (attendanceQuery.data ?? []).map((r) => {
                    const l = lectureMap[r.lecture_id];
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(r.marked_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-sm font-medium">{l ? l.topic : r.lecture_id.slice(0, 8)}</TableCell>
                        <TableCell>
                          <Badge
                            variant={r.status === "present" ? "default" : "secondary"}
                            className={`text-[10px] ${r.status === "present" ? "bg-success text-success-foreground" : ""}`}
                          >
                            {r.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(r.marked_at).toLocaleTimeString()}
                        </TableCell>
                        <TableCell className="text-right text-sm font-medium tabular-nums">{r.points_earned}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryItem({ label, value, loading }: { label: string; value: string; loading: boolean }) {
  if (loading) {
    return (
      <Card>
        <CardContent className="py-3.5 space-y-1.5">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-6 w-10" />
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardContent className="py-3.5">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="text-xl font-semibold text-foreground mt-0.5">{value}</p>
      </CardContent>
    </Card>
  );
}
