import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_LANDING_CONTENT, LandingContent, mergeLandingContent } from "@/config/landing-content";

export function useLandingContent() {
  const query = useQuery({
    queryKey: ["landing_content"],
    queryFn: async (): Promise<LandingContent> => {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", "landing_content")
        .maybeSingle();
      if (error) return DEFAULT_LANDING_CONTENT;
      return mergeLandingContent(data?.value as Partial<LandingContent> | null);
    },
    staleTime: 60_000,
    placeholderData: DEFAULT_LANDING_CONTENT,
  });
  return { content: query.data ?? DEFAULT_LANDING_CONTENT, isLoading: query.isLoading };
}
