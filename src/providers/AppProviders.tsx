/**
 * APP PROVIDERS — Global state providers
 *
 * Wraps the entire application with:
 *   - QueryProvider  (React Query)
 *   - ThemeProvider  (dark/light)
 *   - TooltipProvider
 *
 * Auth state is managed via Supabase client directly (no extra context needed).
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        const status = error?.status ?? error?.code;
        if ([401, 403, 404].includes(Number(status))) return false;
        return failureCount < 2;
      },
      retryDelay: (attempt) => Math.min(500 * 2 ** attempt, 8000),
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      refetchOnReconnect: true,
      staleTime: 30_000,
      gcTime: 5 * 60_000,
    },
    mutations: { retry: 0 },
  },
});

interface AppProvidersProps {
  children: React.ReactNode;
}

import * as React from "react";

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={400}>
        {children}
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export { queryClient };
