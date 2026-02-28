import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { IntelligenceScores } from "@/lib/intelligenceEngine";

/**
 * Hook to get intelligence scores for the current student.
 * Strictly reads persisted student_intelligence only (no client-side math).
 * If missing, triggers a server recompute and retries once.
 */
export function useStudentIntelligence() {
  return useQuery({
    queryKey: ["student", "intelligence"],
    queryFn: async (): Promise<IntelligenceScores> => {
      // Use cached session to avoid a network round-trip on every render
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) throw new Error("Not authenticated");

      const readPersisted = async () => {
        const { data } = await supabase
          .from("student_intelligence")
          .select("attendance_consistency, behaviour_reliability, engagement_index, tier, risk_flags")
          .eq("user_id", userId)
          .maybeSingle();

        if (!data) return null;
        return {
          attendanceConsistency: data.attendance_consistency,
          behaviourReliability: data.behaviour_reliability,
          engagementIndex: data.engagement_index,
          tier: data.tier as IntelligenceScores["tier"],
          riskFlags: (data.risk_flags as string[]) ?? [],
        } satisfies IntelligenceScores;
      };

      const persisted = await readPersisted();
      if (persisted) return persisted;

      // Best-effort recompute (server-side) then retry once
      await supabase.functions.invoke("recompute-intelligence", { body: { userId } });

      const after = await readPersisted();
      if (after) return after;

      // Fail safe: never compute client-side; return zeros
      return {
        attendanceConsistency: 0,
        behaviourReliability: 0,
        engagementIndex: 0,
        tier: "bronze",
        riskFlags: [],
      };
    },
    staleTime: 30_000,
    gcTime: 120_000,
  });
}
