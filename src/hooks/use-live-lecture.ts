import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type LiveLecture = {
  id: string;
  topic: string;
  lecture_date: string;
  start_time: string;
  end_time: string;
  venue: string;
  status: "scheduled" | "live" | "ended";
};

/**
 * Hook to get the current live lecture (if any) with realtime updates.
 * Caches aggressively to reduce re-fetches.
 */
export function useLiveLecture() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["student", "live-lecture"],
    queryFn: async (): Promise<LiveLecture | null> => {
      const { data, error } = await supabase
        .from("lectures")
        .select("id, topic, lecture_date, start_time, end_time, venue, status")
        .eq("status", "live")
        .order("lecture_date", { ascending: true })
        .order("start_time", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as LiveLecture | null;
    },
    staleTime: 10_000, // 10 seconds
    gcTime: 60_000, // 1 minute
    refetchInterval: 15_000, // Poll every 15 seconds as backup
  });

  // Realtime subscription for instant updates
  useEffect(() => {
    const channel = supabase
      .channel("live_lecture_hook")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lectures" },
        () => {
          qc.invalidateQueries({ queryKey: ["student", "live-lecture"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  return query;
}

/**
 * Hook to check if the current user has marked attendance for a specific lecture.
 */
export function useMyAttendance(lectureId: string | undefined) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["student", "my-attendance", lectureId],
    enabled: Boolean(lectureId),
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return null;

      const { data, error } = await supabase
        .from("attendance")
        .select("id, status, marked_at, points_earned")
        .eq("lecture_id", lectureId!)
        .eq("student_user_id", user.user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    staleTime: 30_000,
    gcTime: 60_000,
  });

  // Realtime for instant feedback
  useEffect(() => {
    if (!lectureId) return;

    const channel = supabase
      .channel(`my_attendance_${lectureId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "attendance", filter: `lecture_id=eq.${lectureId}` },
        () => {
          qc.invalidateQueries({ queryKey: ["student", "my-attendance", lectureId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [lectureId, qc]);

  return query;
}
