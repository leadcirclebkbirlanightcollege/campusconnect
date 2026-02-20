import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type GrowthInsights = {
  last_30_day_attendance_pct: number;
  attended_count: number;
  total_lectures: number;
  projected_tier_next_month: string;
  projected_points: number;
  risk_probability: string;
  trend_direction: string;
};

export function useGrowthInsights() {
  return useQuery<GrowthInsights | null>({
    queryKey: ["student", "growth-insights"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_growth_insights" as any);
      if (error) throw error;
      return data as unknown as GrowthInsights;
    },
    staleTime: 60_000,
  });
}
