import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
  ArrowRight,
  Mail,
  ShieldCheck,
  RefreshCw,
  LogIn,
} from "@/components/icons";
import { toast } from "sonner";
import { BRANDING } from "@/config/branding";
import { getAuthRedirectUrl } from "@/lib/auth-redirect";

type VerifyState =
  | "verifying"
  | "success"
  | "already_verified"
  | "expired"
  | "invalid";

const VERIFIED_SESSION_KEY = "cc_email_verified_state";
const VERIFIED_EMAIL_KEY = "cc_email_verified_address";

export default function EmailVerificationPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [state, setState] = useState<VerifyState>("verifying");
  const [emailAddress, setEmailAddress] = useState<string>("");
  const [resendEmail, setResendEmail] = useState<string>("");
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function evaluateVerification() {
      // 1. Check if previously verified during this browser tab session (handles page refresh)
      const cachedState = sessionStorage.getItem(VERIFIED_SESSION_KEY) as VerifyState | null;
      const cachedEmail = sessionStorage.getItem(VERIFIED_EMAIL_KEY);
      if (cachedEmail) {
        setEmailAddress(cachedEmail);
        setResendEmail(cachedEmail);
      }

      // Check hash params (Supabase standard email confirmation redirects via hash)
      const hash = window.location.hash.startsWith("#")
        ? window.location.hash.substring(1)
        : window.location.hash;
      const hashParams = new URLSearchParams(hash);

      const errorCode = searchParams.get("error_code") || hashParams.get("error_code");
      const errorDescription =
        searchParams.get("error_description") || hashParams.get("error_description") || "";
      const error = searchParams.get("error") || hashParams.get("error");
      const type = searchParams.get("type") || hashParams.get("type");

      // 2. Check for explicit error parameters
      if (errorCode || error) {
        const descLower = errorDescription.toLowerCase();
        if (
          errorCode === "otp_expired" ||
          descLower.includes("expired") ||
          descLower.includes("invalid") ||
          descLower.includes("has expired")
        ) {
          if (isMounted) setState("expired");
          return;
        }

        if (
          errorCode === "already_confirmed" ||
          descLower.includes("already confirmed") ||
          descLower.includes("already verified") ||
          descLower.includes("already been verified")
        ) {
          if (isMounted) setState("already_verified");
          return;
        }

        // Generic error state
        if (isMounted) setState("invalid");
        return;
      }

      // 3. Inspect active session / user state
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          const user = session.user;
          const userEmail = user.email || "";
          if (userEmail) {
            setEmailAddress(userEmail);
            setResendEmail(userEmail);
            sessionStorage.setItem(VERIFIED_EMAIL_KEY, userEmail);
          }

          // If email is confirmed
          if (user.email_confirmed_at) {
            sessionStorage.setItem(VERIFIED_SESSION_KEY, "success");
            if (isMounted) setState("success");
            return;
          }
        }
      } catch (err) {
        console.error("Auth session inspection error:", err);
      }

      // 4. Check if we have cached success state from refresh
      if (cachedState === "success") {
        if (isMounted) setState("success");
        return;
      }
      if (cachedState === "already_verified") {
        if (isMounted) setState("already_verified");
        return;
      }

      // 5. Listen to auth state changes (in case Supabase is processing hash tokens asynchronously)
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (!isMounted) return;

        if (session?.user) {
          if (session.user.email) {
            setEmailAddress(session.user.email);
            setResendEmail(session.user.email);
            sessionStorage.setItem(VERIFIED_EMAIL_KEY, session.user.email);
          }

          if (session.user.email_confirmed_at || event === "SIGNED_IN" || event === "USER_UPDATED") {
            sessionStorage.setItem(VERIFIED_SESSION_KEY, "success");
            setState("success");
          }
        }
      });

      // Timeout fallback: if after 2.5 seconds no token or error was parsed
      const timer = setTimeout(() => {
        if (isMounted && state === "verifying") {
          // If hash had an access_token, give success
          if (hashParams.has("access_token")) {
            sessionStorage.setItem(VERIFIED_SESSION_KEY, "success");
            setState("success");
          } else {
            setState("invalid");
          }
        }
      }, 2500);

      return () => {
        subscription.unsubscribe();
        clearTimeout(timer);
      };
    }

    evaluateVerification();

    return () => {
      isMounted = false;
    };
  }, [searchParams]);

  // Clean transition to login (clearing any transient auth session)
  const handleReturnToLogin = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // Safe to ignore
    } finally {
      // Clear URL fragments to prevent re-triggering
      window.history.replaceState(null, "", "/auth/login");
      navigate("/auth/login", { replace: true });
    }
  };

  // Handle Resend Verification Email
  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmail = resendEmail.trim().toLowerCase();
    if (!targetEmail) {
      toast.error("Please enter your registered email address.");
      return;
    }

    setResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: targetEmail,
        options: {
          emailRedirectTo: getAuthRedirectUrl("/auth/verify"),
        },
      });

      if (error) {
        if (error.message.toLowerCase().includes("already")) {
          setState("already_verified");
          return;
        }
        throw error;
      }

      setResendSuccess(true);
      toast.success("Verification email sent!", {
        description: `Check the inbox for ${targetEmail}.`,
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to resend verification email.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-8 relative overflow-hidden">
      {/* Background Accent Gradients */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, hsl(var(--primary)) 1px, transparent 0)",
          backgroundSize: "32px 32px",
        }}
      />
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-96 w-[600px] rounded-full bg-primary/10 blur-[140px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative z-10 w-full max-w-[500px] rounded-2xl border border-border-subtle bg-surface-1/90 backdrop-blur-xl p-6 sm:p-8 shadow-2xl text-center"
      >
        {/* Brand Header */}
        <div className="flex items-center justify-center gap-2.5 mb-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 p-1.5 shrink-0">
            <img
              src={BRANDING.logo}
              alt={BRANDING.name}
              className="h-6 w-6 object-contain"
            />
          </div>
          <span className="font-heading font-extrabold text-base tracking-tight text-foreground">
            {BRANDING.name}
          </span>
        </div>

        {/* ── State 1: Verifying Spinner ── */}
        {state === "verifying" && (
          <div className="py-8 space-y-4">
            <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">Verifying email address…</h1>
            <p className="text-sm text-muted-foreground">
              Please wait while we confirm your credentials with Campus Connect.
            </p>
          </div>
        )}

        {/* ── State 2: Verification Success (Exact Required Spec) ── */}
        {state === "success" && (
          <div className="space-y-5">
            <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/10 border border-primary/25 flex items-center justify-center text-primary shadow-lg shadow-primary/15">
              <CheckCircle2 className="h-9 w-9 text-primary" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-black tracking-tight text-foreground">
                Email verified successfully! ✓
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Your email address has been successfully verified.
              </p>
            </div>

            {emailAddress && (
              <div className="p-3 rounded-xl bg-surface-2 border border-border-subtle flex items-center justify-center gap-2 text-xs font-mono text-foreground/90">
                <Mail className="h-3.5 w-3.5 text-primary" />
                <span>{emailAddress}</span>
              </div>
            )}

            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 text-left space-y-1">
              <p className="text-xs font-bold text-primary flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 shrink-0" />
                Account Activated
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Please log in again to continue. You can now set up your student profile and submit your college ID.
              </p>
            </div>

            <Button
              onClick={handleReturnToLogin}
              className="w-full h-12 text-sm font-bold gap-2 shadow-lg shadow-primary/25"
            >
              Return to Campus Connect <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* ── State 3: Already Verified ── */}
        {state === "already_verified" && (
          <div className="space-y-5">
            <div className="mx-auto h-16 w-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-500">
              <ShieldCheck className="h-8 w-8" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-black tracking-tight text-foreground">
                Email already verified
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Your email address has already been verified and activated on Campus Connect.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-surface-2 border border-border-subtle text-xs text-muted-foreground">
              You can proceed directly to sign in with your credentials.
            </div>

            <Button
              onClick={handleReturnToLogin}
              className="w-full h-12 text-sm font-bold gap-2 shadow-md shadow-primary/20"
            >
              <LogIn className="h-4 w-4" /> Continue to Login
            </Button>
          </div>
        )}

        {/* ── State 4: Expired / Invalid Token ── */}
        {state === "expired" && (
          <div className="space-y-5">
            <div className="mx-auto h-16 w-16 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-500">
              <Clock className="h-8 w-8" />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                Verification link expired or invalid
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                This verification link has expired or has already been used. Please request a fresh verification link below.
              </p>
            </div>

            {resendSuccess ? (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-left space-y-2">
                <p className="text-xs font-bold text-emerald-500 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  New verification link dispatched
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  We've sent a new confirmation email to <span className="font-semibold text-foreground">{resendEmail}</span>. Please check your inbox and click the new link.
                </p>
              </div>
            ) : (
              <form onSubmit={handleResend} className="space-y-3 text-left">
                <div className="space-y-1.5">
                  <Label htmlFor="resend-email" className="text-xs font-semibold">
                    Registered Email Address
                  </Label>
                  <Input
                    id="resend-email"
                    type="email"
                    required
                    placeholder="student@bkbc.edu.in"
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    className="h-10 text-sm"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={resending}
                  className="w-full h-11 text-sm font-bold gap-2"
                >
                  {resending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  {resending ? "Sending New Link…" : "Resend verification email"}
                </Button>
              </form>
            )}

            <Button
              variant="outline"
              onClick={handleReturnToLogin}
              className="w-full h-11 text-sm border-border-subtle"
            >
              Return to Campus Connect
            </Button>
          </div>
        )}

        {/* ── State 5: Missing / Invalid Parameters ── */}
        {state === "invalid" && (
          <div className="space-y-5">
            <div className="mx-auto h-16 w-16 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive">
              <AlertCircle className="h-8 w-8" />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                No Pending Verification
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We couldn't detect an active verification token in this URL. If you already verified your email, please proceed to sign in.
              </p>
            </div>

            <div className="flex flex-col gap-2.5 pt-2">
              <Button
                onClick={handleReturnToLogin}
                className="w-full h-12 text-sm font-bold gap-2 shadow-md shadow-primary/20"
              >
                Return to Campus Connect <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                onClick={() => setState("expired")}
                className="w-full h-11 text-sm border-border-subtle"
              >
                Need a new verification link?
              </Button>
            </div>
          </div>
        )}

        {/* Institutional Footer */}
        <div className="mt-8 pt-4 border-t border-border-subtle text-center text-[11px] text-muted-foreground/80 space-y-0.5">
          <p className="font-semibold text-foreground/80">{BRANDING.name} · Department of Computer Science</p>
          <p>B. K. Birla Night Arts, Science & Commerce College, Kalyan.</p>
        </div>
      </motion.div>
    </div>
  );
}
