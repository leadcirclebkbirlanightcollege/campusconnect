import { Navigate } from "react-router-dom";
import FullPageLoader from "@/components/system/FullPageLoader";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: "admin" | "student";
}

const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { status, role } = useAuth();

  if (status === "loading") {
    return <FullPageLoader label="Checking session…" />;
  }

  if (status === "unauthenticated") {
    return <Navigate to="/auth" replace />;
  }

  if (requiredRole && role !== requiredRole) {
    // Redirect to appropriate dashboard based on role
    if (role === "admin") {
      return <Navigate to="/admin" replace />;
    } else if (role === "student") {
      return <Navigate to="/student" replace />;
    }
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;