import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Centralized logout hook — used across all panels (Super Admin, Admin, Student).
 * 1. Signs out from Supabase
 * 2. Removes all React Query queries (stops in-flight refetches)
 * 3. Clears the entire cache (purges stale session data)
 * 4. Redirects to /auth
 */
export function useLogout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("[useLogout] signOut error:", err);
    } finally {
      // Always clear cache and redirect, even if signOut throws
      queryClient.removeQueries();
      queryClient.clear();
      navigate("/auth", { replace: true });
    }
  };

  return logout;
}
