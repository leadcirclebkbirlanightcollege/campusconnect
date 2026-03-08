import { useEffect, useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Camera, CheckCircle2, KeyRound, QrCode, Loader2, HelpCircle, AlertTriangle } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useRateLimit } from "@/hooks/use-rate-limit";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import QrScannerDialog from "./QrScannerDialog";

type Props = {
  lectureId: string;
  initialToken?: string;
};

type MarkAttendanceResponse = {
  success: boolean;
  attendance_marked?: boolean;
  already_marked?: boolean;
  points_awarded?: boolean;
  message?: string;
  code?: string;
};

function safeErrorMessage(e: unknown) {
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
  return "Something went wrong";
}

export default function AttendanceMarkingCard({ lectureId, initialToken }: Props) {
  const reduceMotion = useReducedMotion();
  const { attempt: attemptMark } = useRateLimit("mark-attendance", 5, 60_000);

  const [otp, setOtp] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [success, setSuccess] = useState<{ at: number; points: number } | null>(null);
  const [scanLock, setScanLock] = useState(false);

  const canSubmitOtp = otp.trim().length === 6;

  // Check if attendance already marked
  const existingQuery = useQuery({
    queryKey: ["student", "attendance-check", lectureId],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return null;

      const { data, error } = await supabase
        .from("attendance")
        .select("id, marked_at, points_earned")
        .eq("lecture_id", lectureId)
        .eq("student_user_id", user.user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  // If already marked, show success state
  useEffect(() => {
    if (existingQuery.data && !success) {
      setSuccess({
        at: new Date(existingQuery.data.marked_at).getTime(),
        points: existingQuery.data.points_earned ?? 0,
      });
    }
  }, [existingQuery.data, success]);

  const invokeWithRetry = async (payload: { otp?: string; token?: string }) => {
    const body = { lectureId, ...payload };
    let lastError: unknown;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const { data, error } = await supabase.functions.invoke<MarkAttendanceResponse>("mark-attendance", { body });
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
      if (scanLock) throw new Error("Already processing");
      setScanLock(true);

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error("Please log in first to mark attendance");

      return invokeWithRetry(payload);
    },
    onSuccess: (data) => {
      if (data?.already_marked) {
        setSuccess({ at: Date.now(), points: 0 });
        toast.info("✅ Attendance already recorded for this lecture.");
        return;
      }
      const points = data?.points_awarded ? 10 : 0;
      setSuccess({ at: Date.now(), points });
      toast.success("✅ Attendance marked!", { description: "Your attendance has been securely recorded." });
    },
    onError: (e: any) => {
      const msg = safeErrorMessage(e);
      const code: string = e?.code || "";
      const lower = msg.toLowerCase();

      if (lower.includes("already marked") || lower.includes("already recorded") || code === "ALREADY_MARKED") {
        setSuccess({ at: Date.now(), points: 0 });
        toast.info("✅ Attendance already recorded for this lecture.");
      } else if (lower.includes("expired") || code === "OTP_EXPIRED") {
        toast.error("⏰ Attendance window closed", { description: "The OTP has expired. Ask your lecturer for a new one." });
      } else if (lower.includes("invalid") || code === "INVALID_OTP") {
        toast.error("❌ Invalid OTP", { description: "Please check the OTP and try again." });
      } else if (lower.includes("not live") || code === "LECTURE_NOT_LIVE") {
        toast.error("📚 Lecture not live", { description: "Attendance can only be marked during a live lecture." });
      } else if (code === "NO_ACTIVE_TOKEN") {
        toast.error("⚠️ No active session", { description: "No attendance session is active for this lecture." });
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

  // Deep-link token: if present, auto-submit once.
  useEffect(() => {
    const t = (initialToken ?? "").trim();
    if (!t) return;
    if (success) return;
    if (markMutation.isPending || scanLock) return;

    if (t.length >= 16) {
      markMutation.mutate({ token: t });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialToken]);

  // Auto-submit when OTP reaches 6 digits
  useEffect(() => {
    if (!canSubmitOtp) return;
    if (markMutation.isPending || scanLock) return;
    if (success) return;

    markMutation.mutate({ otp: otp.trim() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canSubmitOtp]);

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

  const anim = useMemo(
    () => ({
      initial: reduceMotion ? { opacity: 1 } : { opacity: 0, y: 8 },
      animate: { opacity: 1, y: 0 },
      exit: reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 },
      transition: { duration: 0.25 },
    }),
    [reduceMotion],
  );

  const isPending = markMutation.isPending || scanLock;

  return (
    <>
      <Card className="border-primary/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-primary" />
            Mark Attendance
          </CardTitle>
          <CardDescription>
            Scan QR or enter the 6-digit OTP to mark your attendance.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <AnimatePresence mode="wait">
            {success ? (
              <motion.div key="success" {...anim} className="rounded-xl border border-success/30 bg-success/10 p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-8 w-8 text-success mt-0.5" />
                  <div className="flex-1">
                    <div className="font-semibold text-success text-lg">Attendance Recorded!</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {success.points > 0 ? `You earned ${success.points} points.` : "You're all set for this lecture."}
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">
                      Your attendance has been securely recorded.
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div key="form" {...anim} className="space-y-4">
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
                    <InputOTPGroup className="gap-2 justify-center w-full">
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
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* QR Scanner Dialog */}
      <QrScannerDialog
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onToken={handleQrToken}
      />
    </>
  );
}
