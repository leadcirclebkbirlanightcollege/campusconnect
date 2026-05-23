import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { useOnboardingStatus } from "@/hooks/use-onboarding-status";

/**
 * OnboardingGate — wraps protected student routes.
 * - Not signed in → /auth
 * - Profile incomplete → /onboarding-wizard
 * - Pending or no college assigned → /pending-approval
 * - Approved → render
 * - Staff (admin/faculty/super_admin) → bypass entirely
 */
export default function OnboardingGate({ children }: { children: ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const { data: status, isLoading } = useOnboardingStatus();
  const { pathname } = useLocation();

  if (authLoading || (user && isLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (!status) return <>{children}</>;

  const isStaff = status.role === "admin" || status.role === "super_admin" || status.role === "faculty";
  if (isStaff) return <>{children}</>;

  if (!status.profile_completed && pathname !== "/onboarding-wizard") {
    return <Navigate to="/onboarding-wizard" replace />;
  }
  if (
    status.profile_completed &&
    (status.approval_status !== "approved" || !status.college_assigned) &&
    pathname !== "/pending-approval"
  ) {
    return <Navigate to="/pending-approval" replace />;
  }

  return <>{children}</>;
}
