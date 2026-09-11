import { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Mail,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  KeyRound,
  AlertCircle,
} from "@/components/icons";
import { usePlatformBranding } from "@/hooks/use-platform-branding";
import { BRANDING } from "@/config/branding";
import { APP_VERSION } from "@/config/version";
import { getAuthRedirectUrl } from "@/lib/auth-redirect";
import { showErrorToast, showSuccessToast } from "@/lib/error-handling";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { branding } = usePlatformBranding();
  const logoSrc = branding.logo_url || BRANDING.logo;
  const brandName = branding.brand_name || BRANDING.name;
  const tagline = branding.tagline || BRANDING.tagline;

  const [email, setEmail] = useState("");
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const inFlightRef = useRef(false);

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (inFlightRef.current || loading || cooldown > 0) return;

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      showErrorToast("Please enter your email address");
      return;
    }

    if (!trimmedEmail.includes("@") || !trimmedEmail.includes(".")) {
      showErrorToast("Please enter a valid email address");
      return;
    }

    inFlightRef.current = true;
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: getAuthRedirectUrl("/reset-password"),
      });

      if (error) {
        const lowerMsg = (error.message || "").toLowerCase();
        const status = (error as any).status ?? 0;

        // Explicit 429 / rate-limit detection
        if (
          status === 429 ||
          lowerMsg.includes("rate limit") ||
          lowerMsg.includes("too many requests") ||
          lowerMsg.includes("over_email_send_rate_limit")
        ) {
          throw new Error("Too many reset attempts. Please wait a few minutes before trying again.");
        }

        // For security and privacy, do not reveal user existence or expose internal database errors
        console.warn("[ForgotPassword] Auth reset error handled securely:", error.message);
      }

      // Neutral success state regardless of whether email exists (prevents user enumeration)
      setSubmittedEmail(trimmedEmail);
      setIsSubmitted(true);
      setCooldown(60);
      showSuccessToast("Reset link dispatched if account exists.");
    } catch (err: any) {
      showErrorToast(err.message || "Unable to send reset link. Please try again.");
    } finally {
      setLoading(false);
      inFlightRef.current = false;
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || inFlightRef.current) return;
    inFlightRef.current = true;
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(submittedEmail, {
        redirectTo: getAuthRedirectUrl("/reset-password"),
      });

      if (error) {
        const lowerMsg = (error.message || "").toLowerCase();
        if (
          (error as any).status === 429 ||
          lowerMsg.includes("rate limit") ||
          lowerMsg.includes("too many requests")
        ) {
          throw new Error("Please wait a few minutes before requesting another reset email.");
        }
      }

      setCooldown(60);
      showSuccessToast("Reset link re-sent if account exists.");
    } catch (err: any) {
      showErrorToast(err.message || "Failed to resend reset email.");
    } finally {
      setLoading(false);
      inFlightRef.current = false;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6 sm:p-10 relative overflow-hidden selection:bg-primary/20 selection:text-primary">
      {/* Ambient background glow */}
      <div className="absolute top-0 inset-x-0 h-64 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,hsl(var(--primary)/0.15),transparent_70%)] pointer-events-none" />
      <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-accent/10 blur-[100px] pointer-events-none" />

      {/* Main Form Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="w-full max-w-[440px] bg-surface-1/90 backdrop-blur-xl border border-border-subtle rounded-3xl p-6 sm:p-8 shadow-xl space-y-6 relative z-10"
      >
        {/* Brand Header */}
        <div className="flex items-center gap-3 select-none">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 shadow-sm p-1.5 shrink-0">
            <img src={logoSrc} alt={brandName} className="h-9 w-9 object-contain" />
          </div>
          <div>
            <p className="text-xl font-black tracking-tight text-foreground leading-tight">{brandName}</p>
            <p className="text-[11px] font-medium text-muted-foreground">{tagline}</p>
          </div>
        </div>

        {!isSubmitted ? (
          /* ── Request Password Reset Form ── */
          <div className="space-y-5">
            <div className="space-y-1.5 text-left">
              <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
                <KeyRound className="h-4 w-4" />
                <span>Account Recovery</span>
              </div>
              <h1 className="font-heading text-2xl font-black text-foreground tracking-tight">
                Reset your password
              </h1>
              <p className="text-[13px] text-muted-foreground leading-relaxed">
                Enter your account email address. If an account exists, we’ll send you a secure password reset link.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5 text-left">
                <Label htmlFor="reset-email" className="text-[13px] font-semibold text-foreground">
                  Registered Email Address
                </Label>
                <div className="relative">
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="student@college.edu or your.email@domain.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-surface-2/80 border-border-subtle focus:border-primary focus:ring-1 focus:ring-primary/30 text-[14px] h-11 rounded-xl pl-10"
                    required
                    autoFocus
                    disabled={loading}
                  />
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  className="w-full h-11 rounded-xl gap-2 shadow-md shadow-primary/25 text-[14px] font-bold"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Sending reset link...</span>
                    </>
                  ) : (
                    <>
                      <span>Send reset link</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </form>

            <div className="pt-2 text-center">
              <Link
                to="/auth"
                className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Sign In</span>
              </Link>
            </div>
          </div>
        ) : (
          /* ── Neutral Success State ── */
          <div className="space-y-5 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 border border-primary/25 text-primary">
              <CheckCircle2 className="h-7 w-7 text-primary" />
            </div>

            <div className="space-y-1.5">
              <h2 className="font-heading text-xl font-black text-foreground tracking-tight">
                Check your email
              </h2>
              <p className="text-[13px] text-muted-foreground leading-relaxed">
                If an account exists for <span className="font-semibold text-foreground">{submittedEmail}</span>, a password reset link has been dispatched.
              </p>
            </div>

            <div className="p-3.5 bg-surface-2/60 border border-border-subtle rounded-xl text-left text-xs text-muted-foreground space-y-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-foreground">
                <AlertCircle className="h-4 w-4 text-primary shrink-0" />
                <span>Next steps:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 pl-1">
                <li>Click the reset link in the email to set a new password.</li>
                <li>The link is single-use and valid for a limited time.</li>
                <li>If you don't see it, check your spam or junk folder.</li>
              </ul>
            </div>

            <div className="space-y-2 pt-2">
              <Button
                variant="outline"
                type="button"
                onClick={handleResend}
                disabled={cooldown > 0 || loading}
                className="w-full h-10 rounded-xl text-xs font-semibold"
              >
                {cooldown > 0 ? (
                  `Resend link in ${cooldown}s`
                ) : loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Sending...
                  </span>
                ) : (
                  "Didn't receive it? Resend link"
                )}
              </Button>

              <Button
                variant="ghost"
                type="button"
                onClick={() => {
                  setIsSubmitted(false);
                  setEmail("");
                }}
                className="w-full h-10 rounded-xl text-xs text-muted-foreground hover:text-foreground"
              >
                Try a different email address
              </Button>
            </div>

            <div className="pt-2 border-t border-border-subtle">
              <Link
                to="/auth"
                className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary hover:underline transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Return to Sign In</span>
              </Link>
            </div>
          </div>
        )}

        {/* Footer info */}
        <div className="text-center text-[11px] text-muted-foreground/60 border-t border-border-subtle pt-3">
          Campus Connect · Academic Operating System · v{APP_VERSION}
        </div>
      </motion.div>
    </div>
  );
}
