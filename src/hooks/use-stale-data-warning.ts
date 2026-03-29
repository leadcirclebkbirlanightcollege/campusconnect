/**
 * useStaleDataWarning — Shows a toast when data hasn't been refreshed in a while.
 * Also provides a refresh callback for conflict handling.
 */
import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const STALE_WARNING_MS = 5 * 60_000; // 5 minutes

export function useStaleDataWarning(queryKey: string[], label = "Data") {
  const queryClient = useQueryClient();
  const warned = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const state = queryClient.getQueryState(queryKey);
      if (!state?.dataUpdatedAt) return;

      const age = Date.now() - state.dataUpdatedAt;
      if (age > STALE_WARNING_MS && !warned.current) {
        warned.current = true;
        toast.info(`${label} may be outdated`, {
          description: "Pull to refresh or click retry to get latest data.",
          id: `stale-${queryKey.join("-")}`,
          action: {
            label: "Refresh",
            onClick: () => {
              queryClient.invalidateQueries({ queryKey });
              warned.current = false;
            },
          },
        });
      }
    }, 30_000);

    return () => clearInterval(interval);
  }, [queryClient, queryKey, label]);
}
