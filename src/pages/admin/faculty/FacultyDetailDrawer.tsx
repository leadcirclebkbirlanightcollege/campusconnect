import { useState, memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import {
  GraduationCap, Mail, Phone, Building2, IdCard,
  Calendar, Clock, BookOpen, UserCheck, UserX,
  UserPen, Shield, CalendarDays, Loader2,
  CheckCircle2, XCircle, AlertCircle, Eye,
} from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { FacultyMember, LectureItem, TimetableItem } from "./types";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface FacultyDetailDrawerProps {
  faculty: FacultyMember | null;
  open: boolean;
  initialTab?: "overview" | "lectures" | "timetable";
  onClose: () => void;
  onEdit: (faculty: FacultyMember) => void;
  onToggleVerify: (faculty: FacultyMember) => void;
  onToggleActive: (faculty: FacultyMember) => void;
}

export const FacultyDetailDrawer = memo(function FacultyDetailDrawer({
  faculty,
  open,
  initialTab = "overview",
  onClose,
  onEdit,
  onToggleVerify,
  onToggleActive,
}: FacultyDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState<string>(initialTab);

  // Fetch lectures conducted by this faculty member
  const { data: lectures = [], isLoading: loadingLectures } = useQuery<LectureItem[]>({
    queryKey: ["admin_faculty_lectures", faculty?.user_id],
    enabled: Boolean(faculty?.user_id) && open,
    staleTime: 30_000,
    queryFn: async () => {
      if (!faculty?.user_id) return [];
      const { data, error } = await supabase
        .from("lectures")
        .select("id, topic, subject, venue, lecture_date, start_time, end_time, status, created_at")
        .eq("created_by", faculty.user_id)
        .order("lecture_date", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as LectureItem[];
    },
  });

  // Fetch timetable slots assigned to this faculty member
  const { data: timetableSlots = [], isLoading: loadingTimetable } = useQuery<TimetableItem[]>({
    queryKey: ["admin_faculty_timetable", faculty?.name],
    enabled: Boolean(faculty?.name) && open,
    staleTime: 30_000,
    queryFn: async () => {
      if (!faculty?.name) return [];
      const { data, error } = await supabase
        .from("timetable_slots")
        .select("id, day_of_week, start_time, end_time, subject, venue, faculty_name, class_id")
        .ilike("faculty_name", `%${faculty.name.trim()}%`)
        .order("day_of_week", { ascending: true })
        .order("start_time", { ascending: true });
      if (error) throw error;
      return (data ?? []) as TimetableItem[];
    },
  });

  if (!faculty) return null;

  const initial = (faculty.name || "F")[0].toUpperCase();

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl bg-card border-border shadow-2xl p-0 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header Hero */}
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-5 border-b border-border/60">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <Avatar className="h-14 w-14 rounded-full border-2 border-background shadow-sm shrink-0">
                <AvatarImage src={faculty.avatar_url ?? undefined} alt={faculty.name} />
                <AvatarFallback className="bg-primary text-primary-foreground font-bold text-lg">
                  {initial}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-bold text-foreground truncate">
                    {faculty.name}
                  </h2>
                  {faculty.is_verified && (
                    <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[11px] gap-1 py-0 h-5">
                      <UserCheck className="h-3 w-3" />
                      Verified
                    </Badge>
                  )}
                  {faculty.is_deleted ? (
                    <Badge variant="destructive" className="text-[11px] py-0 h-5">
                      Deactivated
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[11px] py-0 h-5">
                      Active
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground/70" />
                    {faculty.email}
                  </span>
                  {faculty.department && (
                    <span className="flex items-center gap-1">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground/70" />
                      {faculty.department}
                    </span>
                  )}
                  {faculty.student_id && (
                    <span className="flex items-center gap-1">
                      <IdCard className="h-3.5 w-3.5 text-muted-foreground/70" />
                      ID: {faculty.student_id}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Top Action */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                onClose();
                onEdit(faculty);
              }}
              className="gap-1.5 shrink-0"
            >
              <UserPen className="h-3.5 w-3.5" />
              Edit
            </Button>
          </div>
        </div>

        {/* Tabs Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          <Tabs defaultValue={initialTab} value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-3 w-full bg-muted/60 h-9 p-1">
              <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
              <TabsTrigger value="lectures" className="text-xs">
                Lectures ({lectures.length})
              </TabsTrigger>
              <TabsTrigger value="timetable" className="text-xs">
                Timetable ({timetableSlots.length})
              </TabsTrigger>
            </TabsList>

            {/* Tab 1: Overview */}
            <TabsContent value="overview" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg bg-muted/40 border border-border/50">
                  <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Lectures</p>
                  <p className="text-lg font-bold text-foreground mt-0.5">{lectures.length}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/40 border border-border/50">
                  <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Weekly Slots</p>
                  <p className="text-lg font-bold text-foreground mt-0.5">{timetableSlots.length}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/40 border border-border/50">
                  <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Status</p>
                  <p className={cn("text-xs font-semibold mt-1", faculty.is_deleted ? "text-destructive" : "text-emerald-600")}>
                    {faculty.is_deleted ? "Deactivated" : "Active Member"}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted/40 border border-border/50">
                  <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Verification</p>
                  <p className={cn("text-xs font-semibold mt-1", faculty.is_verified ? "text-emerald-600" : "text-amber-600")}>
                    {faculty.is_verified ? "Verified" : "Unverified"}
                  </p>
                </div>
              </div>

              {/* Detail Items */}
              <div className="rounded-lg border border-border/60 bg-card divide-y divide-border/40 text-xs">
                <div className="flex items-center justify-between p-3">
                  <span className="text-muted-foreground font-medium">Employee / Faculty ID</span>
                  <span className="font-semibold text-foreground font-mono">{faculty.student_id || "Not assigned"}</span>
                </div>
                <div className="flex items-center justify-between p-3">
                  <span className="text-muted-foreground font-medium">Department</span>
                  <span className="font-semibold text-foreground">{faculty.department || "General"}</span>
                </div>
                <div className="flex items-center justify-between p-3">
                  <span className="text-muted-foreground font-medium">Phone Contact</span>
                  <span className="font-semibold text-foreground">{faculty.phone || "Not provided"}</span>
                </div>
                <div className="flex items-center justify-between p-3">
                  <span className="text-muted-foreground font-medium">Email Address</span>
                  <span className="font-semibold text-foreground">{faculty.email}</span>
                </div>
                <div className="flex items-center justify-between p-3">
                  <span className="text-muted-foreground font-medium">Joined Institution</span>
                  <span className="font-semibold text-foreground">
                    {format(new Date(faculty.created_at), "MMMM d, yyyy")}
                  </span>
                </div>
              </div>

              {/* Quick Status Toggles */}
              <div className="flex items-center justify-between pt-2 border-t border-border/60">
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant={faculty.is_verified ? "outline" : "default"}
                    onClick={() => onToggleVerify(faculty)}
                    className="gap-1.5 text-xs h-8"
                  >
                    <UserCheck className="h-3.5 w-3.5" />
                    {faculty.is_verified ? "Mark as Unverified" : "Verify Faculty"}
                  </Button>

                  <Button
                    size="sm"
                    variant={faculty.is_deleted ? "default" : "outline"}
                    onClick={() => onToggleActive(faculty)}
                    className={cn("gap-1.5 text-xs h-8", !faculty.is_deleted && "text-destructive hover:text-destructive")}
                  >
                    {faculty.is_deleted ? (
                      <>
                        <UserCheck className="h-3.5 w-3.5" />
                        Reactivate Account
                      </>
                    ) : (
                      <>
                        <UserX className="h-3.5 w-3.5" />
                        Deactivate Account
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Tab 2: Conducted Lectures */}
            <TabsContent value="lectures" className="space-y-3 mt-4">
              {loadingLectures ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              ) : lectures.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-border rounded-lg text-muted-foreground space-y-1">
                  <BookOpen className="h-8 w-8 mx-auto opacity-30" />
                  <p className="text-xs font-medium">No recorded lectures found for this faculty member</p>
                  <p className="text-[11px] text-muted-foreground/70">Lectures created in the faculty workspace will appear here</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {lectures.map((lec) => (
                    <div
                      key={lec.id}
                      className="p-3 rounded-lg border border-border/50 bg-card hover:bg-muted/30 transition-colors flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0 space-y-0.5">
                        <p className="font-semibold text-foreground truncate">{lec.topic}</p>
                        <div className="flex items-center gap-2.5 text-[11px] text-muted-foreground flex-wrap">
                          {lec.subject && (
                            <span className="font-medium text-foreground/80">{lec.subject}</span>
                          )}
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {lec.lecture_date}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {lec.start_time} - {lec.end_time}
                          </span>
                          {lec.venue && <span>· {lec.venue}</span>}
                        </div>
                      </div>

                      <Badge
                        variant={
                          lec.status === "completed" || lec.status === "ended"
                            ? "secondary"
                            : lec.status === "live"
                            ? "default"
                            : "outline"
                        }
                        className="text-[10px] capitalize shrink-0"
                      >
                        {lec.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Tab 3: Weekly Timetable */}
            <TabsContent value="timetable" className="space-y-3 mt-4">
              {loadingTimetable ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              ) : timetableSlots.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-border rounded-lg text-muted-foreground space-y-1">
                  <CalendarDays className="h-8 w-8 mx-auto opacity-30" />
                  <p className="text-xs font-medium">No assigned timetable slots found</p>
                  <p className="text-[11px] text-muted-foreground/70">Assign weekly timetable slots in Academic Operations → Timetable</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {timetableSlots.map((slot) => (
                    <div
                      key={slot.id}
                      className="p-3 rounded-lg border border-border/50 bg-card flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground">{slot.subject}</span>
                          <Badge variant="secondary" className="text-[10px] py-0">
                            {DAYS[slot.day_of_week] || `Day ${slot.day_of_week}`}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {slot.start_time} - {slot.end_time}
                          </span>
                          {slot.venue && <span>· Venue: {slot.venue}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
});
