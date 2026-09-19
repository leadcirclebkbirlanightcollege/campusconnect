import { useEffect, useState, useRef } from "react";
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
  KeyRound,
  LogIn,
} from "@/components/icons";
import { toast } from "sonner";
import { BRANDING } from "@/config/branding";
import { getAuthRedirectUrl } from "@/lib/auth-redirect";
import { resolveStudentOnboardingDestination } from "@/lib/onboardingRouting";

type VerifyViewState =
  | "verifying" // Actively verifying URL hash/callback token
  | "code_entry" // User enters the 8-digit verification code
  | "success" // Verified successfully, preparing redirect
  | "already_verified" // Already verified account
  | "expired"; // Token/code expired

const VERIFIED_EMAIL_KEY = "cc_email_verified_address";

export default function EmailVerificationPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Verification code state (8 digits)
  const [viewState, setViewState] = useState<VerifyViewState>("verifying");
  const [emailAddress, setEmailAddress] = useState<string>(() => {
    return (
      searchParams.get("email") ||
      (typeof window !== "undefined" ? sessionStorage.getItem(VERIFIED_EMAIL_KEY) || "" : "")
    );
  });
  const [verificationCode, setVerificationCode] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isSubmittingCode, setIsSubmittingCode] = useState(false);
  const [redirectTarget, setRedirectTarget] = useState<string>("/onboarding-wizard");

  // Resend state
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // In-flight guard against duplicate submissions
  const verifyInFlight = useRef(false);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  /**
   * Helper: Determine user's current destination without signing out.
   */
  const resolveAndRedirectUser = async (userId: string, immediate: boolean = false) => {
    try {
      const [{ data: roleData }, { data: profileData }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle(),
        supabase
          .from("profiles")
          .select("profile_completed, approval_status, college_assigned")
          .eq("user_id", userId)
          .maybeSingle(),
      ]);

      const target = resolveStudentOnboardingDestination(profileData, roleData?.role);
      setRedirectTarget(target);
      setViewState("success");

      if (immediate) {
        navigate(target, { replace: true });
      } else {
        setTimeout(() => {
          navigate(target, { replace: true });
        }, 900);
      }
    } catch {
      // Safe fallback to onboarding wizard
      navigate("/onboarding-wizard", { replace: true });
    }
  };

  /**
   * 1. Inspect URL parameters / hash on mount.
   * Handles incoming email confirmation links from Gmail / external browsers.
   */
  useEffect(() => {
    let isMounted = true;

    async function evaluateUrlTokens() {
      const hash = window.location.hash.startsWith("#")
        ? window.location.hash.substring(1)
        : window.location.hash;
      const hashParams = new URLSearchParams(hash);

      const errorCode = searchParams.get("error_code") || hashParams.get("error_code");
      const errorDescription =
        searchParams.get("error_description") || hashParams.get("error_description") || "";
      const error = searchParams.get("error") || hashParams.get("error");

      // Handle explicit error query/hash from Supabase
      if (errorCode || error) {
        const descLower = (errorDescription || "").toLowerCase();
        if (
          errorCode === "otp_expired" ||
          descLower.includes("expired") ||
          descLower.includes("has expired")
        ) {
          if (isMounted) {
            setViewState("expired");
            setErrorMessage("This verification link or code has expired. Please request a new one below.");
          }
          return;
        }

        if (
          errorCode === "already_confirmed" ||
          descLower.includes("already confirmed") ||
          descLower.includes("already verified") ||
          descLower.includes("already been verified")
        ) {
          if (isMounted) setViewState("already_verified");
          return;
        }

        if (isMounted) {
          setViewState("code_entry");
          setErrorMessage(errorDescription || "Invalid or unparseable verification link. Please enter your code manually.");
        }
        return;
      }

      // Check if URL has access_token (email confirmation link returned by Supabase)
      const hasAccessToken = hashParams.has("access_token") || searchParams.has("code");

      // Inspect active Supabase session
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          const user = session.user;
          const userEmail = user.email || "";
          if (userEmail && isMounted) {
            setEmailAddress(userEmail);
            sessionStorage.setItem(VERIFIED_EMAIL_KEY, userEmail);
          }

          // If user email is confirmed and authenticated, resolve and route
          if (user.email_confirmed_at) {
            if (isMounted) {
              await resolveAndRedirectUser(user.id);
            }
            return;
          }
        }
      } catch (err) {
        console.error("Session inspection notice:", err);
      }

      // Listen to auth state changes (Supabase client processes hash tokens asynchronously)
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
        if (!isMounted) return;

        if (nextSession?.user) {
          if (nextSession.user.email) {
            setEmailAddress(nextSession.user.email);
            sessionStorage.setItem(VERIFIED_EMAIL_KEY, nextSession.user.email);
          }

          if (
            nextSession.user.email_confirmed_at ||
            event === "SIGNED_IN" ||
            event === "USER_UPDATED"
          ) {
            subscription.unsubscribe();
            await resolveAndRedirectUser(nextSession.user.id);
          }
        }
      });

      // If no token in URL and no active confirmed session after a brief check, show the 8-digit code entry view
      const timeout = setTimeout(() => {
        if (isMounted && viewState === "verifying") {
          subscription.unsubscribe();
          if (!hasAccessToken) {
            setViewState("code_entry");
          } else {
            // Token was present but couldn't be parsed
            setViewState("code_entry");
            setErrorMessage("We couldn't verify the link automatically. Please enter your 8-digit verification code below.");
          }
        }
      }, hasAccessToken ? 3000 : 350);

      return () => {
        subscription.unsubscribe();
        clearTimeout(timeout);
      };
    }

    evaluateUrlTokens();

    return () => {
      isMounted = false;
    };
  }, [searchParams]);

  /**
   * Handle manual 8-digit verification code submission.
   */
  const handleVerifyCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (verifyInFlight.current) return;
    const cleanEmail = emailAddress.trim().toLowerCase();
    const cleanCode = verificationCode.trim().replace(/\D/g, "");

    if (!cleanEmail || !cleanEmail.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }

    if (!cleanCode || cleanCode.length !== 8) {
      toast.error("Please enter the complete 8-digit verification code.");
      return;
    }

    verifyInFlight.current = true;
    setIsSubmittingCode(true);
    setErrorMessage("");

    try {
      // 1. First attempt verification with type 'signup' (official email confirmation OTP type)
      let authResult = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: cleanCode,
        type: "signup",
      });

      // 2. Fallback to type 'email' if signup type returned invalid parameter error
      if (authResult.error) {
        const errLower = (authResult.error.message || "").toLowerCase();
        if (
          errLower.includes("already confirmed") ||
          errLower.includes("already verified") ||
          authResult.error.code === "already_confirmed"
        ) {
          toast.info("Account is already verified.");
          // Attempt sign in or resolve current session
          const { data: currentSession } = await supabase.auth.getSession();
          if (currentSession.session?.user) {
            await resolveAndRedirectUser(currentSession.session.user.id);
            return;
          } else {
            navigate("/auth", { replace: true });
            return;
          }
        }

        // Try email OTP type fallback
        const fallback = await supabase.auth.verifyOtp({
          email: cleanEmail,
          token: cleanCode,
          type: "email",
        });

        if (!fallback.error) {
          authResult = fallback;
        }
      }

      if (authResult.error) {
        const msg = authResult.error.message || "";
        const msgLower = msg.toLowerCase();

        if (
          authResult.error.code === "otp_expired" ||
          msgLower.includes("expired") ||
          msgLower.includes("has expired")
        ) {
          throw new Error("This 8-digit verification code has expired. Please click 'Resend Code' below.");
        }

        if (msgLower.includes("invalid") || msgLower.includes("token")) {
          throw new Error("Incorrect 8-digit verification code. Please check your email and try again.");
        }

        throw authResult.error;
      }

      const verifiedUser = authResult.data?.user;
      if (!verifiedUser) {
        throw new Error("Verification succeeded, but session could not be established. Please sign in.");
      }

      toast.success("Email verified successfully! 🎉");
      sessionStorage.setItem(VERIFIED_EMAIL_KEY, cleanEmail);

      // Successfully verified — resolve onboarding state and route
      await resolveAndRedirectUser(verifiedUser.id);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to verify code. Please try again.");
      toast.error(err.message || "Verification failed");
    } finally {
      setIsSubmittingCode(false);
      verifyInFlight.current = false;
    }
  };

  /**
   * Handle Resend Verification Code
   */
  const handleResendCode = async () => {
    const cleanEmail = emailAddress.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      toast.error("Please enter a valid registered email address.");
      return;
    }

    if (resendCooldown > 0) return;

    setResending(true);
    setErrorMessage("");

    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: cleanEmail,
        options: {
          emailRedirectTo: getAuthRedirectUrl("/auth/verify"),
        },
      });

      if (error) {
        const lower = error.message.toLowerCase();
        if (lower.includes("already confirmed") || lower.includes("already verified")) {
          setViewState("already_verified");
          return;
        }
        if (lower.includes("rate limit") || lower.includes("too many requests")) {
          throw new Error("Please wait a few minutes before requesting another code.");
        }
        throw error;
      }

      setResendCooldown(60);
      toast.success("New 8-digit code dispatched!", {
        description: `Check your inbox at ${cleanEmail}.`,
      });
    } catch (err: any) {
      toast.error(err.message || "Could not resend verification email.");
    } finally {
      setResending(false);
    }
  };

  /**
   * Handle pasting verification code from clipboard.
   * Strips spaces/dashes and auto-submits if 8 digits are detected.
   */
  const handleCodePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text");
    const digits = pasted.replace(/\D/g, "").slice(0, 8);
    setVerificationCode(digits);

    if (digits.length === 8 && emailAddress.trim()) {
      // Trigger submission immediately
      setTimeout(() => {
        handleVerifyCode();
      }, 50);
    }
  };

  /**
   * Handle clean transition to sign in (clears active session)
   */
  const handleSwitchAccount = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignored
    } finally {
      navigate("/auth", { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-8 relative overflow-hidden text-foreground">
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

        {/* ── View 1: Automatic Verifying Spinner (Email Link Processing) ── */}
        {viewState === "verifying" && (
          <div className="py-8 space-y-4">
            <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">Verifying email address…</h1>
            <p className="text-sm text-muted-foreground">
              Processing your verification token and establishing your campus session.
            </p>
          </div>
        )}

        {/* ── View 2: 8-Digit Verification Code Entry & Confirmation ── */}
        {viewState === "code_entry" && (
          <div className="space-y-5 text-left">
            <div className="text-center space-y-1.5">
              <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-3">
                <KeyRound className="h-7 w-7" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Verify Your Email
              </h1>
              <p className="text-sm text-muted-foreground">
                Enter the <strong>8-digit verification code</strong> sent to your email address or click the verification link in your inbox.
              </p>
            </div>

            {/* Error Message Alert */}
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 flex items-start gap-2.5 text-xs text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div className="flex-1 leading-relaxed">{errorMessage}</div>
              </div>
            )}

            <form onSubmit={handleVerifyCode} className="space-y-4">
              {/* Email Address */}
              <div className="space-y-1.5">
                <Label htmlFor="verify-email" className="text-[13px] font-semibold text-foreground">
                  Registered Email Address
                </Label>
                <div className="relative">
                  <Input
                    id="verify-email"
                    type="email"
                    required
                    placeholder="student@college.edu"
                    value={emailAddress}
                    onChange={(e) => setEmailAddress(e.target.value)}
                    className="h-11 pl-9 text-sm bg-surface-2/80 border-border-subtle"
                  />
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
              </div>

              {/* 8-Digit Code Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="verification-code" className="text-[13px] font-semibold text-foreground">
                    8-Digit Verification Code
                  </Label>
                  <span className="text-[11px] font-mono text-muted-foreground">
                    {verificationCode.length}/8 digits
                  </span>
                </div>

                <Input
                  id="verification-code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={8}
                  placeholder="31305366"
                  value={verificationCode}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 8);
                    setVerificationCode(val);
                  }}
                  onPaste={handleCodePaste}
                  className="h-12 text-center font-mono tracking-[0.3em] sm:tracking-[0.4em] text-xl font-bold rounded-xl bg-surface-2/80 border-border-subtle focus:border-primary"
                  autoFocus
                  autoComplete="one-time-code"
                  required
                />
                <p className="text-[11px] text-muted-foreground text-center">
                  Tip: You can paste the complete 8-digit code directly.
                </p>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isSubmittingCode || verificationCode.length !== 8 || !emailAddress.trim()}
                className="w-full h-12 text-[14px] font-bold gap-2 shadow-lg shadow-primary/25 mt-2"
              >
                {isSubmittingCode ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Verifying Code…
                  </>
                ) : (
                  <>
                    Verify Code & Continue <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            {/* Resend Action */}
            <div className="pt-2 border-t border-border-subtle/80 flex items-center justify-between text-xs text-muted-foreground">
              <span>Didn't receive the email?</span>
              <button
                type="button"
                onClick={handleResendCode}
                disabled={resending || resendCooldown > 0}
                className="text-primary font-semibold hover:underline disabled:opacity-50 disabled:hover:no-underline flex items-center gap-1"
              >
                {resending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <RefreshCw className="h-3 w-3" />
                )}
                {resendCooldown > 0 ? `Resend code (${resendCooldown}s)` : "Resend code"}
              </button>
            </div>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={handleSwitchAccount}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Sign in with a different account &rarr;
              </button>
            </div>
          </div>
        )}

        {/* ── View 3: Verification Success (Establishing Session & Auto-Redirecting) ── */}
        {viewState === "success" && (
          <div className="space-y-5">
            <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/10 border border-primary/25 flex items-center justify-center text-primary shadow-lg shadow-primary/15">
              <CheckCircle2 className="h-9 w-9 text-primary" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-black tracking-tight text-foreground">
                Email Verified Successfully! ✓
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Your authenticated session is active. Taking you to your campus workspace…
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
                Session Established
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your credentials are confirmed. You will be redirected automatically in a moment.
              </p>
            </div>

            <Button
              onClick={() => navigate(redirectTarget, { replace: true })}
              className="w-full h-12 text-sm font-bold gap-2 shadow-lg shadow-primary/25"
            >
              Continue Now <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* ── View 4: Already Verified ── */}
        {viewState === "already_verified" && (
          <div className="space-y-5">
            <div className="mx-auto h-16 w-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-500">
              <ShieldCheck className="h-8 w-8" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-black tracking-tight text-foreground">
                Email Already Verified
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                This account is already verified and active on Campus Connect.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-surface-2 border border-border-subtle text-xs text-muted-foreground">
              You can proceed directly to your campus onboarding or student dashboard.
            </div>

            <Button
              onClick={async () => {
                const { data } = await supabase.auth.getSession();
                if (data?.session?.user) {
                  await resolveAndRedirectUser(data.session.user.id, true);
                } else {
                  navigate("/auth", { replace: true });
                }
              }}
              className="w-full h-12 text-sm font-bold gap-2 shadow-md shadow-primary/20"
            >
              <LogIn className="h-4 w-4" /> Continue to Campus Connect
            </Button>
          </div>
        )}

        {/* ── View 5: Token / Code Expired ── */}
        {viewState === "expired" && (
          <div className="space-y-5 text-left">
            <div className="text-center space-y-2">
              <div className="mx-auto h-16 w-16 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-500 mb-2">
                <Clock className="h-8 w-8" />
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                Verification Link or Code Expired
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Security codes expire after a limited period. Request a fresh 8-digit verification code below:
              </p>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="expired-email" className="text-xs font-semibold">
                  Registered Email Address
                </Label>
                <Input
                  id="expired-email"
                  type="email"
                  required
                  placeholder="student@college.edu"
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                  className="h-10 text-sm"
                />
              </div>

              <Button
                onClick={async () => {
                  await handleResendCode();
                  setViewState("code_entry");
                }}
                disabled={resending || resendCooldown > 0 || !emailAddress.trim()}
                className="w-full h-11 text-sm font-bold gap-2"
              >
                {resending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                {resendCooldown > 0 ? `Resend Code (${resendCooldown}s)` : "Send New 8-Digit Code"}
              </Button>

              <Button
                variant="outline"
                onClick={() => setViewState("code_entry")}
                className="w-full h-11 text-sm border-border-subtle"
              >
                Enter Code Manually
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
