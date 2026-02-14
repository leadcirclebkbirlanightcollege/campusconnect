import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { IntelligenceScores } from "@/lib/intelligenceEngine";
import {
  calcAttendanceConsistency,
  calcBehaviourReliability,
  calcEngagementIndex,
  determineTier,
  detectRiskFlags,
} from "@/lib/intelligenceEngine";

/**
 * Hook to get intelligence scores for the current student.
 * Reads from persisted student_intelligence table first,
 * falls back to client-side computation.
 */
export function useStudentIntelligence() {
  return useQuery({
    queryKey: ["student", "intelligence"],
    queryFn: async (): Promise<IntelligenceScores> => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Not authenticated");

      // Try persisted data first
      const { data: persisted } = await supabase
        .from("student_intelligence")
        .select("attendance_consistency, behaviour_reliability, engagement_index, tier, risk_flags")
        .eq("user_id", userId)
        .maybeSingle();

      if (persisted) {
        return {
          attendanceConsistency: persisted.attendance_consistency,
          behaviourReliability: persisted.behaviour_reliability,
          engagementIndex: persisted.engagement_index,
          tier: persisted.tier as IntelligenceScores["tier"],
          riskFlags: (persisted.risk_flags as string[]) ?? [],
        };
      }

      // Fallback: compute client-side
      const [
        { data: allLectures },
        { data: myAttendance },
        { data: pointsData },
        { data: pollVotes },
        { data: programmes },
        { data: penaltyLedger },
      ] = await Promise.all([
        supabase.from("lectures").select("id").order("lecture_date", { ascending: true }),
        supabase.from("attendance").select("lecture_id").eq("student_user_id", userId).eq("status", "present"),
        supabase.from("points_ledger").select("points, source").eq("user_id", userId),
        supabase.from("poll_votes").select("id").eq("user_id", userId),
        supabase.from("student_programme_allotments").select("id").eq("student_user_id", userId),
        supabase.from("points_ledger").select("points").eq("user_id", userId).lt("points", 0),
      ]);

      const allLectureIds = (allLectures ?? []).map((l) => l.id);
      const attendedIds = (myAttendance ?? []).map((a) => a.lecture_id);
      const totalPoints = (pointsData ?? []).reduce((s, r) => s + r.points, 0);
      const manualOverrides = (pointsData ?? []).filter((p) => p.source === "manual").length;
      const penaltyDeductions = (penaltyLedger ?? []).length;
      const attendancePct = allLectureIds.length > 0 ? (attendedIds.length / allLectureIds.length) * 100 : 100;

      let consecutiveAbsences = 0;
      const attendedSet = new Set(attendedIds);
      for (let i = allLectureIds.length - 1; i >= 0; i--) {
        if (!attendedSet.has(allLectureIds[i])) consecutiveAbsences++;
        else break;
      }

      const attendanceConsistency = calcAttendanceConsistency(attendedIds, allLectureIds);
      const behaviourReliability = calcBehaviourReliability({
        totalAttendance: attendedIds.length,
        totalLectures: allLectureIds.length,
        manualOverrides,
        penaltyDeductions,
      });
      const engagementIndex = calcEngagementIndex({
        attendancePct,
        totalPoints,
        pollVotes: (pollVotes ?? []).length,
        programmesJoined: (programmes ?? []).length,
      });

      const tier = determineTier({ attendanceConsistency, behaviourReliability, engagementIndex });
      const riskFlags = detectRiskFlags({
        attendancePct,
        attendanceConsistency,
        behaviourReliability,
        consecutiveAbsences,
      });

      return { attendanceConsistency, behaviourReliability, engagementIndex, tier, riskFlags };
    },
    staleTime: 30_000,
    gcTime: 120_000,
  });
}
