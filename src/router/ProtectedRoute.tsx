import { Navigate } from "react-router-dom";
import LegacyProtectedRoute from "@/components/auth/ProtectedRoute";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: "admin" | "super_admin" | "student";
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  return (
    <LegacyProtectedRoute requiredRole={requiredRole}>
      {children}
    </LegacyProtectedRoute>
  );
}

export function AdminRoute({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute requiredRole="admin">{children}</ProtectedRoute>;
}

export function SuperAdminRoute({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute requiredRole="super_admin">{children}</ProtectedRoute>;
}

export function StudentRoute({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute requiredRole="student">{children}</ProtectedRoute>;
}

export function RequireAuth({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}

export function RedirectToApp() {
  return <Navigate to="/app/dashboard" replace />;
}
