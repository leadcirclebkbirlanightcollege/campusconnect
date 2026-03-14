import ErrorBoundary from "@/components/layout/ErrorBoundary";
import OfflineBanner from "@/components/layout/OfflineBanner";
import NetworkHealthDot from "@/components/layout/NetworkHealthDot";
import SwUpdateManager from "@/components/pwa/SwUpdateManager";
import AppSplash from "@/components/pwa/AppSplash";
import InstallPromptBanner from "@/components/pwa/InstallPromptBanner";
import WhatsNewModal from "@/components/whats-new/WhatsNewModal";
import { AppProviders } from "@/providers/AppProviders";
import { useWebVitals } from "@/hooks/use-web-vitals";
import { BrowserRouter, useLocation } from "react-router-dom";
import AppRouter from "@/router/AppRouter";
import TenantBrandingApplicator from "@/components/tenant/TenantBrandingApplicator";
import { useAuth } from "@/providers/AuthProvider";

// Public routes where overlays (WhatsNew, Splash, Install) must NOT appear
const PUBLIC_PATHS = ["/", "/auth", "/auth/login", "/auth/signup"];

function AppInner() {
  useWebVitals();
  const { user, isLoading } = useAuth();
  const { pathname } = useLocation();

  const isPublicRoute = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith("/auth"));
  const showOverlays = !isLoading && !!user && !isPublicRoute;

  return (
    <>
      <TenantBrandingApplicator />
      <OfflineBanner />
      <SwUpdateManager />
      {showOverlays && <AppSplash />}
      {showOverlays && <WhatsNewModal />}
      <NetworkHealthDot />
      {showOverlays && <InstallPromptBanner />}
      <AppRouter />
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

