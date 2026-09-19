import { resolveRoleDashboard } from "@/lib/roleRouting";

export interface StudentProfileState {
  profile_completed?: boolean | null;
  approval_status?: "pending" | "approved" | "rejected" | string | null;
  college_assigned?: boolean | null;
}

/**
 * Deterministically resolves the correct next destination for a user based on their
 * role and existing student onboarding / approval status.
 *
 * Guaranteed Destinations:
 * - Super Admin: /platform/admin-control/dashboard
 * - Admin: /platform/admin/dashboard
 * - Faculty: /faculty/dashboard
 * - Student (Profile Incomplete): /onboarding-wizard
 * - Student (Profile Completed, Under Review / Rejected): /pending-approval
 * - Student (Profile Completed, Approved & College Assigned): /app/dashboard
 */
export function resolveStudentOnboardingDestination(
  profile: StudentProfileState | null | undefined,
  role?: string | null
): string {
  // Staff bypasses student onboarding gates
  if (role === "super_admin" || role === "admin" || role === "faculty") {
    return resolveRoleDashboard(role);
  }

  // 1. If profile has not been completed, send directly to student onboarding wizard
  if (!profile || !profile.profile_completed) {
    return "/onboarding-wizard";
  }

  // 2. If profile is completed but not approved yet (pending or rejected), send to Under Review page
  if (profile.approval_status !== "approved" || !profile.college_assigned) {
    return "/pending-approval";
  }

  // 3. Fully approved student with college assigned
  return "/app/dashboard";
}
