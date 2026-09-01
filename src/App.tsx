import { useRef, useEffect } from "react";
import ErrorBoundary from "@/components/layout/ErrorBoundary";
import AppGuard from "@/components/layout/AppGuard";
import OfflineBanner from "@/components/layout/OfflineBanner";
import NetworkHealthDot from "@/components/layout/NetworkHealthDot";
import SwUpdateManager from "@/components/pwa/SwUpdateManager";
import AppSplash from "@/components/pwa/AppSplash";
import InstallPromptBanner from "@/components/pwa/InstallPromptBanner";
import WhatsNewModal from "@/components/whats-new/WhatsNewModal";
import { AppProviders } from "@/providers/AppProviders";
import { useWebVitals } from "@/hooks/use-web-vitals";
import { useGlobalQueryErrors } from "@/hooks/use-global-query-errors";
import { BrowserRouter } from "react-router-dom";
import AppRouter from "@/router/AppRouter";
import TenantBrandingApplicator from "@/components/tenant/TenantBrandingApplicator";
import { useAuth } from "@/providers/AuthProvider";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import NoInternet from "@/components/system/NoInternet";
import PageMeta from "@/components/seo/PageMeta";
import { AnimatePresence } from "framer-motion";

/** Overlays that must only appear for logged-in users on protected routes */
function AuthenticatedOverlays() {
  const { user, isLoading } = useAuth();
  if (isLoading || !user) return null;
  return (
    <>
      <AppSplash />
      <WhatsNewModal />
    </>
  );
}

function OfflineAutoRecovery() {
  const { isOnline } = useNetworkStatus();
  const prevOnline = useRef(isOnline);

  useEffect(() => {
    // When transitioning from offline → online, refetch all queries
    if (isOnline && !prevOnline.current) {
      import("@/providers/QueryProvider").then(({ queryClient }) => {
        queryClient.invalidateQueries();
      });
    }
    prevOnline.current = isOnline;
  }, [isOnline]);

  return <AnimatePresence>{!isOnline && <NoInternet />}</AnimatePresence>;
}

function AppInner() {
  useWebVitals();
  useGlobalQueryErrors();

  return (
    <>
      {/* Offline overlay — never blocks rendering */}
      <OfflineAutoRecovery />

      {/* Always-on: branding, connectivity, SW update, install prompt, dynamic SEO */}
      <PageMeta />
      <TenantBrandingApplicator />
      <OfflineBanner />
      <SwUpdateManager />
      <NetworkHealthDot />
      <InstallPromptBanner />

      <AppGuard overlays={<AuthenticatedOverlays />}>
        <div className="flex min-h-screen flex-col">
          <div className="flex-1">
            <AppRouter />
          </div>
        </div>
      </AppGuard>
    </>
  );
}

const App = () => (
  <ErrorBoundary>
    <AppProviders>
      <BrowserRouter>
        <AppInner />
      </BrowserRouter>
    </AppProviders>
  </ErrorBoundary>
);

export default App;
