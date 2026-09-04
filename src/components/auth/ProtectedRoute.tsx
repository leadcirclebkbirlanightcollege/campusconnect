import { Navigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/providers/AuthProvider";
import { useTenant } from "@/providers/TenantProvider";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: "admin" | "super_admin" | "student" | "faculty";
}

/**
 * ProtectedRoute — Uses AuthProvider + TenantProvider (single source of truth).
 * No more duplicate role fetching or module-level caches.
 */
const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { user, isLoading: authLoading } = useAuth();
  const { isLoading: tenantLoading, isSuperAdmin, collegeId } = useTenant();

  // Derive role from TenantProvider's cached query
  const userRole = useResolvedRole();

  // Loading: wait for both auth + tenant role resolution (AppSplash handles the initial splash)
  if (authLoading || (!!user && (tenantLoading || userRole === null))) {
    return null;
  }

  // Not authenticated → redirect to login
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Role-based redirects on generic protected route (no requiredRole)
  if (!requiredRole) {
    if (userRole === "super_admin") return <Navigate to="/platform/admin-control/dashboard" replace />;
    if (userRole === "admin") return <Navigate to="/platform/admin/dashboard" replace />;
    if (userRole === "faculty") return <Navigate to="/faculty/dashboard" replace />;
  }

  // Role enforcement
  if (requiredRole === "super_admin" && userRole !== "super_admin") {
    return <Navigate to="/platform/admin/dashboard" replace />;
  }
  if (requiredRole === "admin" && userRole !== "admin" && userRole !== "super_admin") {
    return <Navigate to="/app/dashboard" replace />;
  }
  if (requiredRole === "faculty" && userRole !== "faculty" && userRole !== "admin" && userRole !== "super_admin") {
    return <Navigate to="/app/dashboard" replace />;
  }
  if (requiredRole === "student" && (userRole === "admin" || userRole === "super_admin")) {
    return <Navigate to="/platform/admin/dashboard" replace />;
  }

  return <>{children}</>;
};

/**
 * Hook to resolve user role from TenantProvider's cached query data.
 * This avoids any additional DB calls — TenantProvider already fetches this.
 */
function useResolvedRole(): string | null {
  const { user } = useAuth();
  const { isSuperAdmin } = useTenant();
  const queryClient = useQueryClient();

  if (!user) return null;
  if (isSuperAdmin) return "super_admin";

  // Read from React Query cache (set by TenantProvider)
  const cached = queryClient.getQueryData(["tenant", "role", user.id]) as
    | { role: string; college_id: string | null }
    | undefined;
  return cached?.role ?? "student";
}

export default ProtectedRoute;
