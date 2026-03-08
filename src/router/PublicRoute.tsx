import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/providers/AuthProvider";
import RouteLoader from "@/router/RouteLoader";

export default function PublicRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <RouteLoader />;
  if (user) return <Navigate to="/app/dashboard" replace />;

  return <>{children}</>;
}

