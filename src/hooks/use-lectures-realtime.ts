import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

/**
 * Subscribe to lecture row changes and run a callback (used to keep student/admin UI in sync in realtime).
 */
export function useLecturesRealtime(
  onChange: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void,
  enabled: boolean = true,
) {
  useEffect(() => {
    if (!enabled) return;

    const channel = supabase
      .channel(`lectures_realtime_${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lectures" },
        (payload) => onChange(payload as RealtimePostgresChangesPayload<Record<string, unknown>>),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, onChange]);
}
