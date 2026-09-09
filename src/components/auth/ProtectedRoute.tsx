import { Navigate, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/providers/AuthProvider";
import { useTenant } from "@/providers/TenantProvider";
import { resolveRoleDashboard } from "@/lib/roleRouting";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: "admin" | "super_admin" | "student" | "faculty";
}

/**
 * ProtectedRoute — Uses AuthProvider + TenantProvider (single source of truth).
 * Enforces strict console isolation:
 * - Super Admin is strictly isolated to /platform/admin-control/*
 * - College Admin is isolated to /platform/admin/*
 * - Faculty is isolated to /faculty/*
 * - Student is isolated to /app/*
 */
const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const location = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const { isLoading: tenantLoading } = useTenant();

  // Derive role canonically from TenantProvider
  const userRole = useResolvedRole();

  // Loading: wait for both auth + tenant role resolution before making any routing decisions
  if (authLoading || (!!user && (tenantLoading || userRole === null))) {
    return null;
  }

  // Not authenticated → redirect to login, preserving destination for deep linking
  if (!user) {
    const fullTarget = location.pathname + location.search + location.hash;
    if (fullTarget && fullTarget !== "/" && fullTarget !== "/auth" && !fullTarget.startsWith("/auth?")) {
      sessionStorage.setItem("cc_redirect_after_login", fullTarget);
      return <Navigate to={`/auth?redirect=${encodeURIComponent(fullTarget)}`} replace />;
    }
    return <Navigate to="/auth" replace />;
  }

  // Role-based redirects on generic protected route (no requiredRole specified)
  if (!requiredRole) {
    if (userRole === "super_admin") return <Navigate to="/platform/admin-control/dashboard" replace />;
    if (userRole === "admin") return <Navigate to="/platform/admin/dashboard" replace />;
    if (userRole === "faculty") return <Navigate to="/faculty/dashboard" replace />;
  }

  // ── Role enforcement with strict console isolation ─────────────────────────

  // 1. Super Admin route (/platform/admin-control/*)
  if (requiredRole === "super_admin" && userRole !== "super_admin") {
    return <Navigate to={resolveRoleDashboard(userRole)} replace />;
  }

  // 2. College Admin route (/platform/admin/*)
  // Super Admin must NEVER be silently routed into or allowed to view College Admin console
  if (requiredRole === "admin") {
    if (userRole === "super_admin") {
      return <Navigate to="/platform/admin-control/dashboard" replace />;
    }
    if (userRole !== "admin") {
      return <Navigate to={resolveRoleDashboard(userRole)} replace />;
    }
  }

  // 3. Faculty route (/faculty/*)
  if (requiredRole === "faculty" && userRole !== "faculty") {
    return <Navigate to={resolveRoleDashboard(userRole)} replace />;
  }

  // 4. Student route
  if (requiredRole === "student" && userRole !== "student") {
    return <Navigate to={resolveRoleDashboard(userRole)} replace />;
  }

  return <>{children}</>;
};

/**
 * Hook to resolve user role from TenantProvider's canonical context.
 * Falls back to React Query cache only if context role is not yet populated.
 */
function useResolvedRole(): string | null {
  const { user } = useAuth();
  const tenant = useTenant();
  const queryClient = useQueryClient();

  if (!user) return null;
  if (tenant.role) return tenant.role;
  if (tenant.isSuperAdmin) return "super_admin";

  // Fallback check from React Query cache (for compatibility with partial mocks)
  const cached = queryClient.getQueryData(["tenant", "role", user.id]) as
    | { role: string; college_id: string | null }
    | undefined;

  if (cached?.role) return cached.role;

  // If tenant is still loading, wait until settled
  if (tenant.isLoading) return null;

  return "student";
}

export default ProtectedRoute;
