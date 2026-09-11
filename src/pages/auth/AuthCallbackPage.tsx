import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { resolveRoleDashboard, isRouteAllowedForRole } from "@/lib/roleRouting";
import { usePlatformBranding } from "@/hooks/use-platform-branding";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, CheckCircle2, ShieldCheck, ArrowRight } from "@/components/icons";

type CallbackState = "processing" | "success" | "mfa_required" | "error";

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { branding } = usePlatformBranding();

  const [state, setState] = useState<CallbackState>("processing");
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    let mounted = true;

    async function handleAuthCallback() {
      // 1. Inspect URL parameters and hash for recovery or explicit errors
      const hash = window.location.hash.startsWith("#")
        ? window.location.hash.substring(1)
        : window.location.hash;
      const hashParams = new URLSearchParams(hash);

      const error = searchParams.get("error") || hashParams.get("error");
      const errorDescription =
        searchParams.get("error_description") || hashParams.get("error_description");
      const errorCode = searchParams.get("error_code") || hashParams.get("error_code");

      // Password recovery token redirect
      if (hashParams.get("type") === "recovery" || searchParams.get("type") === "recovery") {
        navigate("/reset-password" + window.location.hash, { replace: true });
        return;
      }

      // Explicit Supabase error parameters
      if (error || errorCode) {
        if (!mounted) return;
        setState("error");
        if (errorCode === "otp_expired") {
          setErrorMessage("The authentication link or code has expired. Please request a new one.");
        } else {
          setErrorMessage(
            errorDescription || "Authentication failed or the link is invalid. Please sign in again."
          );
        }
        return;
      }

      // 2. Check for active session established by Supabase client
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          if (!mounted) return;
          setState("error");
          setErrorMessage(sessionError.message);
          return;
        }

        if (session?.user) {
          await processUserRouting(session.user.id);
        } else {
          // Listen for onAuthStateChange in case session is processing in the background
          const {
            data: { subscription },
          } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
            if (!mounted) return;
            if (event === "PASSWORD_RECOVERY") {
              subscription.unsubscribe();
              navigate("/reset-password" + window.location.hash, { replace: true });
              return;
            }
            if (nextSession?.user) {
              subscription.unsubscribe();
              await processUserRouting(nextSession.user.id);
            }
          });

          // Timeout fallback after 8 seconds
          setTimeout(() => {
            if (mounted && state === "processing") {
              subscription.unsubscribe();
              setState("error");
              setErrorMessage("Authentication session timed out. Please try signing in again.");
            }
          }, 8000);
        }
      } catch (err: any) {
        if (!mounted) return;
        setState("error");
        setErrorMessage(err.message || "An unexpected error occurred during authentication.");
      }
    }

    async function processUserRouting(userId: string) {
      if (!mounted) return;

      // Check MFA requirement
      try {
        const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (aal?.currentLevel === "aal1" && aal?.nextLevel === "aal2") {
          // User must complete MFA challenge
          setState("mfa_required");
          setTimeout(() => {
            navigate("/auth?mfa=true", { replace: true });
          }, 1500);
          return;
        }
      } catch {
        // Continue if MFA check is not available
      }

      // Resolve role and destination
      try {
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .maybeSingle();

        const role = roleData?.role;

        // Student onboarding & approval checks
        if (role !== "super_admin" && role !== "admin" && role !== "faculty") {
          const { data: profile } = await supabase
            .from("profiles")
            .select("profile_completed, approval_status, college_assigned")
            .eq("user_id", userId)
            .maybeSingle();

          if (!profile || !profile.profile_completed) {
            return navigate("/onboarding-wizard", { replace: true });
          }
          if (profile.approval_status !== "approved" || !profile.college_assigned) {
            return navigate("/pending-approval", { replace: true });
          }
        }

        // Check stored redirect
        const storedRedirect = sessionStorage.getItem("cc_redirect_after_login");
        if (storedRedirect) {
          sessionStorage.removeItem("cc_redirect_after_login");
          if (
            storedRedirect.startsWith("/") &&
            !storedRedirect.startsWith("//") &&
            !storedRedirect.startsWith("/auth") &&
            isRouteAllowedForRole(role, storedRedirect)
          ) {
            return navigate(storedRedirect, { replace: true });
          }
        }

        // Canonical role destination
        setState("success");
        setTimeout(() => {
          navigate(resolveRoleDashboard(role), { replace: true });
        }, 500);
      } catch {
        navigate("/app/dashboard", { replace: true });
      }
    }

    handleAuthCallback();

    return () => {
      mounted = false;
    };
  }, [navigate, searchParams, state]);

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[520px] h-[520px] bg-primary/10 rounded-full blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-md rounded-[24px] border border-border-subtle bg-surface-1/90 p-8 shadow-2xl backdrop-blur-md text-center space-y-6"
      >
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 text-primary">
            {state === "processing" && <Loader2 className="h-7 w-7 animate-spin" />}
            {state === "success" && <CheckCircle2 className="h-7 w-7 text-emerald-500" />}
            {state === "mfa_required" && <ShieldCheck className="h-7 w-7 text-amber-500" />}
            {state === "error" && <AlertCircle className="h-7 w-7 text-destructive" />}
          </div>

          <h2 className="text-xl font-bold tracking-tight text-foreground">
            {state === "processing" && "Authenticating…"}
            {state === "success" && "Sign-In Verified"}
            {state === "mfa_required" && "Two-Factor Auth Required"}
            {state === "error" && "Authentication Error"}
          </h2>

          <p className="text-sm text-muted-foreground max-w-xs">
            {state === "processing" &&
              "Verifying your secure credentials and preparing your dashboard…"}
            {state === "success" && "Redirecting to your campus workspace…"}
            {state === "mfa_required" &&
              "Redirecting to complete two-factor authentication challenge…"}
            {state === "error" && (errorMessage || "Unable to complete authentication.")}
          </p>
        </div>

        {state === "error" && (
          <div className="pt-2">
            <Button
              onClick={() => navigate("/auth", { replace: true })}
              className="w-full h-11 rounded-xl"
            >
              Back to Sign In <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
