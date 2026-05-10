import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/**
 * OnboardingGuard — redirects students with incomplete onboarding to /app/onboarding.
 * Only applies to students; admins/faculty/super_admin pass through.
 */
export default function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [state, setState] = useState<"loading" | "ok" | "needs_onboarding">("loading");

  useEffect(() => {
    let cancelled = false;
    (async () => {
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
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state === "loading") return null;
  if (state === "needs_onboarding" && !location.pathname.startsWith("/app/onboarding")) {
    return <Navigate to="/app/onboarding" replace />;
  }
  return <>{children}</>;
}
