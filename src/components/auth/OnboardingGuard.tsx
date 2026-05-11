import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/**
 * OnboardingGuard — blocks student routes until onboarding is complete.
 * - Re-runs on every mount (so refresh cannot bypass it).
 * - Re-evaluates on auth state changes (sign-in, password update).
 * - Admins / faculty / super_admin pass through untouched.
 */
export default function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [state, setState] = useState<"loading" | "ok" | "needs_onboarding">("loading");

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          if (!cancelled) setState("ok");
          return;
        }
        const [{ data: roles }, { data: profile }] = await Promise.all([
          supabase.from("user_roles").select("role").eq("user_id", user.id),
          supabase
            .from("profiles")
            .select("must_change_password, onboarding_completed")
            .eq("user_id", user.id)
            .maybeSingle(),
        ]);

        const isStudent = roles?.some((r) => r.role === "student") ?? false;
        if (!isStudent) {
          if (!cancelled) setState("ok");
          return;
        }
        const needs = profile?.must_change_password || !profile?.onboarding_completed;
        if (!cancelled) setState(needs ? "needs_onboarding" : "ok");
      } catch {
        if (!cancelled) setState("ok");
      }
    };

    check();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      if (!cancelled) check();
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [location.pathname]);

  if (state === "loading") {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (state === "needs_onboarding" && !location.pathname.startsWith("/app/onboarding")) {
    return <Navigate to="/app/onboarding" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}
