import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_LANDING_CONTENT, LandingContent, mergeLandingContent } from "@/config/landing-content";

export function useLandingContent() {
  const qc = useQueryClient();

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
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    placeholderData: DEFAULT_LANDING_CONTENT,
  });

  // Live-update across tabs/visitors when super admin saves.
  useEffect(() => {
    const channel = supabase
      .channel("landing_content_live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "platform_settings", filter: "key=eq.landing_content" },
        (payload) => {
          const next = (payload.new as { value?: Partial<LandingContent> } | null)?.value;
          if (next) {
            qc.setQueryData(["landing_content"], mergeLandingContent(next));
          } else {
            qc.invalidateQueries({ queryKey: ["landing_content"] });
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);

  return { content: query.data ?? DEFAULT_LANDING_CONTENT, isLoading: query.isLoading };
}
