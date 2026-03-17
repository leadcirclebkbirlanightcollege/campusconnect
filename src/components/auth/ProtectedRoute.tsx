import { useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: "admin" | "super_admin" | "student" | "faculty";
}

// Module-level role cache — survives re-mounts, cleared on sign-out via GlobalAuthListener
const roleCache = new Map<string, string>();

// Clear cache on sign-out so next login gets a fresh role fetch
supabase.auth.onAuthStateChange((event) => {
  if (event === "SIGNED_OUT") roleCache.clear();
});

const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  // Use the centralized AuthProvider — avoids duplicate session listeners
  const { user, isLoading: authLoading } = useAuth();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    if (authLoading) return; // wait for auth to settle

    if (!user) {
      setRoleLoading(false);
      return;
    }

    // Serve from cache first
    if (roleCache.has(user.id)) {
      setUserRole(roleCache.get(user.id) ?? "student");
      setRoleLoading(false);
      return;
    }

    // Fetch role from DB
    (async () => {
      try {
        const { data } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle();
        const role = data?.role ?? "student";
        roleCache.set(user.id, role);
        if (isMounted.current) {
          setUserRole(role);
          setRoleLoading(false);
        }
      } catch {
        if (isMounted.current) {
          setUserRole("student");
          setRoleLoading(false);
        }
      }
    })();
  }, [user, authLoading]);

  // Loading: wait for both auth + role
  if (authLoading || (!!user && roleLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground">Loading…</p>
        </div>
      </div>
    );
  }

  // Not authenticated → redirect to login
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Super admin on generic protected route → send to SA dashboard
  if (!requiredRole && userRole === "super_admin") {
    return <Navigate to="/platform/admin-control/dashboard" replace />;
  }

  // Role enforcement
  if (requiredRole === "super_admin" && userRole !== "super_admin") {
    return <Navigate to="/platform/admin/dashboard" replace />;
  }

  if (requiredRole === "admin" && userRole !== "admin" && userRole !== "super_admin") {
    return <Navigate to="/app/dashboard" replace />;
  }

  if (requiredRole === "student" && (userRole === "admin" || userRole === "super_admin")) {
    return <Navigate to="/platform/admin/dashboard" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
