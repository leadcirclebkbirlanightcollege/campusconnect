import * as React from "react";
import { QueryClient, QueryClientProvider, MutationCache } from "@tanstack/react-query";
import { toast } from "sonner";
import { GC_TIME, STALE_TIME } from "@/ui-engine/performance-engine";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        const status = error?.status ?? error?.code;
        if ([401, 403, 404].includes(Number(status))) return false;
        return failureCount < 2;
      },
      retryDelay: (attempt) => Math.min(500 * 2 ** attempt, 8000),
      networkMode: "always",
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: true,
      staleTime: STALE_TIME.attendance,
      gcTime: GC_TIME.medium,
    },
    mutations: { retry: 0 },
  },
  mutationCache: new MutationCache({
    onError: (error: any) => {
      const msg = error?.message ?? "Operation failed";
      // Don't double-toast if mutation already shows its own toast
      if (msg.includes("row-level security")) {
        toast.error("Permission denied", { id: "mutation-rls" });
      }
    },
  }),
});

export function QueryProvider({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

