import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { CalendarDays, Filter, Medal, ReceiptText, TicketCheck, ArrowLeft, BadgeCheck } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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

type LedgerRow = {
  id: string;
  points: number;
  source: string;
  source_id: string | null;
  note: string | null;
  created_at: string;
};

type Filters = {
  lectureId: string;
  from: string;
  to: string;
};

export default function StudentAttendanceHistory() {
  const [filters, setFilters] = useState<Filters>({
    lectureId: "all",
    from: "",
    to: "",
  });

  const meQuery = useQuery({
    queryKey: ["student", "me"],
    queryFn: async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      return data.user ?? null;
    },
  });

  const verifiedQuery = useQuery({
    queryKey: ["student", "verified", meQuery.data?.id],
    enabled: Boolean(meQuery.data?.id),
    queryFn: async () => {
      const uid = meQuery.data!.id;
      const { data, error } = await supabase
        .from("profiles")
        .select("is_verified")
        .eq("user_id", uid)
        .maybeSingle();
      if (error) throw error;
      return Boolean(data?.is_verified);
    },
  });

  const lecturesQuery = useQuery({
    queryKey: ["student", "lectures", "all"],
    queryFn: async (): Promise<LectureRow[]> => {
      const { data, error } = await supabase
        .from("lectures")
        .select("id,topic,lecture_date,start_time,end_time")
        .order("lecture_date", { ascending: false })
        .order("start_time", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as LectureRow[];
    },
  });

  const attendanceQuery = useQuery({
    queryKey: ["student", "attendance", filters],
    queryFn: async (): Promise<AttendanceRow[]> => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
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
        // include full day
        const end = new Date(filters.to);
        end.setHours(23, 59, 59, 999);
        q = q.lte("marked_at", end.toISOString());
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as AttendanceRow[];
    },
  });

  const ledgerQuery = useQuery({
    queryKey: ["student", "points", "attendance-ledger"],
    queryFn: async (): Promise<LedgerRow[]> => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!userData.user) return [];

      const { data, error } = await supabase
        .from("points_ledger")
        .select("id,points,source,source_id,note,created_at")
        .eq("user_id", userData.user.id)
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return (data ?? []) as LedgerRow[];
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
    const points = rows.reduce((sum, r) => sum + (r.points_earned ?? 0), 0);
    return { total: rows.length, present, points };
  }, [attendanceQuery.data]);

  const pointsBreakdown = useMemo(() => {
    const rows = ledgerQuery.data ?? [];
    const bySource: Record<string, number> = {};
    for (const r of rows) {
      bySource[r.source] = (bySource[r.source] ?? 0) + (r.points ?? 0);
    }
    return bySource;
  }, [ledgerQuery.data]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <Button asChild variant="outline" className="gap-2">
          <Link to="/student">
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Link>
        </Button>
      </div>

      <div className="mb-8">
        <h1 className="text-4xl font-bold bg-gradient-premium bg-clip-text text-transparent mb-2 inline-flex items-center gap-2">
          Attendance
          {verifiedQuery.data ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              <BadgeCheck className="h-3 w-3" /> Verified
            </span>
          ) : null}
        </h1>
        <p className="text-muted-foreground">Filter your history and review points earned.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-primary/10">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TicketCheck className="h-4 w-4 text-primary" />
              Records
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{totals.total}</div>
            <div className="text-sm text-muted-foreground mt-1">{totals.present} present</div>
          </CardContent>
        </Card>
        <Card className="border-accent/10">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Medal className="h-4 w-4 text-accent" />
              Points (from attendance)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-accent">{totals.points}</div>
            <div className="text-sm text-muted-foreground mt-1">Based on your attendance rows</div>
          </CardContent>
        </Card>
        <Card className="border-primary/10">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ReceiptText className="h-4 w-4 text-primary" />
              Ledger breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {Object.keys(pointsBreakdown).length === 0 ? (
              <div className="text-sm text-muted-foreground">No point entries yet.</div>
            ) : (
              Object.entries(pointsBreakdown).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{k}</span>
                  <span className="font-medium">{v}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 border-primary/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-primary" />
            Filters
          </CardTitle>
          <CardDescription>Filter by lecture and date range.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <Select value={filters.lectureId} onValueChange={(v) => setFilters((p) => ({ ...p, lectureId: v }))}>
            <SelectTrigger>
              <SelectValue placeholder="Lecture" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All lectures</SelectItem>
              {(lecturesQuery.data ?? []).map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.lecture_date} • {l.topic}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="space-y-1">
            <div className="text-sm font-medium flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" /> From
            </div>
            <input
              type="date"
              value={filters.from}
              onChange={(e) => setFilters((p) => ({ ...p, from: e.target.value }))}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            />
          </div>

          <div className="space-y-1">
            <div className="text-sm font-medium flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" /> To
            </div>
            <input
              type="date"
              value={filters.to}
              onChange={(e) => setFilters((p) => ({ ...p, to: e.target.value }))}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6 border-primary/10">
        <CardHeader>
          <CardTitle>Attendance History</CardTitle>
          <CardDescription>Latest records (filtered).</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border/60 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lecture</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Marked at</TableHead>
                  <TableHead className="text-right">Points</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendanceQuery.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : (attendanceQuery.data ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                      No attendance records found.
                    </TableCell>
                  </TableRow>
                ) : (
                  (attendanceQuery.data ?? []).map((r) => {
                    const l = lectureMap[r.lecture_id];
                    const title = l ? `${l.lecture_date} • ${l.topic}` : r.lecture_id;
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{title}</TableCell>
                        <TableCell>
                          {r.status === "present" ? (
                            <Badge className="bg-success text-success-foreground">Present</Badge>
                          ) : (
                            <Badge variant="secondary">{r.status}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(r.marked_at).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-medium">{r.points_earned}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <Separator className="my-4" />

          <Card className="border-primary/10">
            <CardHeader>
              <CardTitle className="text-base">Points Ledger (latest 300)</CardTitle>
              <CardDescription>Full point history, including attendance entries.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-border/60 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>When</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Note</TableHead>
                      <TableHead className="text-right">Points</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ledgerQuery.isLoading ? (
                      <TableRow>
                        <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                          Loading…
                        </TableCell>
                      </TableRow>
                    ) : (ledgerQuery.data ?? []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                          No ledger entries.
                        </TableCell>
                      </TableRow>
                    ) : (
                      (ledgerQuery.data ?? []).map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(r.created_at).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{r.source}</Badge>
                          </TableCell>
                          <TableCell className="text-sm">{r.note ?? "—"}</TableCell>
                          <TableCell className="text-right font-medium">{r.points}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}
