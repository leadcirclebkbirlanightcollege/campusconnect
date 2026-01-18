import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";

type Props = {
  userId: string | null;
  onOpenChange: (open: boolean) => void;
};

type Profile = {
  user_id: string;
  name: string;
  email: string;
  phone: string | null;
  student_id: string | null;
  department: string | null;
  class_name: string | null;
  is_deleted: boolean;
  created_at: string;
};

type AttendanceRow = {
  lecture_id: string;
  status: string;
  marked_at: string;
  points_earned: number;
};

type LectureRow = {
  id: string;
  topic: string;
  lecture_date: string;
};

export default function StudentProfileDialog({ userId, onOpenChange }: Props) {
  const open = Boolean(userId);

  const profileQuery = useQuery({
    queryKey: ["admin", "student", userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<Profile | null> => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "user_id,name,email,phone,student_id,department,class_name,is_deleted,created_at",
        )
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as Profile | null;
    },
  });

  const attendanceQuery = useQuery({
    queryKey: ["admin", "student", userId, "attendance"],
    enabled: Boolean(userId),
    queryFn: async (): Promise<{ attendance: AttendanceRow[]; lectures: Record<string, LectureRow> }> => {
      if (!userId) return { attendance: [], lectures: {} };

      const { data: attendance, error: attendanceError } = await supabase
        .from("attendance")
        .select("lecture_id,status,marked_at,points_earned")
        .eq("student_user_id", userId)
        .order("marked_at", { ascending: false })
        .limit(100);
      if (attendanceError) throw attendanceError;

      const lectureIds = Array.from(new Set((attendance ?? []).map((a) => a.lecture_id)));
      if (lectureIds.length === 0) return { attendance: (attendance ?? []) as AttendanceRow[], lectures: {} };

      const { data: lectures, error: lectureError } = await supabase
        .from("lectures")
        .select("id,topic,lecture_date")
        .in("id", lectureIds);
      if (lectureError) throw lectureError;

      const map: Record<string, LectureRow> = {};
      for (const l of lectures ?? []) map[l.id] = l as LectureRow;

      return { attendance: (attendance ?? []) as AttendanceRow[], lectures: map };
    },
  });

  const stats = useMemo(() => {
    const rows = attendanceQuery.data?.attendance ?? [];
    const total = rows.length;
    const present = rows.filter((r) => r.status === "present").length;
    const points = rows.reduce((sum, r) => sum + (r.points_earned ?? 0), 0);
    return { total, present, points };
  }, [attendanceQuery.data]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Student Profile</DialogTitle>
          <DialogDescription>Details, status, and recent attendance history.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <Card className="border-primary/10">
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-3">
                <span>{profileQuery.data?.name ?? "—"}</span>
                {profileQuery.data?.is_deleted ? (
                  <Badge variant="secondary">Deleted</Badge>
                ) : (
                  <Badge className="bg-success text-success-foreground">Active</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              <div className="text-sm">
                <div className="text-muted-foreground">Email</div>
                <div className="font-medium">{profileQuery.data?.email ?? "—"}</div>
              </div>
              <div className="text-sm">
                <div className="text-muted-foreground">Phone</div>
                <div className="font-medium">{profileQuery.data?.phone ?? "—"}</div>
              </div>
              <div className="text-sm">
                <div className="text-muted-foreground">Student ID</div>
                <div className="font-medium">{profileQuery.data?.student_id ?? "—"}</div>
              </div>
              <div className="text-sm">
                <div className="text-muted-foreground">Department / Class</div>
                <div className="font-medium">
                  {(profileQuery.data?.department ?? "—") + " / " + (profileQuery.data?.class_name ?? "—")}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-primary/10">
              <CardHeader>
                <CardTitle className="text-base">Total Records</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">{stats.total}</div>
              </CardContent>
            </Card>
            <Card className="border-accent/10">
              <CardHeader>
                <CardTitle className="text-base">Present</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-accent">{stats.present}</div>
              </CardContent>
            </Card>
            <Card className="border-success/10">
              <CardHeader>
                <CardTitle className="text-base">Points Earned</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-success">{stats.points}</div>
              </CardContent>
            </Card>
          </div>

          <Separator />

          <Card className="border-primary/10">
            <CardHeader>
              <CardTitle className="text-base">Attendance History (latest 100)</CardTitle>
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
                          Loading attendance…
                        </TableCell>
                      </TableRow>
                    ) : (attendanceQuery.data?.attendance ?? []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                          No attendance records found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      attendanceQuery.data!.attendance.map((r) => {
                        const lecture = attendanceQuery.data!.lectures[r.lecture_id];
                        const title = lecture ? `${lecture.topic} • ${lecture.lecture_date}` : r.lecture_id;
                        return (
                          <TableRow key={`${r.lecture_id}-${r.marked_at}`}>
                            <TableCell className="font-medium">{title}</TableCell>
                            <TableCell>
                              {r.status === "present" ? (
                                <Badge className="bg-success text-success-foreground">Present</Badge>
                              ) : (
                                <Badge variant="secondary">Absent</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {format(new Date(r.marked_at), "PPpp")}
                            </TableCell>
                            <TableCell className="text-right font-medium">{r.points_earned}</TableCell>
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
      </DialogContent>
    </Dialog>
  );
}
