import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  KeyRound,
  ShieldCheck,
} from "@/components/icons";
import { usePlatformBranding } from "@/hooks/use-platform-branding";
import { BRANDING } from "@/config/branding";
import { APP_VERSION } from "@/config/version";
import { showErrorToast, showSuccessToast } from "@/lib/error-handling";

type ResetStatus = "checking" | "ready" | "success" | "expired";

const RECOVERY_STORAGE_KEY = "cc_password_recovery_active";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { branding } = usePlatformBranding();
  const logoSrc = branding.logo_url || BRANDING.logo;
  const brandName = branding.brand_name || BRANDING.name;
  const tagline = branding.tagline || BRANDING.tagline;

  const [status, setStatus] = useState<ResetStatus>("checking");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const inFlightRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    // 1. Inspect URL parameters & hash for explicit error codes
    const hash = window.location.hash.startsWith("#")
      ? window.location.hash.substring(1)
      : window.location.hash;
    const hashParams = new URLSearchParams(hash);

    const errorCode = searchParams.get("error_code") || hashParams.get("error_code");
    const errorDescription =
      searchParams.get("error_description") || hashParams.get("error_description") || "";
    const error = searchParams.get("error") || hashParams.get("error");
    const type = searchParams.get("type") || hashParams.get("type");

    if (errorCode || error) {
      const descLower = errorDescription.toLowerCase();
      console.warn("[ResetPassword] Recovery error in URL:", { errorCode, errorDescription });
      if (mounted) {
        setStatus("expired");
      }
      return;
    }

    // 2. Listen to Supabase auth events for PASSWORD_RECOVERY
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (event === "PASSWORD_RECOVERY") {
        if (typeof window !== "undefined") {
          sessionStorage.setItem(RECOVERY_STORAGE_KEY, "true");
        }
        setStatus("ready");
      } else if (
        session?.user &&
        (type === "recovery" ||
          hash.includes("type=recovery") ||
          sessionStorage.getItem(RECOVERY_STORAGE_KEY) === "true")
      ) {
        setStatus("ready");
      }
    });

    // 3. Inspect existing active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;

      if (session?.user) {
        // If recovery token or active recovery session is indicated
        if (
          type === "recovery" ||
          hash.includes("type=recovery") ||
          hash.includes("access_token") ||
          sessionStorage.getItem(RECOVERY_STORAGE_KEY) === "true"
        ) {
          if (typeof window !== "undefined") {
            sessionStorage.setItem(RECOVERY_STORAGE_KEY, "true");
          }
          setStatus("ready");
          return;
        }
      }
    });

    // 4. Grace period fallback: if after 2000ms no recovery session is recognized, mark expired/invalid
    const timer = setTimeout(async () => {
      if (!mounted) return;
      if (status === "checking") {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && sessionStorage.getItem(RECOVERY_STORAGE_KEY) === "true") {
          setStatus("ready");
        } else {
          setStatus("expired");
        }
      }
    }, 2000);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (inFlightRef.current || submitting) return;

    // Local validation
    if (!newPassword) {
      setValidationError("Please enter a new password");
      return;
    }

    if (newPassword.length < 6) {
      setValidationError("Password must be at least 6 characters long");
      return;
    }

    if (newPassword !== confirmPassword) {
      setValidationError("Passwords do not match");
      return;
    }

    inFlightRef.current = true;
    setSubmitting(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        const lower = (error.message || "").toLowerCase();
        if (
          lower.includes("jwt") ||
          lower.includes("session") ||
          lower.includes("expired") ||
          lower.includes("auth")
        ) {
          setStatus("expired");
          throw new Error("Your password reset session has expired. Please request a new link.");
        }
        throw new Error(error.message || "Failed to update password. Please try again.");
      }

      // Cleanup recovery session flag
      if (typeof window !== "undefined") {
        sessionStorage.removeItem(RECOVERY_STORAGE_KEY);
      }

      // Sign out temporary recovery session to guarantee safe, fresh sign-in
      await supabase.auth.signOut().catch(() => {});

      setStatus("success");
      showSuccessToast("Password updated successfully! 👋");
    } catch (err: any) {
      showErrorToast(err.message || "Failed to update password.");
      setValidationError(err.message);
    } finally {
      setSubmitting(false);
      inFlightRef.current = false;
    }
  };

  const isMinLength = newPassword.length >= 6;
  const isMatch = newPassword.length > 0 && newPassword === confirmPassword;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6 sm:p-10 relative overflow-hidden selection:bg-primary/20 selection:text-primary">
      {/* Ambient background glow */}
      <div className="absolute top-0 inset-x-0 h-64 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,hsl(var(--primary)/0.15),transparent_70%)] pointer-events-none" />
      <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-accent/10 blur-[100px] pointer-events-none" />

      {/* Main Card */}
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

        {/* ── Status 1: Checking Recovery Session ── */}
        {status === "checking" && (
          <div className="py-10 text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 border border-primary/25 text-primary">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
            <div className="space-y-1">
              <h2 className="font-heading text-lg font-bold text-foreground">
                Verifying recovery session...
              </h2>
              <p className="text-xs text-muted-foreground">
                Please wait while we validate your secure password reset credentials.
              </p>
            </div>
          </div>
        )}

        {/* ── Status 2: Active Recovery Session / Form Ready ── */}
        {status === "ready" && (
          <div className="space-y-5">
            <div className="space-y-1.5 text-left">
              <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
                <ShieldCheck className="h-4 w-4" />
                <span>Security Credentials</span>
              </div>
              <h1 className="font-heading text-2xl font-black text-foreground tracking-tight">
                Create new password
              </h1>
              <p className="text-[13px] text-muted-foreground leading-relaxed">
                Choose a strong new password to regain access to your Campus Connect account.
              </p>
            </div>

            {validationError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-xs text-destructive flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{validationError}</span>
              </div>
            )}

            <form onSubmit={handleUpdatePassword} className="space-y-4">
              {/* New Password Input */}
              <div className="space-y-1.5 text-left">
                <Label htmlFor="new-password" className="text-[13px] font-semibold text-foreground">
                  New Password
                </Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="At least 6 characters"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      if (validationError) setValidationError(null);
                    }}
                    className="bg-surface-2/80 border-border-subtle focus:border-primary focus:ring-1 focus:ring-primary/30 text-[14px] h-11 rounded-xl pl-10 pr-10"
                    required
                    autoFocus
                    disabled={submitting}
                  />
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password Input */}
              <div className="space-y-1.5 text-left">
                <Label htmlFor="confirm-new-password" className="text-[13px] font-semibold text-foreground">
                  Confirm New Password
                </Label>
                <div className="relative">
                  <Input
                    id="confirm-new-password"
                    type={showConfirm ? "text" : "password"}
                    placeholder="Re-enter your new password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (validationError) setValidationError(null);
                    }}
                    className="bg-surface-2/80 border-border-subtle focus:border-primary focus:ring-1 focus:ring-primary/30 text-[14px] h-11 rounded-xl pl-10 pr-10"
                    required
                    disabled={submitting}
                  />
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                    aria-label={showConfirm ? "Hide password" : "Show password"}
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Password Quality Requirements */}
              <div className="p-3 bg-surface-2/60 border border-border-subtle rounded-xl space-y-1.5 text-left text-xs">
                <p className="font-semibold text-foreground text-[11px] uppercase tracking-wider">
                  Password Requirements:
                </p>
                <div className="flex items-center gap-2">
                  <div
                    className={`h-3.5 w-3.5 rounded-full flex items-center justify-center text-[9px] ${
                      isMinLength
                        ? "bg-primary text-primary-foreground font-bold"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    ✓
                  </div>
                  <span className={isMinLength ? "text-foreground font-medium" : "text-muted-foreground"}>
                    At least 6 characters
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className={`h-3.5 w-3.5 rounded-full flex items-center justify-center text-[9px] ${
                      isMatch
                        ? "bg-primary text-primary-foreground font-bold"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    ✓
                  </div>
                  <span className={isMatch ? "text-foreground font-medium" : "text-muted-foreground"}>
                    Both passwords match
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  className="w-full h-11 rounded-xl gap-2 shadow-md shadow-primary/25 text-[14px] font-bold"
                  disabled={submitting || !isMinLength || !isMatch}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Updating password...</span>
                    </>
                  ) : (
                    <>
                      <span>Update Password</span>
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
        )}

        {/* ── Status 3: Password Updated Successfully ── */}
        {status === "success" && (
          <div className="space-y-5 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 border border-primary/25 text-primary">
              <CheckCircle2 className="h-7 w-7 text-primary" />
            </div>

            <div className="space-y-1.5">
              <h2 className="font-heading text-xl font-black text-foreground tracking-tight">
                Password updated successfully
              </h2>
              <p className="text-[13px] text-muted-foreground leading-relaxed">
                Your account password has been changed. You can now use your new password to sign in to Campus Connect.
              </p>
            </div>

            <div className="pt-2">
              <Button
                type="button"
                onClick={() => navigate("/auth", { replace: true })}
                className="w-full h-11 rounded-xl gap-2 shadow-md shadow-primary/25 text-[14px] font-bold"
              >
                <span>Sign In to Campus Connect</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Status 4: Link Expired or Invalid ── */}
        {status === "expired" && (
          <div className="space-y-5 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 border border-destructive/25 text-destructive">
              <AlertCircle className="h-7 w-7 text-destructive" />
            </div>

            <div className="space-y-1.5">
              <h2 className="font-heading text-xl font-black text-foreground tracking-tight">
                Reset link expired or invalid
              </h2>
              <p className="text-[13px] text-muted-foreground leading-relaxed">
                This password reset link has expired, has already been used, or is invalid. For your security, password reset links can only be used once.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <Button
                type="button"
                onClick={() => navigate("/forgot-password")}
                className="w-full h-11 rounded-xl gap-2 shadow-md shadow-primary/25 text-[14px] font-bold"
              >
                <KeyRound className="h-4 w-4" />
                <span>Request a new reset link</span>
              </Button>

              <Button
                variant="outline"
                type="button"
                onClick={() => navigate("/auth")}
                className="w-full h-10 rounded-xl text-xs font-semibold"
              >
                Return to Sign In
              </Button>
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
