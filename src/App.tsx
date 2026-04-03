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
import { AnimatePresence } from "framer-motion";

/** Overlays that must only appear for logged-in users on protected routes */
function AuthenticatedOverlays() {
  const { user, isLoading } = useAuth();
  if (isLoading || !user) return null;
  return (
    <>
      <AppSplash />
      <WhatsNewModal />
      <InstallPromptBanner />
    </>
  );
}

function OfflineAutoRecovery() {
  const { isOnline } = useNetworkStatus();
  const queryClientRef = React.useRef<ReturnType<typeof import("@tanstack/react-query").useQueryClient> | null>(null);
  try {
    // Safe import - only works inside QueryProvider
    const { useQueryClient } = require("@tanstack/react-query");
    queryClientRef.current = useQueryClient();
  } catch {}

  React.useEffect(() => {
    if (isOnline && queryClientRef.current) {
      queryClientRef.current.invalidateQueries();
    }
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

      {/* Always-on: branding, connectivity, SW update */}
      <TenantBrandingApplicator />
      <OfflineBanner />
      <SwUpdateManager />
      <NetworkHealthDot />

      <AppGuard overlays={<AuthenticatedOverlays />}>
        <AppRouter />
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
