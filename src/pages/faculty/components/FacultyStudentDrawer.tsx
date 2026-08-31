import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  User, Mail, Phone, Building2, CheckSquare,
  BookOpen, Calendar, Clock, Award, FileText,
  AlertTriangle, CheckCircle2, X
} from "@/components/icons";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  studentId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalFacultyLecturesCount: number;
}

export default function FacultyStudentDrawer({
  studentId,
  open,
  onOpenChange,
  totalFacultyLecturesCount,
}: Props) {
  const { user } = useAuth();

  // Fetch student profile
  const { data: student, isLoading: isLoadingProfile } = useQuery({
    queryKey: ["faculty", "student-profile", studentId],
    enabled: !!studentId && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id,name,email,phone,department,student_id,avatar_url")
        .eq("user_id", studentId!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Fetch attendance records for this student across this faculty's lectures
  const { data: attendanceHistory = [], isLoading: isLoadingAttendance } = useQuery({
    queryKey: ["faculty", "student-attendance-history", studentId, user?.id],
    enabled: !!studentId && !!user && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance")
        .select("id,status,marked_at,lecture_id,lectures:lecture_id(id,topic,venue,lecture_date,start_time,created_by)")
        .eq("student_user_id", studentId!)
        .order("marked_at", { ascending: false });

      if (error) throw error;

      // filter to only lectures created by this faculty
      return (data ?? []).filter((a: any) => a.lectures?.created_by === user!.id);
    },
  });

  // Fetch assignment submissions by this student for this faculty's assignments
  const { data: submissions = [], isLoading: isLoadingSubmissions } = useQuery({
    queryKey: ["faculty", "student-submissions", studentId, user?.id],
    enabled: !!studentId && !!user && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("submissions" as any)
        .select("id,marks_obtained,status,submitted_at,feedback,assignments:assignment_id(id,title,max_marks,due_date,created_by)")
        .eq("student_user_id", studentId!)
        .order("submitted_at", { ascending: false });

      if (error) return [];
      return (data ?? []).filter((s: any) => s.assignments?.created_by === user!.id);
    },
  });

  if (!open) return null;

  const attendedCount = attendanceHistory.filter((a: any) => a.status === "present").length;
  const attendanceRate = totalFacultyLecturesCount > 0
    ? Math.min(100, Math.round((attendedCount / totalFacultyLecturesCount) * 100))
    : 0;

  const isAtRisk = totalFacultyLecturesCount >= 3 && attendanceRate < 75;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl p-0 flex flex-col h-full bg-card overflow-hidden">
        {/* Header Profile Summary */}
        <div className="p-6 border-b border-border/50 bg-muted/15 shrink-0">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 text-primary font-bold text-xl flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
              {student?.avatar_url ? (
                <img src={student.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                student?.name?.charAt(0) || "S"
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-[17px] font-bold text-foreground tracking-tight truncate">
                  {student?.name || "Student Profile"}
                </h2>
                {isAtRisk && (
                  <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20">
                    <AlertTriangle className="h-3 w-3" /> Low Attendance
                  </span>
                )}
              </div>
              <p className="text-[12.5px] text-muted-foreground mt-0.5 truncate">
                ID: <span className="font-mono text-foreground font-medium">{student?.student_id || "Not assigned"}</span>
                {student?.department && ` · ${student.department}`}
              </p>
              {student?.email && (
                <p className="text-[11.5px] text-muted-foreground/80 mt-0.5 truncate flex items-center gap-1">
                  <Mail className="h-3 w-3" /> {student.email}
                </p>
              )}
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-2.5 mt-5">
            <div className="p-3 rounded-xl bg-card border border-border/40 text-center shadow-2xs">
              <p className="text-[10.5px] text-muted-foreground font-medium">Attended</p>
              <p className="text-[16px] font-bold text-foreground mt-0.5 tabular-nums">
                {attendedCount} <span className="text-[11px] font-normal text-muted-foreground">/ {totalFacultyLecturesCount}</span>
              </p>
            </div>

            <div className="p-3 rounded-xl bg-card border border-border/40 text-center shadow-2xs">
              <p className="text-[10.5px] text-muted-foreground font-medium">Attendance</p>
              <p className={cn("text-[16px] font-bold mt-0.5 tabular-nums", isAtRisk ? "text-destructive" : "text-success")}>
                {attendanceRate}%
              </p>
            </div>

            <div className="p-3 rounded-xl bg-card border border-border/40 text-center shadow-2xs">
              <p className="text-[10.5px] text-muted-foreground font-medium">Coursework</p>
              <p className="text-[16px] font-bold text-foreground mt-0.5 tabular-nums">
                {submissions.length} <span className="text-[11px] font-normal text-muted-foreground">submitted</span>
              </p>
            </div>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Lecture Attendance Log */}
          <div>
            <h3 className="text-[13.5px] font-bold text-foreground flex items-center gap-2 mb-3">
              <CheckSquare className="h-4 w-4 text-primary" />
              Session Attendance History
            </h3>

            {isLoadingAttendance ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-14 rounded-xl" />
                ))}
              </div>
            ) : attendanceHistory.length === 0 ? (
              <div className="p-6 rounded-xl border border-border/40 bg-muted/15 text-center">
                <p className="text-[12.5px] text-muted-foreground font-medium">
                  No attendance records found for this student.
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-border/50 divide-y divide-border/30 overflow-hidden">
                {attendanceHistory.map((att: any) => {
                  const lec = att.lectures;
                  return (
                    <div key={att.id} className="p-3 bg-card flex items-center justify-between gap-3 hover:bg-muted/20 transition-colors">
                      <div className="min-w-0 flex-1">
                        <p className="text-[12.5px] font-semibold text-foreground truncate">
                          {lec?.topic || "Lecture"}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {lec?.lecture_date ? format(new Date(lec.lecture_date), "MMM d, yyyy") : ""} · {lec?.venue || "Main Campus"}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-success/10 text-success">
                          <CheckCircle2 className="h-3 w-3" /> Present
                        </span>
                        {att.marked_at && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {format(new Date(att.marked_at), "HH:mm")}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Assignments Submissions by this student */}
          <div>
            <h3 className="text-[13.5px] font-bold text-foreground flex items-center gap-2 mb-3">
              <FileText className="h-4 w-4 text-primary" />
              Coursework & Submissions
            </h3>

            {isLoadingSubmissions ? (
              <div className="space-y-2">
                {[...Array(2)].map((_, i) => (
                  <Skeleton key={i} className="h-14 rounded-xl" />
                ))}
              </div>
            ) : submissions.length === 0 ? (
              <div className="p-6 rounded-xl border border-border/40 bg-muted/15 text-center">
                <p className="text-[12.5px] text-muted-foreground font-medium">
                  No assignment submissions recorded yet.
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-border/50 divide-y divide-border/30 overflow-hidden">
                {submissions.map((sub: any) => {
                  const asn = sub.assignments;
                  const isGraded = sub.status === "graded";
                  return (
                    <div key={sub.id} className="p-3 bg-card flex items-center justify-between gap-3 hover:bg-muted/20 transition-colors">
                      <div className="min-w-0 flex-1">
                        <p className="text-[12.5px] font-semibold text-foreground truncate">
                          {asn?.title || "Assignment"}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {sub.submitted_at ? `Submitted ${format(new Date(sub.submitted_at), "MMM d, yyyy")}` : "Submitted"}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        {isGraded ? (
                          <span className="text-[12px] font-bold text-success">
                            {sub.marks_obtained} / {asn?.max_marks || 100}
                          </span>
                        ) : (
                          <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-warning/10 text-warning">
                            Pending
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
