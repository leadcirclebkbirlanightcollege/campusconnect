/**
 * useGlobalQueryErrors — Shows toast on any React Query error globally.
 * Mount once in AppProviders or App.tsx.
 */
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export function useGlobalQueryErrors() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const cache = queryClient.getQueryCache();

    const unsubscribe = cache.subscribe((event) => {
      if (event.type !== "updated" || event.action.type !== "error") return;

      const error = event.action.error as Error | undefined;
      if (!error) return;

      const msg = error.message?.toLowerCase() ?? "";

      // Suppress auth-related errors (handled by AuthProvider)
      if (msg.includes("401") || msg.includes("unauthorized") || msg.includes("jwt")) return;

      // Network errors — single toast
      if (msg.includes("fetch") || msg.includes("network")) {
        toast.error("Network error — check your connection", { id: "network-error" });
        return;
      }

      // RLS / permission errors
      if (msg.includes("row-level security") || msg.includes("403") || msg.includes("permission")) {
        toast.error("Access denied — you may not have permission", { id: "rls-error" });
        return;
      }

      // Generic fallback (deduplicated per error message)
      toast.error("Something went wrong loading data", {
        id: `query-error-${msg.slice(0, 40)}`,
        description: import.meta.env.DEV ? error.message : undefined,
      });
    });

    return unsubscribe;
  }, [queryClient]);
}
