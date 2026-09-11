import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldAlert, Loader2, KeyRound, Mail, CheckCircle2 } from "@/components/icons";
import { toast } from "sonner";

interface ReauthenticationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  onSuccess: () => void | Promise<void>;
}

export function ReauthenticationDialog({
  open,
  onOpenChange,
  title = "Verify Your Identity",
  description = "To perform this sensitive security action, please verify your credentials.",
  onSuccess,
}: ReauthenticationDialogProps) {
  const { user } = useAuth();
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [method, setMethod] = useState<"password" | "otp">("password");
  const [otpSent, setOtpSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handlePasswordVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      toast.error("Please enter your current password");
      return;
    }
    if (!user?.email) {
      toast.error("User email not found");
      return;
    }

    setIsLoading(true);
    try {
      // Authenticate password to confirm identity
      const { error } = await supabase.auth.signInWithPassword({
        email: user.email,
        password,
      });

      if (error) {
        throw new Error(
          error.message.toLowerCase().includes("invalid")
            ? "Incorrect password. Please try again."
            : error.message
        );
      }

      toast.success("Identity verified successfully");
      setPassword("");
      onOpenChange(false);
      await onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to verify password");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendReauthOtp = async () => {
    if (!user?.email) return;
    setIsLoading(true);
    try {
      // Official Supabase JS reauthenticate API triggers reauthentication email
      const { error } = await (supabase.auth as any).reauthenticate();
      if (error) {
        // Fallback to resend if reauthenticate is not configured in project
        const { error: resendError } = await supabase.auth.resend({
          type: "reauthentication" as any,
          email: user.email,
        });
        if (resendError) throw resendError;
      }
      setOtpSent(true);
      toast.success("Verification code sent to your email");
    } catch (err: any) {
      // If project has not enabled email OTP reauth, inform user to use password
      toast.error(err.message || "Email verification unavailable. Please use password verification.");
      setMethod("password");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.trim().length < 6) {
      toast.error("Please enter a valid 6-digit verification code");
      return;
    }
    if (!user?.email) return;

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: user.email,
        token: otpCode.trim(),
        type: "reauthentication" as any,
      });

      if (error) {
        throw new Error(
          error.message.toLowerCase().includes("invalid")
            ? "Invalid or expired code. Please try again."
            : error.message
        );
      }

      toast.success("Identity verified successfully");
      setOtpCode("");
      setOtpSent(false);
      onOpenChange(false);
      await onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to verify code");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <DialogTitle className="text-center text-lg font-bold">{title}</DialogTitle>
          <DialogDescription className="text-center text-sm text-muted-foreground">
            {description}
          </DialogDescription>
        </DialogHeader>

        {method === "password" ? (
          <form onSubmit={handlePasswordVerify} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="reauth-password">Current Password</Label>
              <Input
                id="reauth-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter current password"
                disabled={isLoading}
                autoFocus
                className="h-11"
              />
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Need another verification method?</span>
              <button
                type="button"
                onClick={() => {
                  setMethod("otp");
                  if (!otpSent) handleSendReauthOtp();
                }}
                className="font-semibold text-primary hover:underline"
              >
                Use Email OTP
              </button>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading || !password}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying…
                  </>
                ) : (
                  <>
                    <KeyRound className="mr-2 h-4 w-4" /> Confirm
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <form onSubmit={handleOtpVerify} className="space-y-4 pt-2">
            {!otpSent ? (
              <div className="py-3 text-center">
                <p className="text-sm text-muted-foreground mb-4">
                  Send a one-time verification code to <strong>{user?.email}</strong>.
                </p>
                <Button
                  type="button"
                  onClick={handleSendReauthOtp}
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending…
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" /> Send Verification Code
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="reauth-otp">6-Digit Code</Label>
                  <Input
                    id="reauth-otp"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="123456"
                    disabled={isLoading}
                    autoFocus
                    className="h-11 tracking-widest text-center text-lg font-mono"
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <button
                    type="button"
                    onClick={handleSendReauthOtp}
                    disabled={isLoading}
                    className="text-primary hover:underline"
                  >
                    Resend code
                  </button>
                  <button
                    type="button"
                    onClick={() => setMethod("password")}
                    className="font-semibold text-primary hover:underline"
                  >
                    Use Password instead
                  </button>
                </div>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              {otpSent && (
                <Button type="submit" disabled={isLoading || otpCode.length < 6}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying…
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" /> Verify Code
                    </>
                  )}
                </Button>
              )}
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
