import { useEffect, useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { showErrorToast, showSuccessToast } from "@/lib/error-handling";
import { Camera, CheckCircle2, KeyRound, QrCode, Loader2, HelpCircle, AlertTriangle, Sparkles, ArrowRight } from "@/components/icons";

import { supabase } from "@/integrations/supabase/client";
import { useRateLimit } from "@/hooks/use-rate-limit";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { cn } from "@/lib/utils";
import QrScannerDialog from "./QrScannerDialog";
import { useFestivalTheme } from "@/contexts/FestivalThemeContext";
import { FestiveIcon } from "@/components/festive/FestiveDecorations";

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
  const { isFestive } = useFestivalTheme();

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
      if (!attemptMark()) throw new Error("rate_limited");
      setScanLock(true);

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error("Please log in first to mark attendance");

      return invokeWithRetry(payload);
    },
    onSuccess: (data) => {
      if (data?.already_marked) {
        setSuccess({ at: Date.now(), points: 0 });
        toast.info("Attendance already recorded for this lecture.");
        return;
      }
      const points = data?.points_awarded ? 10 : 0;
      setSuccess({ at: Date.now(), points });
      showSuccessToast("Attendance marked successfully!", "+10 points awarded to your profile.");
    },
    onError: (e: any) => {
      const msg = safeErrorMessage(e);
      const code: string = e?.code || "";
      const lower = msg.toLowerCase();

      if (lower.includes("already marked") || lower.includes("already recorded") || code === "ALREADY_MARKED") {
        setSuccess({ at: Date.now(), points: 0 });
        toast.info("Attendance already recorded for this lecture.");
      } else if (lower.includes("expired") || code === "OTP_EXPIRED") {
        toast.error("Attendance window closed", { description: "The OTP has expired. Ask your lecturer for a new code." });
      } else if (lower.includes("invalid") || code === "INVALID_OTP") {
        toast.error("Invalid OTP", { description: "Please check the 6-digit OTP and try again." });
      } else if (lower.includes("not live") || code === "LECTURE_NOT_LIVE") {
        toast.error("Lecture not live", { description: "Attendance can only be marked during an active session." });
      } else if (code === "NO_ACTIVE_TOKEN") {
        toast.error("No active session", { description: "No attendance session is active for this lecture." });
      } else {
        showErrorToast(e, { context: "mark-attendance" });
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

  const handleQrToken = useCallback(
    (token: string) => {
      if (scanLock || markMutation.isPending) {
        toast.info("Processing attendance scan...");
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
      <Card className="rounded-3xl border-border-subtle bg-surface-1 shadow-md overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2.5 text-base font-bold">
            <QrCode className="h-5 w-5 text-primary" />
            Attendance Verification
          </CardTitle>
          <CardDescription className="text-xs">
            Point your camera at the professor's live QR code or type the 6-digit session OTP.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <AnimatePresence mode="wait">
            {success ? (
              <motion.div
                key="success"
                {...anim}
                className={cn(
                  "rounded-2xl border p-5 space-y-3",
                  isFestive
                    ? "border-emerald-500/40 bg-gradient-to-r from-emerald-500/10 via-cyan-500/5 to-emerald-500/10"
                    : "border-success/30 bg-success/10"
                )}
              >
                <div className="flex items-start gap-3.5">
                  <div className="h-10 w-10 rounded-xl bg-success/20 border border-success/30 flex items-center justify-center shrink-0 text-success">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-success text-base">Attendance Verified & Recorded!</h3>
                      {isFestive && <FestiveIcon size={16} />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {success.points > 0 ? `+${success.points} points added to your streak.` : "Your lecture attendance has been securely logged."}
                    </p>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div key="form" {...anim} className="space-y-4">
                {/* Primary Action: QR Scanner */}
                <Button
                  size="lg"
                  className="w-full h-14 rounded-2xl gap-3 text-base font-bold shadow-md shadow-primary/25 active:scale-[0.98] transition-all"
                  onClick={() => setScannerOpen(true)}
                  disabled={isPending}
                >
                  {isPending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Camera className="h-5 w-5" />
                  )}
                  {isPending ? "Verifying..." : "Scan Camera QR Code"}
                </Button>

                {/* OTP Input */}
                <div className="rounded-2xl border border-border-subtle bg-surface-2/60 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <KeyRound className="h-4 w-4 text-primary" />
                      <span className="font-bold text-xs text-foreground uppercase tracking-wide">Or Enter 6-Digit OTP</span>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-semibold border-border-subtle">
                      Numeric
                    </Badge>
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
                          className="h-12 w-10 sm:w-12 text-lg font-bold rounded-xl border-border-subtle bg-surface-1"
                        />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>

                  {isPending && (
                    <div className="flex items-center justify-center gap-2 text-xs font-semibold text-primary pt-1">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Verifying session OTP...
                    </div>
                  )}
                </div>

                {/* Help Dialog */}
                <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" className="w-full h-9 rounded-xl text-xs font-medium text-muted-foreground gap-1.5">
                      <HelpCircle className="h-3.5 w-3.5" />
                      Troubleshoot Scanner / OTP
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="rounded-3xl max-w-md">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2 text-base font-bold">
                        <AlertTriangle className="h-4 w-4 text-warning" />
                        Attendance Help
                      </DialogTitle>
                      <DialogDescription className="text-xs">
                        Troubleshoot camera or OTP verification issues.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-2 text-xs text-muted-foreground">
                      <p><strong>Camera permissions:</strong> Ensure your browser has granted camera access. On iPhone, check Safari website settings.</p>
                      <p><strong>OTP Expiry:</strong> Professors rotate OTPs every few minutes. Ensure you have the current code displayed on the screen.</p>
                      <p><strong>GPS Boundary:</strong> Ensure location services are active if your college has location fencing enabled.</p>
                    </div>
                  </DialogContent>
                </Dialog>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* QR Scanner Dialog Viewport */}
      <QrScannerDialog
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onToken={handleQrToken}
      />
    </>
  );
}
