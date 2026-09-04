/**
 * APP PROVIDERS — Global state providers
 *
 * AppProviders
 *   - AuthProvider
 *   - QueryProvider  ← also installs global auth-state → cache-clear listener
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
import { FestivalThemeProvider } from "@/contexts/FestivalThemeContext";
import { NotificationProvider } from "@/providers/NotificationProvider";
import { PerformanceProvider } from "@/providers/PerformanceProvider";
import { TenantProvider } from "@/providers/TenantProvider";
import { supabase } from "@/integrations/supabase/client";

interface AppProvidersProps {
  children: React.ReactNode;
}

/** Sits inside QueryProvider so it can call queryClient safely */
function GlobalAuthListener({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      // When the user signs out (from any panel), purge all cached data
      if (event === "SIGNED_OUT") {
        queryClient.removeQueries();
        queryClient.clear();
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  return <>{children}</>;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <AuthProvider>
      <QueryProvider>
        <GlobalAuthListener>
          <TenantProvider>
            <ThemeProvider>
              <FestivalThemeProvider>
                <PerformanceProvider>
                  <TooltipProvider delayDuration={400}>
                    <NotificationProvider>{children}</NotificationProvider>
                  </TooltipProvider>
                </PerformanceProvider>
              </FestivalThemeProvider>
            </ThemeProvider>
          </TenantProvider>
        </GlobalAuthListener>
      </QueryProvider>
    </AuthProvider>
  );
}

export { queryClient };


