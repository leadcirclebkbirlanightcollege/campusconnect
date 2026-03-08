/**
 * SessionGuard
 * Mounts inside authenticated layouts to enforce:
 *  - Inactivity auto-logout (30 min idle warning + 1 min grace)
 *  - Periodic token refresh (every 10 min) to prevent silent expiry
 *  - Hard redirect on auth errors (401/403 from React Query)
 */
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useInactivityLogout } from "@/hooks/use-inactivity-logout";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const TOKEN_REFRESH_INTERVAL_MS = 10 * 60 * 1000; // 10 min

export default function SessionGuard() {
  useInactivityLogout(true);

  const navigate     = useNavigate();
  const queryClient  = useQueryClient();

  /* ── Periodic silent token refresh ───────────────────────────── */
  useEffect(() => {
    const refresh = async () => {
      const { error } = await supabase.auth.refreshSession();
      if (error) {
        // Session is gone — clear cache and redirect
        queryClient.clear();
        toast.error("Session expired", { description: "Please sign in again." });
        navigate("/auth", { replace: true });
      }
    };

    const id = setInterval(refresh, TOKEN_REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [navigate, queryClient]);

  /* ── Global auth state listener ──────────────────────────────── */
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT" || event === "TOKEN_REFRESHED") {
        if (event === "SIGNED_OUT") {
          queryClient.clear();
          navigate("/auth", { replace: true });
        }
      }
      if (event === "USER_UPDATED") {
        // Invalidate profile queries when user metadata changes
        queryClient.invalidateQueries({ queryKey: ["profile"] });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, queryClient]);

  return null; // Render nothing — pure side-effect component
}
