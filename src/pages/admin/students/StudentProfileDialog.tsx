import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { toast } from "sonner";
import { Mail } from "lucide-react";

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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  is_verified: boolean;
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
  const qc = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    student_id: "",
    department: "",
    class_name: "",
  });

  const profileQuery = useQuery({
    queryKey: ["admin", "student", userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<Profile | null> => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id,name,email,phone,student_id,department,class_name,is_deleted,is_verified,created_at")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as Profile | null;
    },
  });

  useEffect(() => {
    // reset edit state whenever a new user is opened
    setIsEditing(false);

    const p = profileQuery.data;
    setForm({
      name: p?.name ?? "",
      phone: p?.phone ?? "",
      student_id: p?.student_id ?? "",
      department: p?.department ?? "",
      class_name: p?.class_name ?? "",
    });
  }, [userId, profileQuery.data]);

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Missing userId");
      if (!form.name.trim()) throw new Error("Name is required");

      const { error } = await supabase
        .from("profiles")
        .update({
          name: form.name.trim(),
          phone: form.phone.trim() ? form.phone.trim() : null,
          student_id: form.student_id.trim() ? form.student_id.trim() : null,
          department: form.department.trim() ? form.department.trim() : null,
          class_name: form.class_name.trim() ? form.class_name.trim() : null,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Student details updated");
      setIsEditing(false);
      await qc.invalidateQueries({ queryKey: ["admin", "students"] });
      await qc.invalidateQueries({ queryKey: ["admin", "student", userId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to update profile"),
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
              <CardTitle className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-2">
                    {profileQuery.data?.name ?? "—"}
                    {profileQuery.data?.is_verified ? (
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
                  {profileQuery.data?.is_deleted ? (
                    <Badge variant="secondary">Deleted</Badge>
                  ) : (
                    <Badge className="bg-success text-success-foreground">Active</Badge>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {isEditing ? (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsEditing(false);
                          const p = profileQuery.data;
                          setForm({
                            name: p?.name ?? "",
                            phone: p?.phone ?? "",
                            student_id: p?.student_id ?? "",
                            department: p?.department ?? "",
                            class_name: p?.class_name ?? "",
                          });
                        }}
                        disabled={updateProfileMutation.isPending}
                      >
                        Cancel
                      </Button>
                      <Button onClick={() => updateProfileMutation.mutate()} disabled={updateProfileMutation.isPending}>
                        {updateProfileMutation.isPending ? "Saving…" : "Save"}
                      </Button>
                    </>
                  ) : (
                    <Button variant="outline" onClick={() => setIsEditing(true)}>
                      Edit
                    </Button>
                  )}
                </div>
              </CardTitle>
            </CardHeader>

            <CardContent className="grid gap-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="text-sm">
                  <div className="text-muted-foreground">Email</div>
                  <div className="font-medium">{profileQuery.data?.email ?? "—"}</div>
                </div>

                {isEditing ? (
                  <div className="grid gap-2">
                    <Label htmlFor="sp-name">Full name</Label>
                    <Input
                      id="sp-name"
                      value={form.name}
                      onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    />
                  </div>
                ) : null}
              </div>

              {isEditing ? (
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="sp-phone">Phone</Label>
                    <Input
                      id="sp-phone"
                      value={form.phone}
                      onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="sp-studentid">Student ID</Label>
                    <Input
                      id="sp-studentid"
                      value={form.student_id}
                      onChange={(e) => setForm((p) => ({ ...p, student_id: e.target.value }))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="sp-dept">Department</Label>
                    <Input
                      id="sp-dept"
                      value={form.department}
                      onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="sp-class">Class</Label>
                    <Input
                      id="sp-class"
                      value={form.class_name}
                      onChange={(e) => setForm((p) => ({ ...p, class_name: e.target.value }))}
                    />
                  </div>
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="text-sm">
                    <div className="text-muted-foreground">Phone</div>
                    <div className="font-medium">{profileQuery.data?.phone ?? "—"}</div>
                  </div>
                  <div className="text-sm">
                    <div className="text-muted-foreground">Student ID</div>
                    <div className="font-medium">{profileQuery.data?.student_id ?? "—"}</div>
                  </div>
                  <div className="text-sm">
                    <div className="text-muted-foreground">Department</div>
                    <div className="font-medium">{profileQuery.data?.department ?? "—"}</div>
                  </div>
                  <div className="text-sm">
                    <div className="text-muted-foreground">Class</div>
                    <div className="font-medium">{profileQuery.data?.class_name ?? "—"}</div>
                  </div>
                </div>
              )}
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
