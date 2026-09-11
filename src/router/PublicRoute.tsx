import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/providers/AuthProvider";
import { useTenant } from "@/providers/TenantProvider";
import { resolveRoleDashboard } from "@/lib/roleRouting";

export default function PublicRoute({ children }: { children: ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const { role, isLoading: tenantLoading } = useTenant();

  // If a signup is actively initializing its profile and navigating to onboarding, do not interrupt
  if (typeof window !== "undefined" && sessionStorage.getItem("cc_signup_in_progress") === "true") {
    return <>{children}</>;
  }

  // If password recovery is active in URL hash or sessionStorage, do not redirect to dashboard
  if (
    typeof window !== "undefined" &&
    (window.location.hash.includes("type=recovery") ||
      sessionStorage.getItem("cc_password_recovery_active") === "true")
  ) {
    return <>{children}</>;
  }

  if (authLoading || (!!user && tenantLoading)) return null;
  if (user) return <Navigate to={resolveRoleDashboard(role)} replace />;

  return <>{children}</>;
}
