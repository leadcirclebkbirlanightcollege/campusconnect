import * as React from "react";
import { QueryClient, QueryClientProvider, MutationCache } from "@tanstack/react-query";
import { GC_TIME, STALE_TIME } from "@/ui-engine/performance-engine";
import { normalizeError, logTechnicalError } from "@/lib/error-handling";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        const status = error?.status ?? error?.code;
        // Never retry 401, 403, 404, or unrecoverable client errors
        if ([401, 403, 404, 422].includes(Number(status))) return false;
        const codeStr = String(error?.code || "");
        if (codeStr === "42501" || codeStr === "23505") return false;
        return failureCount < 2;
      },
      retryDelay: (attempt) => Math.min(500 * 2 ** attempt, 8000),
      networkMode: "always",
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      refetchOnReconnect: true,
      staleTime: STALE_TIME.attendance,
      gcTime: GC_TIME.medium,
    },
    mutations: { retry: 0 },
  },
  mutationCache: new MutationCache({
    onError: (error: any, _variables, _context, mutation) => {
      // If mutation has explicit onError handler, let it handle the UI toast
      // But still log technical error centrally
      const appError = normalizeError(error, mutation.options.mutationKey ? String(mutation.options.mutationKey) : "mutation");
      logTechnicalError(appError);
    },
  }),
});

export function QueryProvider({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
