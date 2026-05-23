import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";

export interface OnboardingStatus {
  profile_completed: boolean;
  approval_status: "pending" | "approved" | "rejected";
  college_assigned: boolean;
  college_id: string | null;
  rejection_reason: string | null;
  role: string | null;
}

/**
 * Resolves the current user's onboarding + approval state.
 * Admins / faculty / super_admin bypass the gate (treated as approved).
 */
export function useOnboardingStatus() {
  const { user, isLoading: authLoading } = useAuth();

  const query = useQuery<OnboardingStatus | null>({
    queryKey: ["onboarding_status", user?.id],
    enabled: !authLoading && Boolean(user?.id),
    staleTime: 15_000,
    queryFn: async () => {
      const uid = user!.id;
      const [{ data: profile }, { data: roleRow }] = await Promise.all([
        supabase
          .from("profiles")
          .select(
            "profile_completed, approval_status, college_assigned, college_id, rejection_reason"
          )
          .eq("user_id", uid)
          .maybeSingle(),
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", uid)
          .maybeSingle(),
      ]);

      const role = (roleRow?.role as string | undefined) ?? "student";
      const isStaff = role === "admin" || role === "super_admin" || role === "faculty";

      return {
        profile_completed: isStaff ? true : Boolean(profile?.profile_completed),
        approval_status: (isStaff ? "approved" : (profile?.approval_status as any) ?? "pending"),
        college_assigned: isStaff ? true : Boolean(profile?.college_assigned),
        college_id: profile?.college_id ?? null,
        rejection_reason: profile?.rejection_reason ?? null,
        role,
      };
    },
  });

  return query;
}
