import { useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: "admin" | "student";
}

// Module-level role cache so repeated mounts don't re-fetch
const roleCache = new Map<string, string>();

const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const [user, setUser] = useState<User | null | undefined>(undefined); // undefined = loading
  const [userRole, setUserRole] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;

    // Use cached session — avoids network round-trip on every mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted.current) return;
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        loadRole(u.id);
      } else {
        setRoleLoading(false);
      }
    });

    // Listen only for sign-out / sign-in changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted.current) return;
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        loadRole(u.id);
      } else {
        setUserRole(null);
        setRoleLoading(false);
      }
    });

    return () => {
      isMounted.current = false;
      subscription.unsubscribe();
    };
  }, []);

  const loadRole = async (userId: string) => {
    // Serve from cache first — no DB hit on repeated renders
    if (roleCache.has(userId)) {
      if (isMounted.current) {
        setUserRole(roleCache.get(userId) ?? null);
        setRoleLoading(false);
      }
      return;
    }

    try {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();

      const role = data?.role ?? null;
      roleCache.set(userId, role ?? "student");
      if (isMounted.current) setUserRole(role);
    } catch {
      // Silent — default to student on failure
    } finally {
      if (isMounted.current) setRoleLoading(false);
    }
  };

  // Still resolving session
  if (user === undefined || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-primary/5">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (requiredRole === "admin") {
    if (userRole !== "admin") return <Navigate to="/app/dashboard" replace />;
  }

  if (requiredRole === "student") {
    if (userRole === "admin") return <Navigate to="/app/admin/dashboard" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
