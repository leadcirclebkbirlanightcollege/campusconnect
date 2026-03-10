/**
 * APP PROVIDERS — Global state providers
 *
 * AppProviders
 *   - AuthProvider
 *   - QueryProvider
 *   - TenantProvider  ← multi-tenant college context
 *   - ThemeProvider
 *   - PerformanceProvider
 *   - TooltipProvider
 *   - NotificationProvider
 */

import * as React from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/providers/AuthProvider";
import { QueryProvider, queryClient } from "@/providers/QueryProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { NotificationProvider } from "@/providers/NotificationProvider";
import { PerformanceProvider } from "@/providers/PerformanceProvider";
import { TenantProvider } from "@/providers/TenantProvider";

interface AppProvidersProps {
  children: React.ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <AuthProvider>
      <QueryProvider>
        <TenantProvider>
          <ThemeProvider>
            <PerformanceProvider>
              <TooltipProvider delayDuration={400}>
                <NotificationProvider>{children}</NotificationProvider>
              </TooltipProvider>
            </PerformanceProvider>
          </ThemeProvider>
        </TenantProvider>
      </QueryProvider>
    </AuthProvider>
  );
}

export { queryClient };


