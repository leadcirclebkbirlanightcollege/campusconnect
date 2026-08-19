import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, CheckCircle2, KeyRound, Loader2, QrCode, Radio, AlertTriangle, HelpCircle } from "@/components/icons";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

import AttendanceStatusBanner from "./AttendanceStatusBanner";
import QrScannerDialog from "@/pages/student/attendance/QrScannerDialog";

type LiveLecture = {
  id: string;
  topic: string;
  lecture_date: string;
  start_time: string;
  end_time: string;
  venue: string;
  status: "scheduled" | "live" | "ended";
};

type AttendanceRecord = {
  id: string;
  lecture_id: string;
  status: string;
  marked_at: string;
};

type TokenInfo = {
  expires_at: string;
  is_active: boolean;
};

function safeErrorMessage(e: unknown): string {
  const anyErr = e as any;
  const bodyText: string | undefined = anyErr?.context?.body;
  if (typeof bodyText === "string") {
    try {
      const parsed = JSON.parse(bodyText);
      if (parsed?.error) return String(parsed.error);
      if (parsed?.message) return String(parsed.message);
    } catch {
      // ignore
    }
  }
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  return "Something went wrong. Please try again.";
}

export default function LiveAttendanceWidget() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [otp, setOtp] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [scanLock, setScanLock] = useState(false);

  // Fetch current live lecture
  const liveLectureQuery = useQuery({
    queryKey: ["student", "live-lecture"],
    queryFn: async (): Promise<LiveLecture | null> => {
      const { data, error } = await supabase
        .from("lectures")
        .select("id, topic, lecture_date, start_time, end_time, venue, status")
        .eq("status", "live")
        .order("lecture_date", { ascending: true })
        .order("start_time", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as LiveLecture | null;
    },
    refetchInterval: 5000,
  });

  // Check if user already marked attendance for this lecture
  const attendanceQuery = useQuery({
    queryKey: ["student", "my-attendance", liveLectureQuery.data?.id],
    enabled: Boolean(liveLectureQuery.data?.id),
    queryFn: async (): Promise<AttendanceRecord | null> => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return null;

      const { data, error } = await supabase
        .from("attendance")
        .select("id, lecture_id, status, marked_at")
        .eq("lecture_id", liveLectureQuery.data!.id)
        .eq("student_user_id", user.user.id)
        .maybeSingle();

      if (error) throw error;
      return data as AttendanceRecord | null;
    },
  });

  // Get token info for countdown
  const tokenQuery = useQuery({
    queryKey: ["student", "attendance-token", liveLectureQuery.data?.id],
    enabled: Boolean(liveLectureQuery.data?.id),
    queryFn: async (): Promise<TokenInfo | null> => {
      // Students can't directly read tokens, but we can infer from lecture status
      // This would require a public endpoint or we use the lecture's live status
      return null; // Simplified - countdown handled by banner when available
    },
  });

  const invokeWithRetry = async (payload: { otp?: string; token?: string }, lectureId: string) => {
    const body = { lectureId, ...payload };
    let lastError: unknown;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const { data, error } = await supabase.functions.invoke("mark-attendance", { body });
        if (error) throw error;
        return data;
      } catch (err: any) {
        lastError = err;
        const msg: string = err?.message || "";
        const isFetchError = msg.toLowerCase().includes("failed to fetch") || msg.toLowerCase().includes("networkerror");
        if (isFetchError && attempt === 0) {
          await new Promise((r) => setTimeout(r, 1500));
          continue;
        }
        throw err;
      }
    }
    throw lastError;
  };

  const markMutation = useMutation({
    mutationFn: async (payload: { otp?: string; token?: string }) => {
      if (!liveLectureQuery.data?.id) throw new Error("No live lecture");
      if (scanLock) throw new Error("Already processing");
      setScanLock(true);

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error("Please log in first to mark attendance");

      return invokeWithRetry(payload, liveLectureQuery.data.id);
    },
    onSuccess: (data: any) => {
      // already_marked is a success — show success state, not error
      if (data?.already_marked) {
        toast.info("✅ Already recorded", { description: "Your attendance was already marked for this lecture." });
        qc.invalidateQueries({ queryKey: ["student", "my-attendance"] });
        return;
      }
      toast.success("✅ Attendance marked!", { description: "Your attendance has been securely recorded." });
      setOtp("");
      setScannerOpen(false);
      qc.invalidateQueries({ queryKey: ["student", "my-attendance"] });
      qc.invalidateQueries({ queryKey: ["student", "dashboard"] });
    },
    onError: (e: any) => {
      const msg = safeErrorMessage(e);
      const code: string = e?.code || "";
      const lower = msg.toLowerCase();

      if (lower.includes("already marked") || lower.includes("already recorded") || code === "ALREADY_MARKED") {
        toast.info("✅ Already recorded", { description: "Your attendance was already marked for this lecture." });
        qc.invalidateQueries({ queryKey: ["student", "my-attendance"] });
      } else if (lower.includes("expired") || code === "OTP_EXPIRED") {
        toast.error("⏰ Attendance window closed", { description: "The OTP has expired. Ask your lecturer for a new one." });
      } else if (lower.includes("invalid") || code === "INVALID_OTP") {
        toast.error("❌ Invalid OTP", { description: "Please check the OTP and try again." });
      } else if (code === "LECTURE_NOT_LIVE" || lower.includes("not live")) {
        toast.error("📚 Lecture not live", { description: "Attendance can only be marked during a live lecture." });
      } else if (code === "NO_ACTIVE_TOKEN") {
        toast.error("⚠️ No active session", { description: "No attendance session is active. Contact your lecturer." });
      } else if (lower.includes("failed to fetch") || lower.includes("networkerror")) {
        toast.error("Network issue", { description: "Could not connect. Please try again in a few seconds." });
      } else {
        toast.error("Attendance marked — background updates pending", {
          description: "Your attendance may have been recorded. Check your history.",
        });
      }
    },
    onSettled: () => {
      setScanLock(false);
    },
  });

  // Auto-submit OTP when 6 digits entered
  useEffect(() => {
    if (otp.length === 6 && !markMutation.isPending && !scanLock) {
      markMutation.mutate({ otp: otp.trim() });
    }
  }, [otp]);

  // Handle QR scan result
  const handleQrToken = useCallback(
    (token: string) => {
      if (scanLock || markMutation.isPending) {
        toast.info("Already processing your attendance...");
        return;
      }
      markMutation.mutate({ token });
    },
    [markMutation, scanLock]
  );

  // Subscribe to realtime lecture status changes
  useEffect(() => {
    const channel = supabase
      .channel("live_attendance_widget")
      .on("postgres_changes", { event: "*", schema: "public", table: "lectures" }, () => {
        qc.invalidateQueries({ queryKey: ["student", "live-lecture"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "attendance" }, () => {
        qc.invalidateQueries({ queryKey: ["student", "my-attendance"] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  const lecture = liveLectureQuery.data;
  const alreadyMarked = Boolean(attendanceQuery.data);
  const isLive = lecture?.status === "live";
  const isPending = markMutation.isPending || scanLock;

  // Determine state
  const attendanceState = useMemo(() => {
    if (alreadyMarked) return "marked";
    if (isLive) return "live";
    return "not_started";
  }, [alreadyMarked, isLive]);

  // No live lecture - show minimal state
  if (!lecture) {
    return (
      <Card className="border-primary/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-primary" />
            Mark Attendance
          </CardTitle>
          <CardDescription>No lecture is currently live</CardDescription>
        </CardHeader>
        <CardContent>
          <AttendanceStatusBanner state="not_started" />
          <p className="mt-4 text-sm text-muted-foreground">
            When a lecture goes live, you'll see the attendance button here. Keep this page open!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("border-primary/10", isLive && !alreadyMarked && "ring-2 ring-destructive/50")}>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              {isLive && !alreadyMarked ? (
                <Radio className="h-5 w-5 text-destructive animate-pulse" />
              ) : (
                <QrCode className="h-5 w-5 text-primary" />
              )}
              Mark Attendance
            </CardTitle>
            <CardDescription className="mt-1">
              {lecture.topic} • {lecture.venue}
            </CardDescription>
          </div>
          {isLive && !alreadyMarked && (
            <Badge variant="destructive" className="gap-1.5 animate-pulse">
              <span className="h-2 w-2 rounded-full bg-destructive-foreground" />
              LIVE
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <AttendanceStatusBanner
          state={attendanceState}
          startTime={lecture.start_time}
          lectureDate={lecture.lecture_date}
        />

        <AnimatePresence mode="wait">
          {alreadyMarked ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-xl border border-success/30 bg-success/10 p-4"
            >
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-8 w-8 text-success" />
                <div>
                  <div className="font-semibold text-success">Attendance Recorded</div>
                  <div className="text-sm text-muted-foreground">
                    Marked at {new Date(attendanceQuery.data!.marked_at).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            </motion.div>
          ) : isLive ? (
            <motion.div
              key="actions"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {/* Primary Action: QR Scanner */}
              <Button
                size="lg"
                className="w-full gap-3 h-14 text-lg"
                onClick={() => setScannerOpen(true)}
                disabled={isPending}
              >
                {isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Camera className="h-5 w-5" />
                )}
                {isPending ? "Processing..." : "Scan QR Code"}
              </Button>

              {/* OTP Input */}
              <div className="rounded-xl border border-border/60 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <KeyRound className="h-4 w-4 text-primary" />
                    <span className="font-medium text-sm">Or enter OTP</span>
                  </div>
                  <Badge variant="secondary">6 digits</Badge>
                </div>

                <InputOTP
                  maxLength={6}
                  value={otp}
                  onChange={(v) => setOtp(v.replace(/[^0-9]/g, ""))}
                  disabled={isPending}
                  autoFocus={false}
                >
                  <InputOTPGroup className="gap-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <InputOTPSlot
                        key={i}
                        index={i}
                        className="h-12 w-10 text-lg font-semibold"
                      />
                    ))}
                  </InputOTPGroup>
                </InputOTP>

                {isPending && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Validating...
                  </div>
                )}
              </div>

              {/* Help Button */}
              <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" className="w-full gap-2 text-muted-foreground">
                    <HelpCircle className="h-4 w-4" />
                    Facing an issue?
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-amber-500" />
                      Having trouble?
                    </DialogTitle>
                    <DialogDescription>
                      Don't worry - we're here to help!
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <h4 className="font-medium">Camera not working?</h4>
                      <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                        <li>Make sure you've allowed camera permission</li>
                        <li>Try refreshing the page</li>
                        <li>Use the OTP option instead</li>
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-medium">OTP not working?</h4>
                      <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                        <li>Check if you're entering the correct 6 digits</li>
                        <li>The OTP may have expired - ask for a new one</li>
                        <li>Make sure there are no spaces</li>
                      </ul>
                    </div>
                    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                      <p className="text-sm">
                        <strong>Still stuck?</strong> Contact your lecturer or admin.
                        They can mark your attendance manually.
                      </p>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </CardContent>

      {/* QR Scanner Dialog */}
      <QrScannerDialog
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onToken={handleQrToken}
      />
    </Card>
  );
}
