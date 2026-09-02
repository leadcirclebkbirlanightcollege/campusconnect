import { useEffect, useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { QRCodeCanvas } from "qrcode.react";
import { motion, AnimatePresence } from "framer-motion";
import {
  QrCode,
  Radio,
  Clock,
  Users,
  CheckCircle2,
  RefreshCw,
  StopCircle,
  Download,
  KeyRound,
  Copy,
  Check,
  Eye,
  X,
  AlertCircle,
  Loader2,
  BookOpen,
  MapPin,
  Calendar,
} from "@/components/icons";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";

interface FacultyAttendanceModalProps {
  lectureId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSessionEnded?: () => void;
}

type TokenData = {
  otp: string;
  token: string;
  expiresAt: string;
};

type PresentStudent = {
  attendanceId: string;
  studentUserId: string;
  name: string;
  studentId: string;
  department: string;
  className: string;
  avatarUrl: string | null;
  timestamp: string;
};

function buildQrPayload(lectureId: string, token: string) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/lectures/${lectureId}?token=${encodeURIComponent(token)}`;
}

export default function FacultyAttendanceModal({
  lectureId,
  open,
  onOpenChange,
  onSessionEnded,
}: FacultyAttendanceModalProps) {
  const qc = useQueryClient();
  const [copiedOtp, setCopiedOtp] = useState(false);
  const [fullScreenQr, setFullScreenQr] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [remainingSecs, setRemainingSecs] = useState<number>(600);

  const enabled = Boolean(lectureId) && open;

  // 1. Fetch lecture details
  const { data: lecture } = useQuery({
    queryKey: ["faculty", "lecture", lectureId],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lectures")
        .select("*")
        .eq("id", lectureId!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // 2. Fetch or generate active token
  const tokenQuery = useQuery({
    queryKey: ["faculty", "attendance-token", lectureId],
    enabled,
    staleTime: 5_000,
    queryFn: async (): Promise<TokenData | null> => {
      // Check existing active token in attendance_tokens
      const { data: existing, error } = await supabase
        .from("attendance_tokens")
        .select("id, token, expires_at, is_active")
        .eq("lecture_id", lectureId!)
        .eq("is_active", true)
        .maybeSingle();

      if (existing && new Date(existing.expires_at).getTime() > Date.now()) {
        // If token exists and is valid, return it
        return {
          token: existing.token,
          otp: "******", // Hash is stored, UI requests new token if OTP needed
          expiresAt: existing.expires_at,
        };
      }

      // If no valid active token exists, generate fresh session
      const { data: genData, error: genError } = await supabase.rpc(
        "faculty_generate_attendance",
        { p_lecture_id: lectureId! }
      );

      if (genError) throw genError;
      return genData as TokenData;
    },
  });

  // Generate / Rotate Token Mutation
  const rotateTokenMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("faculty_generate_attendance", {
        p_lecture_id: lectureId!,
      });
      if (error) throw error;
      return data as TokenData;
    },
    onSuccess: (data) => {
      toast.success("Attendance QR & OTP refreshed", {
        description: "Valid for 10 minutes.",
      });
      qc.setQueryData(["faculty", "attendance-token", lectureId], data);
      qc.invalidateQueries({ queryKey: ["faculty", "lectures"] });
    },
    onError: (err: any) => {
      toast.error("Failed to refresh token", {
        description: err.message || "Please check connection and retry.",
      });
    },
  });

  // End Attendance Mutation
  const endAttendanceMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("faculty_end_attendance", {
        p_lecture_id: lectureId!,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Attendance session finalized", {
        description: "QR and OTP have been deactivated.",
      });
      setShowEndConfirm(false);
      onOpenChange(false);
      qc.invalidateQueries({ queryKey: ["faculty"] });
      onSessionEnded?.();
    },
    onError: (err: any) => {
      toast.error("Failed to end session", {
        description: err.message || "Please try again.",
      });
    },
  });

  // 3. Live check-in students query
  const presentStudentsQuery = useQuery({
    queryKey: ["faculty", "live-checkins", lectureId],
    enabled,
    refetchInterval: 6_000,
    queryFn: async (): Promise<PresentStudent[]> => {
      const { data: attendanceRows, error: aErr } = await supabase
        .from("attendance")
        .select("id, student_user_id, status, marked_at")
        .eq("lecture_id", lectureId!)
        .eq("status", "present")
        .order("marked_at", { ascending: false })
        .limit(300);

      if (aErr) throw aErr;
      if (!attendanceRows || attendanceRows.length === 0) return [];

      const userIds = [...new Set(attendanceRows.map((a) => a.student_user_id))];
      const { data: profiles, error: pErr } = await supabase
        .from("profiles")
        .select("user_id, name, student_id, department, class_name, avatar_url")
        .in("user_id", userIds);

      if (pErr) throw pErr;

      const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));

      return attendanceRows.map((a) => {
        const prof = profileMap.get(a.student_user_id);
        return {
          attendanceId: a.id,
          studentUserId: a.student_user_id,
          name: prof?.name || "Student",
          studentId: prof?.student_id || "—",
          department: prof?.department || "—",
          className: prof?.class_name || "—",
          avatarUrl: prof?.avatar_url || null,
          timestamp: format(parseISO(a.marked_at), "hh:mm:ss a"),
        };
      });
    },
  });

  // 4. Realtime subscription to attendance events
  useEffect(() => {
    if (!enabled || !lectureId) return;

    const channel = supabase
      .channel(`faculty_live_att_${lectureId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "attendance",
          filter: `lecture_id=eq.${lectureId}`,
        },
        () => {
          presentStudentsQuery.refetch();
          qc.invalidateQueries({ queryKey: ["faculty", "attendance"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, lectureId, qc, presentStudentsQuery]);

  // 5. Countdown timer logic
  useEffect(() => {
    const expiresAt = tokenQuery.data?.expiresAt;
    if (!expiresAt) return;

    function updateTimer() {
      const diff = Math.max(
        0,
        Math.floor((new Date(expiresAt!).getTime() - Date.now()) / 1000)
      );
      setRemainingSecs(diff);
      if (diff === 0 && !rotateTokenMutation.isPending) {
        // Auto-refresh when expired
        rotateTokenMutation.mutate();
      }
    }

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [tokenQuery.data?.expiresAt, rotateTokenMutation]);

  const activeToken = tokenQuery.data;
  const qrString = activeToken ? buildQrPayload(lectureId!, activeToken.token) : "";
  const students = presentStudentsQuery.data || [];
  const presentCount = students.length;

  const copyOtpToClipboard = () => {
    if (!activeToken?.otp || activeToken.otp === "******") {
      rotateTokenMutation.mutate();
      return;
    }
    navigator.clipboard.writeText(activeToken.otp);
    setCopiedOtp(true);
    toast.success("OTP Copied to Clipboard!");
    setTimeout(() => setCopiedOtp(false), 2000);
  };

  const formatCountdown = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const exportAttendanceCsv = () => {
    if (students.length === 0) {
      toast.error("No check-ins to export yet.");
      return;
    }
    const headers = ["Name", "Student ID", "Department", "Class", "Timestamp"];
    const rows = students.map((s) => [
      `"${s.name.replace(/"/g, '""')}"`,
      `"${s.studentId.replace(/"/g, '""')}"`,
      `"${s.department.replace(/"/g, '""')}"`,
      `"${s.className.replace(/"/g, '""')}"`,
      `"${s.timestamp}"`,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-${lecture?.topic || "class"}-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Attendance sheet exported!");
  };

  if (!open) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-card border-border/60 shadow-2xl flex flex-col h-[92vh] max-h-[850px]">
          {/* Header Bar */}
          <div className="p-5 border-b border-border/50 bg-muted/20 shrink-0 flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-success/15 text-success border border-success/30">
                  <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
                  LIVE ATTENDANCE SESSION
                </span>
                <span className="text-xs text-muted-foreground">
                  {lecture?.lecture_date} · {lecture?.venue}
                </span>
              </div>
              <DialogTitle className="text-lg font-bold text-foreground truncate">
                {lecture?.topic || "Lecture Attendance Control"}
              </DialogTitle>
            </div>

            {/* Top Quick Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => rotateTokenMutation.mutate()}
                disabled={rotateTokenMutation.isPending}
                className="h-8.5 rounded-xl text-xs gap-1.5"
                title="Rotate token & generate fresh QR/OTP"
              >
                <RefreshCw
                  className={cn("h-3.5 w-3.5", rotateTokenMutation.isPending && "animate-spin")}
                />
                <span className="hidden sm:inline">Refresh QR</span>
              </Button>

              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowEndConfirm(true)}
                disabled={endAttendanceMutation.isPending}
                className="h-8.5 rounded-xl text-xs gap-1.5 font-semibold"
              >
                <StopCircle className="h-3.5 w-3.5" />
                End Attendance
              </Button>
            </div>
          </div>

          {/* Main Dual-Column Content */}
          <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
            {/* Left Column: QR Code & OTP Display (6 cols) */}
            <div className="md:col-span-6 p-6 border-b md:border-b-0 md:border-r border-border/50 flex flex-col items-center justify-between overflow-y-auto bg-muted/5">
              <div className="w-full flex flex-col items-center">
                {/* QR Container */}
                <div className="relative group p-4 bg-white rounded-2xl shadow-md border border-border/40 flex flex-col items-center justify-center transition-transform hover:scale-[1.01]">
                  {tokenQuery.isLoading ? (
                    <div className="h-56 w-56 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <span className="text-xs font-medium">Generating secure QR…</span>
                    </div>
                  ) : qrString ? (
                    <>
                      <QRCodeCanvas
                        value={qrString}
                        size={220}
                        level="H"
                        includeMargin={false}
                        className="rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => setFullScreenQr(true)}
                        className="absolute bottom-2 right-2 p-1.5 bg-black/70 hover:bg-black text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Enlarge QR Code"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </>
                  ) : (
                    <div className="h-56 w-56 flex items-center justify-center text-xs text-muted-foreground">
                      No active token
                    </div>
                  )}
                </div>

                <p className="text-[12px] text-muted-foreground text-center mt-2.5 flex items-center gap-1.5">
                  <QrCode className="h-3.5 w-3.5 text-primary" />
                  Students scan this QR from their student dashboard
                </p>

                {/* 6-Digit OTP Box */}
                <div className="w-full max-w-xs mt-5 rounded-2xl border border-primary/25 bg-primary/5 p-4 text-center space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-primary uppercase tracking-wider">
                    <span className="flex items-center gap-1">
                      <KeyRound className="h-3.5 w-3.5" /> 6-Digit Class Passcode
                    </span>
                    <span className="text-muted-foreground font-mono">
                      {remainingSecs > 0 ? formatCountdown(remainingSecs) : "Expiring…"}
                    </span>
                  </div>

                  <div className="flex items-center justify-center gap-3">
                    <span className="font-mono text-3xl font-black tracking-[0.25em] text-foreground select-all">
                      {activeToken?.otp && activeToken.otp !== "******"
                        ? activeToken.otp
                        : "•• •• ••"}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={copyOtpToClipboard}
                      className="h-8 w-8 p-0 rounded-lg text-primary hover:bg-primary/10"
                      title="Copy OTP"
                    >
                      {copiedOtp ? (
                        <Check className="h-4 w-4 text-success" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  {activeToken?.otp === "******" && (
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => rotateTokenMutation.mutate()}
                      className="text-xs h-auto p-0 text-primary"
                    >
                      Reveal Passcode
                    </Button>
                  )}
                </div>
              </div>

              {/* Progress bar of token validity */}
              <div className="w-full max-w-xs mt-4 space-y-1">
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>Security rotation</span>
                  <span className="font-mono">{formatCountdown(remainingSecs)}</span>
                </div>
                <Progress
                  value={(remainingSecs / 600) * 100}
                  className="h-1.5 bg-border/40"
                />
              </div>
            </div>

            {/* Right Column: Realtime Student Check-in Stream (6 cols) */}
            <div className="md:col-span-6 flex flex-col h-full overflow-hidden bg-card">
              {/* Stream Header */}
              <div className="p-4 border-b border-border/50 flex items-center justify-between bg-muted/10 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-success/10 text-success flex items-center justify-center">
                    <Users className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-[13px] font-bold text-foreground">
                      Live Check-Ins ({presentCount})
                    </h3>
                    <p className="text-[11px] text-muted-foreground">
                      Instant verified attendance log
                    </p>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportAttendanceCsv}
                  disabled={students.length === 0}
                  className="h-8 rounded-xl text-xs gap-1.5"
                >
                  <Download className="h-3.5 w-3.5" />
                  Export CSV
                </Button>
              </div>

              {/* Stream List */}
              <div className="flex-1 overflow-y-auto p-4 divide-y divide-border/40">
                {presentStudentsQuery.isLoading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full rounded-xl" />
                    ))}
                  </div>
                ) : students.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
                    <Clock className="h-8 w-8 mb-2 opacity-40 animate-pulse" />
                    <p className="text-sm font-semibold text-foreground">Waiting for check-ins…</p>
                    <p className="text-xs max-w-xs mt-1">
                      Students scanning the QR or submitting the 6-digit OTP will appear here in real time.
                    </p>
                  </div>
                ) : (
                  students.map((st) => (
                    <motion.div
                      key={st.attendanceId}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="py-2.5 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[11px] shrink-0 overflow-hidden">
                          {st.avatarUrl ? (
                            <img
                              src={st.avatarUrl}
                              alt={st.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            st.name.slice(0, 2).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-foreground truncate">{st.name}</p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {st.studentId !== "—" ? st.studentId : st.department}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-success bg-success/10 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="h-3 w-3" /> Present
                        </span>
                        <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                          {st.timestamp}
                        </p>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>

              {/* Bottom Summary Bar */}
              <div className="p-3.5 border-t border-border/50 bg-muted/20 flex items-center justify-between text-xs text-muted-foreground">
                <span>Realtime Supabase channel active</span>
                <span className="font-semibold text-foreground">
                  {presentCount} Total Present
                </span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Full-Screen QR Modal for Projector / Classroom display */}
      {fullScreenQr && (
        <div
          className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md flex flex-col items-center justify-center p-6"
          onClick={() => setFullScreenQr(false)}
        >
          <div
            className="p-8 bg-white rounded-3xl shadow-2xl flex flex-col items-center gap-6"
            onClick={(e) => e.stopPropagation()}
          >
            <QRCodeCanvas value={qrString} size={380} level="H" includeMargin={false} />
            <div className="text-center">
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Classroom Code
              </span>
              <p className="font-mono text-5xl font-black text-foreground tracking-[0.2em] mt-1">
                {activeToken?.otp || "—"}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFullScreenQr(false)}
              className="rounded-xl"
            >
              <X className="h-4 w-4 mr-1.5" /> Close Fullscreen
            </Button>
          </div>
        </div>
      )}

      {/* End Attendance Confirmation Dialog */}
      <Dialog open={showEndConfirm} onOpenChange={setShowEndConfirm}>
        <DialogContent className="max-w-sm p-6 bg-card border-border/60">
          <DialogTitle className="text-base font-bold text-foreground">
            End Attendance Session?
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-2 leading-relaxed">
            Ending the session will immediately deactivate the QR code and OTP. Students who haven't marked attendance will not be able to do so.
          </DialogDescription>
          <div className="mt-5 flex items-center justify-end gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEndConfirm(false)}
              disabled={endAttendanceMutation.isPending}
              className="rounded-xl text-xs"
            >
              Continue Session
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => endAttendanceMutation.mutate()}
              disabled={endAttendanceMutation.isPending}
              className="rounded-xl text-xs gap-1.5 font-semibold"
            >
              {endAttendanceMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <StopCircle className="h-3.5 w-3.5" />
              )}
              Yes, Finalize Attendance
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
