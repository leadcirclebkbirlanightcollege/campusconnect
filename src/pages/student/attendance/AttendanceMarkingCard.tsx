import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Camera, CheckCircle2, KeyRound, QrCode } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

type Props = {
  lectureId: string;
  initialToken?: string;
};

type MarkAttendanceResponse = {
  message: string;
  pointsEarned?: number;
};

function safeErrorMessage(e: unknown) {
  // supabase-js FunctionsError often only says: "Edge Function returned a non-2xx status code"
  // but the real message is in the response JSON body.
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

  const [otp, setOtp] = useState("");
  const [token, setToken] = useState(initialToken ?? "");
  const [success, setSuccess] = useState<{ at: number; points: number } | null>(null);

  const canSubmitOtp = otp.trim().length === 6;
  const canSubmitToken = token.trim().length >= 16;

  const markMutation = useMutation({
    mutationFn: async (payload: { otp?: string; token?: string }) => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error("Please log in first to mark attendance");
      }

      const { data, error } = await supabase.functions.invoke<MarkAttendanceResponse>("mark-attendance", {
        body: { lectureId, ...payload },
      });

      if (error) {
        // Helpful for debugging: expose details to safeErrorMessage via thrown error
        console.debug("mark-attendance invoke error", error);
        throw error;
      }

      return data;
    },
    onSuccess: (data) => {
      const points = data?.pointsEarned ?? 0;
      setSuccess({ at: Date.now(), points });
      toast.success("Attendance marked");
    },
    onError: (e) => {
      console.debug("mark-attendance failed", e);
      toast.error(safeErrorMessage(e));
    },
  });

  // Deep-link token: if present, auto-submit once.
  useEffect(() => {
    const t = (initialToken ?? "").trim();
    if (!t) return;
    if (success) return;
    if (markMutation.isPending) return;
    if (token.trim() !== t) setToken(t);

    if (t.length >= 16) {
      markMutation.mutate({ token: t });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialToken]);

  // Live validation: auto-submit when OTP reaches 6 digits
  useEffect(() => {
    if (!canSubmitOtp) return;
    if (markMutation.isPending) return;
    if (success) return;

    markMutation.mutate({ otp: otp.trim() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canSubmitOtp]);

  const anim = useMemo(
    () => ({
      initial: reduceMotion ? { opacity: 1 } : { opacity: 0, y: 8 },
      animate: { opacity: 1, y: 0 },
      exit: reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 },
      transition: { duration: 0.25 },
    }),
    [reduceMotion],
  );

  return (
    <Card className="border-primary/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5 text-primary" />
          Mark Attendance
        </CardTitle>
        <CardDescription>
          Use the 6-digit OTP or scan the QR code. We validate instantly and show a success confirmation.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <AnimatePresence mode="wait">
          {success ? (
            <motion.div key="success" {...anim} className="rounded-lg border border-success/30 bg-success/10 p-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  <CheckCircle2 className="h-6 w-6 text-success" />
                </div>
                <div className="flex-1">
                  <div className="font-medium">Attendance recorded</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {success.points > 0 ? `You earned ${success.points} points.` : "You're all set for this lecture."}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Badge className="bg-success text-success-foreground">Present</Badge>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSuccess(null);
                        setOtp("");
                        setToken("");
                      }}
                    >
                      Mark again
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div key="form" {...anim} className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-lg border border-border/60 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <KeyRound className="h-5 w-5 text-primary" />
                      <div className="font-medium">OTP</div>
                    </div>
                    <Badge variant="secondary">6 digits</Badge>
                  </div>

                  <p className="text-sm text-muted-foreground mt-2">
                    Enter the OTP displayed by your lecturer. We auto-submit when complete.
                  </p>

                  <div className="mt-4">
                    <InputOTP
                      maxLength={6}
                      value={otp}
                      onChange={(v) => {
                        // only digits
                        setOtp(v.replace(/[^0-9]/g, ""));
                      }}
                      disabled={markMutation.isPending}
                    >
                      <InputOTPGroup>
                        {Array.from({ length: 6 }).map((_, i) => (
                          <InputOTPSlot key={i} index={i} />
                        ))}
                      </InputOTPGroup>
                    </InputOTP>
                  </div>

                  <div className="mt-4 text-xs text-muted-foreground">
                    {markMutation.isPending ? "Validating…" : ""}
                  </div>
                </div>

                <div className="rounded-lg border border-border/60 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Camera className="h-5 w-5 text-primary" />
                      <div className="font-medium">QR scan</div>
                    </div>
                    <Badge variant="secondary">Coming soon</Badge>
                  </div>

                  <p className="text-sm text-muted-foreground mt-2">
                    QR camera scanning is coming soon. For now, use the OTP or paste the token below.
                  </p>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Button variant="outline" className="gap-2" disabled>
                      <QrCode className="h-4 w-4" />
                      Scan QR (coming soon)
                    </Button>

                    <Button
                      className="gap-2"
                      onClick={() => markMutation.mutate({ token: token.trim() })}
                      disabled={!canSubmitToken || markMutation.isPending}
                    >
                      Validate token
                    </Button>
                  </div>

                  <Separator className="my-4" />

                  <div className="space-y-2">
                    <div className="text-sm font-medium">Token (fallback)</div>
                    <Input
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      placeholder="Paste token from QR if needed"
                      disabled={markMutation.isPending}
                    />
                    <p className="text-xs text-muted-foreground">
                      Paste the token from the QR/link if scanning isn’t available.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
