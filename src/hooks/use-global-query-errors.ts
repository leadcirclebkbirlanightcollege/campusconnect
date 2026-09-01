/**
 * useGlobalQueryErrors — Shows safe, normalized notification on any React Query error globally.
 * Mount once in AppProviders or App.tsx.
 */
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { normalizeError, logTechnicalError } from "@/lib/error-handling";

export function useGlobalQueryErrors() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const cache = queryClient.getQueryCache();

    const unsubscribe = cache.subscribe((event) => {
      if (event.type !== "updated" || event.action.type !== "error") return;

      const error = event.action.error as Error | undefined;
      if (!error) return;

      const msg = error.message?.toLowerCase() ?? "";
      const name = (error as any)?.name?.toLowerCase?.() ?? "";

      // Suppress benign abort errors (component unmount / query cancellation)
      if (
        name === "aborterror" ||
        msg.includes("aborted") ||
        msg.includes("signal is aborted")
      ) {
        return;
      }

      // Normalize error through central classification
      const appError = normalizeError(error, "global-query");
      logTechnicalError(appError);

      // Suppress auth-related errors from global toast spam (handled by AuthProvider / SessionGuard)
      if (appError.category === "authentication") return;

      if (appError.category === "network") {
        toast.error(appError.userMessage, {
          id: "network-error-global",
          description: appError.userDescription,
        });
        return;
      }

      if (appError.category === "authorization") {
        toast.error(appError.userMessage, {
          id: "auth-error-global",
          description: appError.userDescription,
        });
        return;
      }

      // Deduplicated fallback toast for queries that don't render an inline DataErrorState
      toast.error(appError.userMessage, {
        id: `query-error-${appError.category}-${appError.userMessage.slice(0, 30)}`,
        description: appError.userDescription,
      });
    });

    return unsubscribe;
  }, [queryClient]);
}
