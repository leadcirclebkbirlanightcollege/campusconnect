import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, isAfter, subDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import {
  Users, Search, Filter, AlertTriangle, CheckCircle2,
  ChevronRight, ArrowUpRight, BookOpen, GraduationCap,
  Building2, Eye, UserX
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
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

import FacultyStudentDrawer from "./components/FacultyStudentDrawer";

export default function FacultyStudents() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [attendanceFilter, setAttendanceFilter] = useState<string>("all");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  // 1. Fetch all lectures created by this faculty
  const { data: lectures = [], isLoading: isLoadingLectures } = useQuery({
    queryKey: ["faculty", "lectures-for-students", user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lectures")
        .select("id,topic,lecture_date")
        .eq("created_by", user!.id);
      if (error) throw error;
      return data ?? [];
    },
  });

  const lectureIds = useMemo(() => lectures.map((l) => l.id), [lectures]);
  const totalLecturesCount = lectures.length;

  // 2. Fetch all attendance records for these lectures
  const { data: rawAttendance = [], isLoading: isLoadingAttendance } = useQuery({
    queryKey: ["faculty", "students-attendance", user?.id, lectureIds],
    enabled: !!user && lectureIds.length > 0,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance")
        .select("id,student_user_id,status,marked_at,profiles:student_user_id(name,email,student_id,department,avatar_url)")
        .in("lecture_id", lectureIds)
        .order("marked_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Aggregate and compute student metrics
  const aggregatedStudents = useMemo(() => {
    const map = new Map<string, {
      userId: string;
      name: string;
      email?: string;
      studentId?: string;
      department?: string;
      avatarUrl?: string | null;
      presentCount: number;
      lastMarkedAt: string | null;
    }>();

    rawAttendance.forEach((record: any) => {
      const uid = record.student_user_id;
      const profile = record.profiles;
      if (!uid || !profile) return;

      if (!map.has(uid)) {
        map.set(uid, {
          userId: uid,
          name: profile.name || "Student",
          email: profile.email,
          studentId: profile.student_id,
          department: profile.department,
          avatarUrl: profile.avatar_url,
          presentCount: 0,
          lastMarkedAt: record.marked_at,
        });
      }

      const item = map.get(uid)!;
      if (record.status === "present") {
        item.presentCount += 1;
      }
      if (!item.lastMarkedAt || (record.marked_at && record.marked_at > item.lastMarkedAt)) {
        item.lastMarkedAt = record.marked_at;
      }
    });

    return Array.from(map.values()).map((s) => {
      const rate = totalLecturesCount > 0
        ? Math.min(100, Math.round((s.presentCount / totalLecturesCount) * 100))
        : 0;
      const isAtRisk = totalLecturesCount >= 3 && rate < 75;
      const isActive = s.lastMarkedAt ? isAfter(new Date(s.lastMarkedAt), subDays(new Date(), 14)) : false;

      return {
        ...s,
        attendanceRate: rate,
        isAtRisk,
        isActive,
      };
    });
  }, [rawAttendance, totalLecturesCount]);

  // Derived KPI metrics
  const totalStudents = aggregatedStudents.length;
  const activeCount = useMemo(() => aggregatedStudents.filter((s) => s.isActive).length, [aggregatedStudents]);
  const atRiskCount = useMemo(() => aggregatedStudents.filter((s) => s.isAtRisk).length, [aggregatedStudents]);
  const departmentsCount = useMemo(() => {
    const depts = new Set(aggregatedStudents.map((s) => s.department).filter(Boolean));
    return depts.size;
  }, [aggregatedStudents]);

  // Filter students
  const filteredStudents = useMemo(() => {
    const q = search.toLowerCase().trim();
    return aggregatedStudents.filter((s) => {
      const matchesSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.studentId?.toLowerCase().includes(q) ||
        s.department?.toLowerCase().includes(q);

      let matchesFilter = true;
      if (attendanceFilter === "regular") matchesFilter = !s.isAtRisk;
      else if (attendanceFilter === "at-risk") matchesFilter = s.isAtRisk;

      return matchesSearch && matchesFilter;
    });
  }, [aggregatedStudents, search, attendanceFilter]);

  const isLoading = isLoadingLectures || (lectureIds.length > 0 && isLoadingAttendance);

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-bold text-foreground tracking-tight">Student Roster</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            Directory of all students attending your lectures, their attendance rates, and progress.
          </p>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-border/50 bg-card p-4 shadow-2xs">
          <p className="text-[11.5px] font-medium text-muted-foreground">Unique Students</p>
          <p className="text-[22px] font-bold text-foreground mt-1 tabular-nums">{totalStudents}</p>
        </div>

        <div className="rounded-2xl border border-border/50 bg-card p-4 shadow-2xs">
          <p className="text-[11.5px] font-medium text-muted-foreground">Active (14 Days)</p>
          <p className="text-[22px] font-bold text-success mt-1 tabular-nums">{activeCount}</p>
        </div>

        <div className="rounded-2xl border border-border/50 bg-card p-4 shadow-2xs">
          <p className="text-[11.5px] font-medium text-muted-foreground">Departments</p>
          <p className="text-[22px] font-bold text-foreground mt-1 tabular-nums">{departmentsCount || 1}</p>
        </div>

        <div className={cn(
          "rounded-2xl border p-4 shadow-2xs transition-colors",
          atRiskCount > 0 ? "border-destructive/30 bg-destructive/5" : "border-border/50 bg-card"
        )}>
          <p className="text-[11.5px] font-medium text-muted-foreground flex items-center gap-1">
            {atRiskCount > 0 && <AlertTriangle className="h-3 w-3 text-destructive" />}
            Requiring Attention
          </p>
          <p className={cn("text-[22px] font-bold mt-1 tabular-nums", atRiskCount > 0 ? "text-destructive" : "text-foreground")}>
            {atRiskCount}
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by student name, ID or department…"
            className="pl-9 text-[12.5px] h-9.5 rounded-xl bg-card border-border/50"
          />
        </div>

        {/* Filter Dropdown */}
        <Select value={attendanceFilter} onValueChange={setAttendanceFilter}>
          <SelectTrigger className="h-9.5 text-[12.5px] w-full sm:w-[180px] rounded-xl bg-card border-border/50">
            <SelectValue placeholder="All Students" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Students ({totalStudents})</SelectItem>
            <SelectItem value="regular">Regular (≥ 75%)</SelectItem>
            <SelectItem value="at-risk">Attention Needed (&lt; 75%)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Roster Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-2xl" />
          ))}
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="rounded-2xl border border-border/50 bg-card p-12 text-center shadow-2xs">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
            <Users className="h-6 w-6" />
          </div>
          <h3 className="text-[15px] font-bold text-foreground">
            {aggregatedStudents.length === 0 ? "No student attendance recorded yet" : "No students match filter"}
          </h3>
          <p className="text-[12.5px] text-muted-foreground max-w-sm mx-auto mt-1">
            {aggregatedStudents.length === 0
              ? "Students will populate here automatically once they attend your lectures."
              : "Try adjusting your search terms or selecting 'All Students'."}
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border/50 bg-card overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-muted/40 border-b border-border/40 text-[11.5px] font-semibold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Student ID</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Lectures Attended</th>
                  <th className="py-3 px-4">Attendance Rate</th>
                  <th className="py-3 px-4">Last Attended</th>
                  <th className="py-3 px-4 text-right">Profile</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {filteredStudents.map((st) => (
                  <tr
                    key={st.userId}
                    onClick={() => setSelectedStudentId(st.userId)}
                    className="hover:bg-muted/20 transition-colors cursor-pointer group"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8.5 w-8.5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                          {st.avatarUrl ? (
                            <img src={st.avatarUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            st.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                            {st.name}
                          </p>
                          {st.email && (
                            <p className="text-[11px] text-muted-foreground truncate">{st.email}</p>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 font-mono text-[12px] text-muted-foreground">
                      {st.studentId || "—"}
                    </td>

                    <td className="py-3 px-4 text-[12.5px] text-foreground">
                      {st.department || "General"}
                    </td>

                    <td className="py-3 px-4 font-medium text-foreground">
                      {st.presentCount} <span className="text-[11px] text-muted-foreground font-normal">/ {totalLecturesCount}</span>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full",
                            st.isAtRisk
                              ? "bg-destructive/10 text-destructive border border-destructive/20"
                              : "bg-success/10 text-success border border-success/20"
                          )}
                        >
                          {st.isAtRisk && <AlertTriangle className="h-3 w-3" />}
                          {st.attendanceRate}%
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-[12px] text-muted-foreground">
                      {st.lastMarkedAt ? format(new Date(st.lastMarkedAt), "MMM d, yyyy") : "Never"}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedStudentId(st.userId);
                        }}
                        className="h-8 px-2.5 rounded-lg text-[12px] text-muted-foreground group-hover:text-foreground"
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" /> View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Student Profile Drawer */}
      <FacultyStudentDrawer
        studentId={selectedStudentId}
        open={!!selectedStudentId}
        onOpenChange={(op) => !op && setSelectedStudentId(null)}
        totalFacultyLecturesCount={totalLecturesCount}
      />
    </div>
  );
}
