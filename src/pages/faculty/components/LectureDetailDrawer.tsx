import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  BookOpen, Clock, Calendar, MapPin, Users, CheckCircle2,
  Play, StopCircle, Trash2, Pencil, X, User,
  Loader2, AlertTriangle, ChevronRight, QrCode
} from "@/components/icons";
import { showErrorToast, showSuccessToast } from "@/lib/error-handling";
import { cn } from "@/lib/utils";
import DeleteLectureDialog from "./DeleteLectureDialog";
import FacultyAttendanceModal from "./FacultyAttendanceModal";

interface LectureDetailDrawerProps {
  lectureId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLectureUpdated?: () => void;
}

export default function LectureDetailDrawer({
  lectureId,
  open,
  onOpenChange,
  onLectureUpdated,
}: LectureDetailDrawerProps) {
  const qc = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editTopic, setEditTopic] = useState("");
  const [editVenue, setEditVenue] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);

  // Fetch full details of the lecture
  const { data: lecture, isLoading: isLoadingLecture } = useQuery({
    queryKey: ["faculty", "lecture-detail", lectureId],
    enabled: !!lectureId && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lectures")
        .select("*")
        .eq("id", lectureId!)
        .single();
      if (error) throw error;

      // populate edit form defaults
      setEditTopic(data.topic || "");
      setEditVenue(data.venue || "");
      setEditDate(data.lecture_date || "");
      setEditStart(data.start_time || "");
      setEditEnd(data.end_time || "");

      return data;
    },
  });

  // Fetch student attendance for this specific lecture
  const { data: attendees = [], isLoading: isLoadingAttendance } = useQuery({
    queryKey: ["faculty", "lecture-attendance", lectureId],
    enabled: !!lectureId && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance")
        .select("id,student_user_id,status,marked_at,profiles:student_user_id(name,student_id,avatar_url)")
        .eq("lecture_id", lectureId!)
        .order("marked_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Start Class Mutation
  const startClassMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("lectures")
        .update({
          status: "live",
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", lectureId!);
      if (error) throw error;
    },
    onSuccess: () => {
      showSuccessToast("Class started! Lecture is now LIVE.");
      qc.invalidateQueries({ queryKey: ["faculty"] });
      onLectureUpdated?.();
    },
    onError: (err: any) => showErrorToast(err, { context: "go-live" }),
  });

  // End Class Mutation
  const endClassMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("lectures")
        .update({
          status: "ended",
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", lectureId!);
      if (error) throw error;
    },
    onSuccess: () => {
      showSuccessToast("Class ended successfully.");
      qc.invalidateQueries({ queryKey: ["faculty"] });
      onLectureUpdated?.();
    },
    onError: (err: any) => showErrorToast(err, { context: "end-lecture" }),
  });

  // Edit Lecture Mutation
  const updateLectureMutation = useMutation({
    mutationFn: async () => {
      if (editStart && editEnd && editEnd <= editStart) {
        throw new Error("End time must be after start time");
      }
      const { error } = await supabase
        .from("lectures")
        .update({
          topic: editTopic.trim(),
          venue: editVenue.trim(),
          lecture_date: editDate,
          start_time: editStart,
          end_time: editEnd,
          updated_at: new Date().toISOString(),
        })
        .eq("id", lectureId!);
      if (error) throw error;
    },
    onSuccess: () => {
      showSuccessToast("Lecture updated successfully!");
      setIsEditing(false);
      qc.invalidateQueries({ queryKey: ["faculty"] });
      onLectureUpdated?.();
    },
    onError: (err: any) => showErrorToast(err, { context: "update-lecture" }),
  });


  if (!open) return null;

  const isLive = (lecture?.status as string) === "live";
  const isScheduled = (lecture?.status as string) === "scheduled";
  const isEnded = (lecture?.status as string) === "ended" || (lecture?.status as string) === "completed";

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-xl p-0 flex flex-col h-full bg-card overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-border/50 bg-muted/10 shrink-0">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span
                    className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
                      isLive && "bg-success/15 text-success border border-success/30 animate-pulse",
                      isScheduled && "bg-warning/15 text-warning border border-warning/30",
                      isEnded && "bg-muted text-muted-foreground border border-border/50"
                    )}
                  >
                    {isLive ? "● LIVE NOW" : lecture?.status || "SCHEDULED"}
                  </span>
                  {lecture?.lecture_date && (
                    <span className="text-[11.5px] text-muted-foreground">
                      {format(new Date(lecture.lecture_date), "EEEE, MMMM d, yyyy")}
                    </span>
                  )}
                </div>
                <h2 className="text-[17px] font-bold text-foreground tracking-tight leading-snug">
                  {lecture?.topic || "Lecture Details"}
                </h2>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border/40 flex-wrap">
              {isScheduled && (
                <>
                  <Button
                    size="sm"
                    onClick={() => setShowAttendanceModal(true)}
                    className="rounded-xl text-[12px] h-8.5 gap-1.5 bg-primary text-primary-foreground font-medium shadow-xs"
                  >
                    <QrCode className="h-3.5 w-3.5" />
                    Start Attendance / QR
                  </Button>
                  {!isEditing ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsEditing(true)}
                      className="rounded-xl text-[12px] h-8.5 gap-1.5"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setIsEditing(false)}
                      className="rounded-xl text-[12px] h-8.5 text-muted-foreground"
                    >
                      Cancel Edit
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="rounded-xl text-[12px] h-8.5 text-destructive hover:bg-destructive/10 hover:text-destructive ml-auto gap-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete Lecture
                  </Button>
                </>
              )}

              {isLive && (
                <>
                  <Button
                    size="sm"
                    onClick={() => setShowAttendanceModal(true)}
                    className="rounded-xl text-[12px] h-8.5 gap-1.5 bg-success text-success-foreground font-medium shadow-xs"
                  >
                    <QrCode className="h-3.5 w-3.5" />
                    Live QR & OTP
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => endClassMutation.mutate()}
                    disabled={endClassMutation.isPending}
                    className="rounded-xl text-[12px] h-8.5 gap-1.5 font-medium"
                  >
                    {endClassMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <StopCircle className="h-3.5 w-3.5" />}
                    End Live Class
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="rounded-xl text-[12px] h-8.5 text-destructive hover:bg-destructive/10 hover:text-destructive ml-auto gap-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete Lecture
                  </Button>
                </>
              )}

              {isEnded && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="rounded-xl text-[12px] h-8.5 text-destructive hover:bg-destructive/10 hover:text-destructive ml-auto gap-1"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete Lecture
                </Button>
              )}
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Edit Mode Form */}
            {isEditing ? (
              <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 space-y-3.5">
                <h3 className="text-[13px] font-bold text-foreground">Edit Scheduled Lecture</h3>
                <div className="space-y-2.5">
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground">Subject / Topic</label>
                    <Input
                      value={editTopic}
                      onChange={(e) => setEditTopic(e.target.value)}
                      className="text-[12.5px] bg-background mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground">Venue / Classroom</label>
                    <Input
                      value={editVenue}
                      onChange={(e) => setEditVenue(e.target.value)}
                      className="text-[12.5px] bg-background mt-1"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[11px] font-medium text-muted-foreground">Date</label>
                      <Input
                        type="date"
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                        className="text-[12px] bg-background mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-muted-foreground">Start Time</label>
                      <Input
                        type="time"
                        value={editStart}
                        onChange={(e) => setEditStart(e.target.value)}
                        className="text-[12px] bg-background mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-muted-foreground">End Time</label>
                      <Input
                        type="time"
                        value={editEnd}
                        onChange={(e) => setEditEnd(e.target.value)}
                        className="text-[12px] bg-background mt-1"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)} className="text-[12px]">
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => updateLectureMutation.mutate()}
                    disabled={updateLectureMutation.isPending || !editTopic.trim()}
                    className="text-[12px] gap-1"
                  >
                    {updateLectureMutation.isPending ? "Saving…" : "Save Changes"}
                  </Button>
                </div>
              </div>
            ) : null}

            {/* Lecture Meta Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl border border-border/40 bg-muted/20">
                <p className="text-[11px] text-muted-foreground font-medium flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-primary" /> Timings
                </p>
                <p className="text-[13px] font-semibold text-foreground mt-1">
                  {lecture?.start_time?.slice(0, 5)} – {lecture?.end_time?.slice(0, 5)}
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-border/40 bg-muted/20">
                <p className="text-[11px] text-muted-foreground font-medium flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-primary" /> Venue
                </p>
                <p className="text-[13px] font-semibold text-foreground mt-1 truncate">
                  {lecture?.venue || "Main Campus"}
                </p>
              </div>
            </div>

            {/* Attendance Roster Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-[13.5px] font-bold text-foreground flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    Attendance Roster
                  </h3>
                  <p className="text-[11.5px] text-muted-foreground">
                    {attendees.length} {attendees.length === 1 ? "student" : "students"} recorded present
                  </p>
                </div>
              </div>

              {isLoadingAttendance ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-12 rounded-xl bg-muted/40 animate-pulse" />
                  ))}
                </div>
              ) : attendees.length === 0 ? (
                <div className="rounded-xl border border-border/40 bg-muted/15 p-6 text-center">
                  <User className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                  <p className="text-[12.5px] font-medium text-foreground">No attendance records yet</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {isLive ? "Students will appear here as they scan or verify attendance." : "Attendance will be listed here once the session takes place."}
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-border/50 divide-y divide-border/30 overflow-hidden">
                  {attendees.map((att: any) => {
                    const student = att.profiles;
                    return (
                      <div key={att.id} className="flex items-center justify-between p-3 bg-card hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs overflow-hidden shrink-0">
                            {student?.avatar_url ? (
                              <img src={student.avatar_url} alt="" className="h-full w-full object-cover" />
                            ) : (
                              student?.name?.charAt(0) || "S"
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[12.5px] font-semibold text-foreground truncate">
                              {student?.name || "Student"}
                            </p>
                            <p className="text-[10.5px] text-muted-foreground truncate">
                              ID: {student?.student_id || "—"}
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-success/10 text-success">
                            <CheckCircle2 className="h-3 w-3" /> Present
                          </span>
                          {att.marked_at && (
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {format(new Date(att.marked_at), "HH:mm:ss")}
                            </p>
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

      {/* Delete Lecture Dialog */}
      <DeleteLectureDialog
        lecture={
          lecture
            ? {
                id: lecture.id,
                topic: lecture.topic,
                lecture_date: lecture.lecture_date,
                start_time: lecture.start_time,
                end_time: lecture.end_time,
                venue: lecture.venue,
                status: lecture.status,
              }
            : null
        }
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        onSuccess={() => {
          onOpenChange(false);
          qc.invalidateQueries({ queryKey: ["faculty"] });
          onLectureUpdated?.();
        }}
      />

      {/* Live Attendance Session & QR Modal */}
      <FacultyAttendanceModal
        lectureId={lectureId}
        open={showAttendanceModal}
        onOpenChange={setShowAttendanceModal}
        onSessionEnded={() => {
          qc.invalidateQueries({ queryKey: ["faculty"] });
          onLectureUpdated?.();
        }}
      />
    </>
  );
}
