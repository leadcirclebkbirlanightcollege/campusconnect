import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  FileEdit,
  Search,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  History,
  Pencil,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";

const PAGE_SIZE = 20;

type LectureOption = {
  id: string;
  topic: string;
  lecture_date: string;
  start_time: string;
  status: string;
};

type AttendanceRow = {
  id: string;
  student_user_id: string;
  status: string;
  marked_at: string;
  edited_at: string | null;
  edited_by: string | null;
  lecture_id: string;
};

type ProfileMap = Record<
  string,
  { name: string; student_id: string | null; class_name: string | null; programme?: string }
>;

type AuditEntry = {
  id: string;
  old_status: string | null;
  new_status: string | null;
  reason: string;
  changed_at: string;
  changed_by: string;
};

export default function AdminAttendanceCorrections() {
  const qc = useQueryClient();
  const [selectedLecture, setSelectedLecture] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [page, setPage] = useState(0);

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState<{
    attendanceId: string;
    studentName: string;
    currentStatus: string;
  } | null>(null);
  const [newStatus, setNewStatus] = useState("present");
  const [reason, setReason] = useState("");

  // Reset page when filters change
  useEffect(() => setPage(0), [selectedLecture, studentSearch]);

  // ── Past lectures ──
  const lecturesQuery = useQuery({
    queryKey: ["admin", "corrections", "lectures"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lectures")
        .select("id, topic, lecture_date, start_time, status")
        .order("lecture_date", { ascending: false })
        .order("start_time", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as LectureOption[];
    },
  });

  // ── Attendance rows for selected lecture ──
  const attendanceQuery = useQuery({
    queryKey: ["admin", "corrections", "attendance", selectedLecture],
    enabled: Boolean(selectedLecture),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance")
        .select("id, student_user_id, status, marked_at, edited_at, edited_by, lecture_id")
        .eq("lecture_id", selectedLecture)
        .order("marked_at", { ascending: true })
        .limit(1000);
      if (error) throw error;
      return (data ?? []) as AttendanceRow[];
    },
  });

  // ── Profiles for those students ──
  const profilesQuery = useQuery({
    queryKey: ["admin", "corrections", "profiles", attendanceQuery.data?.map((a) => a.student_user_id).join(",")],
    enabled: Boolean(attendanceQuery.data?.length),
    queryFn: async () => {
      const userIds = [...new Set(attendanceQuery.data!.map((a) => a.student_user_id))];
      if (!userIds.length) return {} as ProfileMap;

      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("user_id, name, student_id, class_name")
        .in("user_id", userIds);
      if (error) throw error;

      // Also fetch programme names
      const { data: allotments } = await supabase
        .from("student_programme_allotments")
        .select("student_user_id, programme_id")
        .in("student_user_id", userIds);

      const progIds = [...new Set((allotments ?? []).map((a) => a.programme_id))];
      let progMap: Record<string, string> = {};
      if (progIds.length) {
        const { data: progs } = await supabase
          .from("programmes")
          .select("id, name")
          .in("id", progIds);
        for (const p of progs ?? []) progMap[p.id] = p.name;
      }

      const allotMap: Record<string, string> = {};
      for (const a of allotments ?? []) {
        allotMap[a.student_user_id] = progMap[a.programme_id] ?? "—";
      }

      const map: ProfileMap = {};
      for (const p of (profiles ?? [])) {
        map[p.user_id] = {
          name: p.name,
          student_id: p.student_id,
          class_name: p.class_name,
          programme: allotMap[p.user_id] ?? "—",
        };
      }
      return map;
    },
  });

  // ── Build display rows ──
  const displayRows = useMemo(() => {
    if (!attendanceQuery.data || !profilesQuery.data) return [];
    const search = studentSearch.toLowerCase().trim();

    return attendanceQuery.data
      .map((a) => {
        const p = profilesQuery.data[a.student_user_id];
        return {
          attendanceId: a.id,
          studentUserId: a.student_user_id,
          name: p?.name ?? "Unknown",
          studentId: p?.student_id ?? "—",
          programme: p?.programme ?? "—",
          className: p?.class_name ?? "—",
          status: a.status,
          markedAt: new Date(a.marked_at).toLocaleString(),
          editedAt: a.edited_at,
          lectureId: a.lecture_id,
        };
      })
      .filter((r) => {
        if (!search) return true;
        return (
          r.name.toLowerCase().includes(search) ||
          r.studentId.toLowerCase().includes(search) ||
          r.programme.toLowerCase().includes(search)
        );
      });
  }, [attendanceQuery.data, profilesQuery.data, studentSearch]);

  const totalPages = Math.max(1, Math.ceil(displayRows.length / PAGE_SIZE));
  const pagedRows = displayRows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // ── Edit mutation ──
  const editMutation = useMutation({
    mutationFn: async () => {
      if (!editRow) throw new Error("No row selected");
      const { data, error } = await supabase.functions.invoke("admin-update-attendance", {
        body: {
          attendanceId: editRow.attendanceId,
          newStatus,
          reason: reason.trim(),
        },
      });
      if (error) throw new Error(error.message);
      if (data && !data.success) throw new Error(data.error || "Update failed");
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Attendance updated: ${data.old_status} → ${data.new_status}`, {
        description: "Intelligence scores will be recalculated.",
      });
      setEditOpen(false);
      setEditRow(null);
      setReason("");
      qc.invalidateQueries({ queryKey: ["admin", "corrections", "attendance"] });
      qc.invalidateQueries({ queryKey: ["admin", "attendance"] });
      qc.invalidateQueries({ queryKey: ["admin", "overview"] });
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : "Failed to update attendance");
    },
  });

  const openEdit = useCallback(
    (row: (typeof displayRows)[0]) => {
      setEditRow({
        attendanceId: row.attendanceId,
        studentName: row.name,
        currentStatus: row.status,
      });
      setNewStatus(row.status === "present" ? "absent" : "present");
      setReason("");
      setEditOpen(true);
    },
    [],
  );

  const canSubmit =
    editRow && reason.trim().length >= 3 && newStatus !== editRow.currentStatus;

  const selectedLectureData = lecturesQuery.data?.find((l) => l.id === selectedLecture);

  return (
    <>
      <Card className="border-primary/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileEdit className="h-5 w-5 text-primary" />
            Attendance Corrections
          </CardTitle>
          <CardDescription>
            Edit historical attendance records. All changes are audited and trigger intelligence recalculation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* ── Filters ── */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1.5">
              <label className="text-sm font-medium">Lecture</label>
              <Select value={selectedLecture} onValueChange={setSelectedLecture}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a lecture…" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {lecturesQuery.data?.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.topic} — {l.lecture_date} {l.start_time}
                      {l.status !== "ended" ? ` (${l.status})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 space-y-1.5">
              <label className="text-sm font-medium">Search student</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Name, ID, or programme…"
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* ── Lecture info ── */}
          {selectedLectureData && (
            <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-sm">
              <span className="font-medium">{selectedLectureData.topic}</span>
              <span className="text-muted-foreground">
                {" · "}
                {selectedLectureData.lecture_date} · {selectedLectureData.start_time}
                {" · "}
              </span>
              <Badge variant="outline" className="text-xs">
                {selectedLectureData.status}
              </Badge>
              <span className="text-muted-foreground ml-2">
                {displayRows.length} record{displayRows.length !== 1 ? "s" : ""}
              </span>
            </div>
          )}

          {/* ── Table ── */}
          {!selectedLecture ? (
            <div className="py-12 text-center text-muted-foreground">
              Select a lecture to view attendance records.
            </div>
          ) : attendanceQuery.isLoading || profilesQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : displayRows.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No attendance records found for this lecture.
            </div>
          ) : (
            <>
              <div className="rounded-lg border border-border/60 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Student ID</TableHead>
                      <TableHead className="hidden md:table-cell">Programme</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden sm:table-cell">Marked At</TableHead>
                      <TableHead className="w-24">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedRows.map((r) => (
                      <TableRow key={r.attendanceId}>
                        <TableCell className="font-medium">{r.name}</TableCell>
                        <TableCell>{r.studentId}</TableCell>
                        <TableCell className="hidden md:table-cell">{r.programme}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Badge
                              variant={r.status === "present" ? "default" : "secondary"}
                              className={
                                r.status === "present"
                                  ? "bg-success text-success-foreground"
                                  : ""
                              }
                            >
                              {r.status}
                            </Badge>
                            {r.editedAt && (
                              <AuditBadge attendanceId={r.attendanceId} />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                          {r.markedAt}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1.5 h-7 px-2"
                            onClick={() => openEdit(r)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <span className="text-sm text-muted-foreground">
                    Page {page + 1} of {totalPages} · {displayRows.length} records
                  </span>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === 0}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages - 1}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Edit Dialog ── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Edit Historical Attendance
            </DialogTitle>
            <DialogDescription>
              This will modify historical attendance for{" "}
              <strong>{editRow?.studentName}</strong> and recalculate intelligence.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Current status</span>
              <Badge
                variant={editRow?.currentStatus === "present" ? "default" : "secondary"}
              >
                {editRow?.currentStatus}
              </Badge>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">New Status</label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Reason <span className="text-destructive">*</span>
              </label>
              <Textarea
                placeholder="Why is this attendance being modified? (min 3 chars)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
            </div>

            <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs text-muted-foreground">
              ⚠️ This will modify historical attendance and recalculate intelligence scores.
              All changes are permanently logged in the audit trail.
            </div>

            {editRow && newStatus === editRow.currentStatus && (
              <p className="text-xs text-muted-foreground">
                Status is already {editRow.currentStatus}. Select a different status.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => editMutation.mutate()}
              disabled={!canSubmit || editMutation.isPending}
            >
              {editMutation.isPending ? "Updating…" : "Confirm Edit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Audit Badge with mini history popover ──
function AuditBadge({ attendanceId }: { attendanceId: string }) {
  const auditQuery = useQuery({
    queryKey: ["admin", "corrections", "audit", attendanceId],
    enabled: false, // only fetch on click
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance_audit_log")
        .select("id, old_status, new_status, reason, changed_at, changed_by")
        .eq("attendance_id", attendanceId)
        .order("changed_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return (data ?? []) as AuditEntry[];
    },
  });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-full border border-warning/40 bg-warning/10 px-2 py-0.5 text-[10px] font-medium text-warning hover:bg-warning/20 transition-colors"
          onClick={() => auditQuery.refetch()}
        >
          <History className="h-3 w-3" />
          Edited
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        <h4 className="font-medium text-sm mb-2">Recent Changes</h4>
        {auditQuery.isLoading ? (
          <div className="text-xs text-muted-foreground">Loading…</div>
        ) : !auditQuery.data?.length ? (
          <div className="text-xs text-muted-foreground">No audit records found.</div>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {auditQuery.data.map((a) => (
              <div key={a.id} className="rounded border border-border/60 p-2 text-xs space-y-1">
                <div className="flex items-center gap-1.5">
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {a.old_status ?? "—"}
                  </Badge>
                  <span>→</span>
                  <Badge variant="default" className="text-[10px] px-1.5 py-0">
                    {a.new_status ?? "—"}
                  </Badge>
                </div>
                <p className="text-muted-foreground">{a.reason}</p>
                <p className="text-muted-foreground/70">
                  {new Date(a.changed_at).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
