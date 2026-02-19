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

type CorrectionRow = {
  attendance_id: string;
  student_user_id: string;
  student_name: string;
  student_id: string;
  programme: string;
  status: string;
  marked_at: string;
  edited_at: string | null;
  total_count: number;
};

type AuditEntry = {
  id: string;
  old_status: string | null;
  new_status: string | null;
  reason: string;
  changed_at: string;
  changed_by: string;
};

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export default function AdminAttendanceCorrections() {
  const qc = useQueryClient();

  const [selectedLecture, setSelectedLecture] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [page, setPage] = useState(0);

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState<{
    attendanceId: string;
    studentName: string;
    currentStatus: string;
    studentUserId: string;
    lectureId: string;
  } | null>(null);
  const [newStatus, setNewStatus] = useState("present");
  const [reason, setReason] = useState("");

  useEffect(() => setPage(0), [selectedLecture, studentSearch, startDate, endDate]);

  // Past lectures only
  const lecturesQuery = useQuery({
    queryKey: ["admin", "corrections", "lectures"],
    queryFn: async () => {
      const today = todayIsoDate();
      const { data, error } = await supabase
        .from("lectures")
        .select("id, topic, lecture_date, start_time, status")
        .lt("lecture_date", today)
        .order("lecture_date", { ascending: false })
        .order("start_time", { ascending: false })
        .limit(300);
      if (error) throw error;
      return (data ?? []) as LectureOption[];
    },
  });

  const correctionsQuery = useQuery<{ rows: CorrectionRow[]; total: number }>({
    queryKey: [
      "admin",
      "corrections",
      "rows",
      {
        selectedLecture,
        studentSearch,
        startDate,
        endDate,
        page,
        pageSize: PAGE_SIZE,
      },
    ],
    enabled: Boolean(selectedLecture),
    queryFn: async () => {
      const p_start_date = startDate ? startDate : null;
      const p_end_date = endDate ? endDate : null;

      const { data, error } = await supabase.rpc("admin_get_attendance_corrections", {
        p_lecture_id: selectedLecture,
        p_search: studentSearch.trim() || null,
        p_start_date,
        p_end_date,
        p_page: page,
        p_page_size: PAGE_SIZE,
      });

      if (error) throw error;

      const rows = (data ?? []) as unknown as CorrectionRow[];
      const total = rows.length ? Number(rows[0].total_count ?? 0) : 0;
      return { rows, total };
    },
    placeholderData: (prev) => prev,
  });

  const totalPages = useMemo(() => {
    const total = correctionsQuery.data?.total ?? 0;
    return Math.max(1, Math.ceil(total / PAGE_SIZE));
  }, [correctionsQuery.data?.total]);
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
    onSuccess: async (data) => {
      toast.success(`Attendance updated: ${data.old_status} → ${data.new_status}`, {
        description: "Intelligence scores will be recalculated.",
      });

      setEditOpen(false);
      setEditRow(null);
      setReason("");

      await qc.invalidateQueries({ queryKey: ["admin", "corrections", "rows"] });
      await qc.invalidateQueries({ queryKey: ["admin", "attendance"] });
      await qc.invalidateQueries({ queryKey: ["admin", "overview"] });

      // Student-side refresh targets (best-effort): intelligence + summary RPC consumers
      await qc.invalidateQueries({ queryKey: ["student", "intelligence"] });
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : "Failed to update attendance");
    },
  });

  const openEdit = useCallback((row: CorrectionRow) => {
    setEditRow({
      attendanceId: row.attendance_id,
      studentName: row.student_name,
      currentStatus: row.status,
      studentUserId: row.student_user_id,
      lectureId: selectedLecture,
    });
    setNewStatus(row.status === "present" ? "absent" : "present");
    setReason("");
    setEditOpen(true);
  }, [selectedLecture]);

  const canSubmit = editRow && reason.trim().length >= 3 && newStatus !== editRow.currentStatus;

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
          {/* Filters */}
          <div className="grid gap-3 lg:grid-cols-4">
            <div className="space-y-1.5 lg:col-span-2">
              <label className="text-sm font-medium">Lecture (past only)</label>
              <Select value={selectedLecture} onValueChange={setSelectedLecture}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a past lecture…" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {(lecturesQuery.data ?? []).map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.topic} — {l.lecture_date} {l.start_time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">From</label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">To</label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="w-full max-w-md space-y-1.5">
              <label className="text-sm font-medium">Student search</label>
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

            {selectedLectureData ? (
              <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-sm">
                <span className="font-medium">{selectedLectureData.topic}</span>
                <span className="text-muted-foreground">{" · "}{selectedLectureData.lecture_date} · {selectedLectureData.start_time}</span>
              </div>
            ) : null}
          </div>

          {/* Table */}
          {!selectedLecture ? (
            <div className="py-12 text-center text-muted-foreground">Select a lecture to view attendance records.</div>
          ) : correctionsQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : correctionsQuery.isError ? (
            <div className="py-12 text-center text-muted-foreground">Failed to load corrections.</div>
          ) : (correctionsQuery.data?.rows?.length ?? 0) === 0 ? (
            <div className="py-12 text-center text-muted-foreground">No attendance records found for this lecture.</div>
          ) : (
            <>
              <div className="rounded-lg border border-border/60 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student Name</TableHead>
                      <TableHead>Student ID</TableHead>
                      <TableHead className="hidden md:table-cell">Programme</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden sm:table-cell">Marked At</TableHead>
                      <TableHead>Edited</TableHead>
                      <TableHead className="w-24">Edit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {correctionsQuery.data!.rows.map((r) => (
                      <TableRow key={r.attendance_id}>
                        <TableCell className="font-medium">{r.student_name}</TableCell>
                        <TableCell>{r.student_id}</TableCell>
                        <TableCell className="hidden md:table-cell">{r.programme}</TableCell>
                        <TableCell>
                          <Badge
                            variant={r.status === "present" ? "default" : "secondary"}
                            className={r.status === "present" ? "bg-success text-success-foreground" : ""}
                          >
                            {r.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                          {new Date(r.marked_at).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {r.edited_at ? <AuditBadge attendanceId={r.attendance_id} /> : <span className="text-xs text-muted-foreground">—</span>}
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
                    Page {page + 1} of {totalPages} · {correctionsQuery.data?.total ?? 0} records
                  </span>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
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

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Edit Historical Attendance
            </DialogTitle>
            <DialogDescription>
              This will modify historical attendance for <strong>{editRow?.studentName}</strong> and recalculate intelligence.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Current status</span>
              <Badge variant={editRow?.currentStatus === "present" ? "default" : "secondary"}>
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
              ⚠️ This will modify historical attendance and recalculate intelligence scores. All changes are permanently logged in the audit trail.
            </div>

            {editRow && newStatus === editRow.currentStatus && (
              <p className="text-xs text-muted-foreground">Status is already {editRow.currentStatus}. Select a different status.</p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => editMutation.mutate()} disabled={!canSubmit || editMutation.isPending}>
              {editMutation.isPending ? "Updating…" : "Confirm Edit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function AuditBadge({ attendanceId }: { attendanceId: string }) {
  const auditQuery = useQuery({
    queryKey: ["admin", "corrections", "audit", attendanceId],
    enabled: false,
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
                <p className="text-muted-foreground/70">{new Date(a.changed_at).toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
