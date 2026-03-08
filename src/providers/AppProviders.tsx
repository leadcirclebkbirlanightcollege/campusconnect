/**
 * APP PROVIDERS — Global state providers
 *
 * AppProviders
 *   - AuthProvider
 *   - QueryProvider
 *   - ThemeProvider
 *   - TooltipProvider
 *   - NotificationProvider
 */

import * as React from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/providers/AuthProvider";
import { QueryProvider, queryClient } from "@/providers/QueryProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { NotificationProvider } from "@/providers/NotificationProvider";

interface AppProvidersProps {
  children: React.ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <AuthProvider>
      <QueryProvider>
        <ThemeProvider>
          <TooltipProvider delayDuration={400}>
            <NotificationProvider>{children}</NotificationProvider>
          </TooltipProvider>
        </ThemeProvider>
      </QueryProvider>
    </AuthProvider>
  );
}

export { queryClient };

