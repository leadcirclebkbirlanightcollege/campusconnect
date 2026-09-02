import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, isToday, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import {
  CheckSquare, Search, Filter, Download, Plus,
  BookOpen, Users, Calendar, Clock, AlertTriangle,
  CheckCircle2, XCircle, Eye, RefreshCw, QrCode
} from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

import ManualAttendanceDialog from "./components/ManualAttendanceDialog";
import LectureDetailDrawer from "./components/LectureDetailDrawer";
import FacultyAttendanceModal from "./components/FacultyAttendanceModal";

export default function FacultyAttendance() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [selectedLecture, setSelectedLecture] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showManualDialog, setShowManualDialog] = useState(false);
  const [drawerLectureId, setDrawerLectureId] = useState<string | null>(null);
  const [liveAttendanceModalLectureId, setLiveAttendanceModalLectureId] = useState<string | null>(null);

  // Fetch all lectures by this faculty
  const { data: lectures = [], isLoading: isLoadingLectures } = useQuery({
    queryKey: ["faculty", "lectures-for-attendance", user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lectures")
        .select("id,topic,venue,lecture_date,start_time,end_time,status")
        .eq("created_by", user!.id)
        .order("lecture_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const lectureIds = useMemo(() => lectures.map((l) => l.id), [lectures]);

  // Fetch attendance records for faculty lectures
  const { data: attendanceRecords = [], isLoading: isLoadingAttendance, refetch } = useQuery({
    queryKey: ["faculty", "attendance-records", user?.id, selectedLecture],
    enabled: !!user && (lectureIds.length > 0 || selectedLecture !== "all"),
    staleTime: 30_000,
    queryFn: async () => {
      let targetIds = lectureIds;
      if (selectedLecture !== "all") {
        targetIds = [selectedLecture];
      }
      if (targetIds.length === 0) return [];

      const { data, error } = await supabase
        .from("attendance")
        .select("id,student_user_id,status,marked_at,lecture_id,profiles:student_user_id(name,student_id,department,avatar_url),lectures:lecture_id(topic,venue,lecture_date)")
        .in("lecture_id", targetIds)
        .order("marked_at", { ascending: false })
        .limit(500);

      if (error) throw error;
      return data ?? [];
    },
  });

  // Calculate high-level summary metrics
  const summary = useMemo(() => {
    const totalRecords = attendanceRecords.length;
    const presentCount = attendanceRecords.filter((a) => a.status === "present").length;
    const avgAttendance = totalRecords > 0 ? Math.round((presentCount / totalRecords) * 100) : 0;
    
    // Lectures today
    const todayLectures = lectures.filter((l) => isToday(parseISO(l.lecture_date))).length;

    // Student frequencies to estimate at risk (< 75% attendance frequency)
    const studentCounts: Record<string, { present: number; total: number }> = {};
    attendanceRecords.forEach((a) => {
      if (!studentCounts[a.student_user_id]) {
        studentCounts[a.student_user_id] = { present: 0, total: 0 };
      }
      studentCounts[a.student_user_id].total += 1;
      if (a.status === "present") {
        studentCounts[a.student_user_id].present += 1;
      }
    });

    const atRiskCount = Object.values(studentCounts).filter(
      (s) => s.total >= 3 && (s.present / s.total) < 0.75
    ).length;

    return {
      todayLectures,
      totalRecords,
      avgAttendance,
      atRiskCount,
    };
  }, [attendanceRecords, lectures]);

  // Filter attendance records
  const filteredRecords = useMemo(() => {
    const q = search.toLowerCase().trim();
    return attendanceRecords.filter((rec: any) => {
      const student = rec.profiles;
      const lecture = rec.lectures;
      
      const matchesSearch =
        !q ||
        student?.name?.toLowerCase().includes(q) ||
        student?.student_id?.toLowerCase().includes(q) ||
        student?.department?.toLowerCase().includes(q) ||
        lecture?.topic?.toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === "all" || rec.status?.toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [attendanceRecords, search, statusFilter]);

  // Export to CSV
  const handleExportCsv = () => {
    if (filteredRecords.length === 0) {
      toast.error("No records to export");
      return;
    }

    const headers = ["Student Name", "Student ID", "Department", "Lecture Topic", "Lecture Date", "Marked Time", "Status"];
    const rows = filteredRecords.map((r: any) => [
      `"${r.profiles?.name || "Student"}"`,
      `"${r.profiles?.student_id || ""}"`,
      `"${r.profiles?.department || ""}"`,
      `"${r.lectures?.topic || ""}"`,
      `"${r.lectures?.lecture_date || ""}"`,
      `"${r.marked_at ? format(new Date(r.marked_at), "yyyy-MM-dd HH:mm:ss") : ""}"`,
      `"${r.status || "present"}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Attendance_Export_${format(new Date(), "yyyyMMdd_HHmm")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Attendance records exported to CSV");
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-bold text-foreground tracking-tight">Attendance Records</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            Track student attendance logs, monitor at-risk attendance, and export reports.
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          {selectedLecture !== "all" && (
            <Button
              onClick={() => setLiveAttendanceModalLectureId(selectedLecture)}
              className="rounded-xl text-[12.5px] h-9 gap-1.5 bg-success text-success-foreground hover:bg-success/90 font-semibold shadow-xs"
            >
              <QrCode className="h-4 w-4" /> Live QR & OTP
            </Button>
          )}
          <Button
            variant="outline"
            onClick={handleExportCsv}
            className="rounded-xl text-[12.5px] h-9 gap-1.5 flex-1 sm:flex-initial"
          >
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          <Button
            onClick={() => setShowManualDialog(true)}
            className="rounded-xl text-[12.5px] h-9 gap-1.5 bg-primary text-primary-foreground font-medium flex-1 sm:flex-initial"
          >
            <Plus className="h-4 w-4" /> Record Entry
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-border/50 bg-card p-4 shadow-2xs">
          <p className="text-[11.5px] font-medium text-muted-foreground">Today's Sessions</p>
          <p className="text-[22px] font-bold text-foreground mt-1 tabular-nums">
            {summary.todayLectures}
          </p>
        </div>

        <div className="rounded-2xl border border-border/50 bg-card p-4 shadow-2xs">
          <p className="text-[11.5px] font-medium text-muted-foreground">Total Records</p>
          <p className="text-[22px] font-bold text-foreground mt-1 tabular-nums">
            {summary.totalRecords}
          </p>
        </div>

        <div className="rounded-2xl border border-border/50 bg-card p-4 shadow-2xs">
          <p className="text-[11.5px] font-medium text-muted-foreground">Avg. Attendance</p>
          <p className="text-[22px] font-bold text-success mt-1 tabular-nums">
            {summary.avgAttendance}%
          </p>
        </div>

        <div className={cn(
          "rounded-2xl border p-4 shadow-2xs transition-colors",
          summary.atRiskCount > 0 ? "border-destructive/30 bg-destructive/5" : "border-border/50 bg-card"
        )}>
          <p className="text-[11.5px] font-medium text-muted-foreground flex items-center gap-1">
            {summary.atRiskCount > 0 && <AlertTriangle className="h-3 w-3 text-destructive" />}
            Students At Risk
          </p>
          <p className={cn("text-[22px] font-bold mt-1 tabular-nums", summary.atRiskCount > 0 ? "text-destructive" : "text-foreground")}>
            {summary.atRiskCount}
          </p>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search student or topic…"
            className="pl-9 text-[12.5px] h-9.5 rounded-xl bg-card border-border/50"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Lecture Filter */}
          <Select value={selectedLecture} onValueChange={setSelectedLecture}>
            <SelectTrigger className="h-9.5 text-[12.5px] w-full sm:w-[220px] rounded-xl bg-card border-border/50">
              <SelectValue placeholder="All Lectures" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Lectures ({lectures.length})</SelectItem>
              {lectures.map((l) => (
                <SelectItem key={l.id} value={l.id} className="text-[12.5px]">
                  {l.topic} · {format(new Date(l.lecture_date), "MMM d")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9.5 text-[12.5px] w-full sm:w-[130px] rounded-xl bg-card border-border/50">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="present">Present</SelectItem>
              <SelectItem value="absent">Absent</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Attendance Table / List */}
      {isLoadingAttendance || isLoadingLectures ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-2xl" />
          ))}
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="rounded-2xl border border-border/50 bg-card p-12 text-center shadow-2xs">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
            <CheckSquare className="h-6 w-6" />
          </div>
          <h3 className="text-[15px] font-bold text-foreground">
            {attendanceRecords.length === 0 ? "No attendance recorded yet" : "No records match filter"}
          </h3>
          <p className="text-[12.5px] text-muted-foreground max-w-sm mx-auto mt-1">
            {attendanceRecords.length === 0
              ? "Students will appear here once they verify their attendance in your active or past lectures."
              : "Try clearing your search query or choosing 'All Lectures' in the filter."}
          </p>
          {attendanceRecords.length === 0 && (
            <Button
              onClick={() => setShowManualDialog(true)}
              size="sm"
              className="mt-4 rounded-xl text-[12.5px] gap-1.5"
            >
              <Plus className="h-4 w-4" /> Record First Entry
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-border/50 bg-card overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-muted/40 border-b border-border/40 text-[11.5px] font-semibold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Student ID</th>
                  <th className="py-3 px-4">Lecture / Topic</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {filteredRecords.map((rec: any) => {
                  const student = rec.profiles;
                  const lecture = rec.lectures;
                  const isPresent = rec.status === "present";

                  return (
                    <tr key={rec.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                            {student?.avatar_url ? (
                              <img src={student.avatar_url} alt="" className="h-full w-full object-cover" />
                            ) : (
                              student?.name?.charAt(0) || "S"
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground truncate">{student?.name || "Student"}</p>
                            <p className="text-[11px] text-muted-foreground truncate">{student?.department || "General"}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono text-[12px] text-muted-foreground">
                        {student?.student_id || "—"}
                      </td>

                      <td className="py-3 px-4">
                        <p className="font-medium text-foreground truncate max-w-[200px]">
                          {lecture?.topic || "Lecture"}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {lecture?.venue || "Main Campus"}
                        </p>
                      </td>

                      <td className="py-3 px-4">
                        <p className="text-foreground font-medium">
                          {rec.marked_at ? format(new Date(rec.marked_at), "MMM d, yyyy") : "—"}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {rec.marked_at ? format(new Date(rec.marked_at), "HH:mm:ss") : "—"}
                        </p>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize",
                            isPresent
                              ? "bg-success/10 text-success border border-success/20"
                              : "bg-destructive/10 text-destructive border border-destructive/20"
                          )}
                        >
                          {isPresent ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                          {rec.status || "present"}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDrawerLectureId(rec.lecture_id)}
                          className="h-8 px-2 rounded-lg text-[12px] text-muted-foreground hover:text-foreground"
                          title="View Session Details"
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" /> View
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Manual Entry Dialog */}
      <ManualAttendanceDialog
        open={showManualDialog}
        onOpenChange={setShowManualDialog}
        defaultLectureId={selectedLecture !== "all" ? selectedLecture : undefined}
      />

      {/* Lecture Detail Drawer */}
      <LectureDetailDrawer
        lectureId={drawerLectureId}
        open={!!drawerLectureId}
        onOpenChange={(op) => !op && setDrawerLectureId(null)}
      />

      {/* Live Attendance Session & QR Modal */}
      <FacultyAttendanceModal
        lectureId={liveAttendanceModalLectureId}
        open={!!liveAttendanceModalLectureId}
        onOpenChange={(op) => !op && setLiveAttendanceModalLectureId(null)}
        onSessionEnded={() => {
          refetch();
          qc.invalidateQueries({ queryKey: ["faculty"] });
        }}
      />
    </div>
  );
}
