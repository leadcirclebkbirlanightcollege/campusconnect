import ErrorBoundary from "@/components/layout/ErrorBoundary";
import OfflineBanner from "@/components/layout/OfflineBanner";
import NetworkHealthDot from "@/components/layout/NetworkHealthDot";
import SwUpdateManager from "@/components/pwa/SwUpdateManager";
import AppSplash from "@/components/pwa/AppSplash";
import InstallPromptBanner from "@/components/pwa/InstallPromptBanner";
import WhatsNewModal from "@/components/whats-new/WhatsNewModal";
import { AppProviders } from "@/providers/AppProviders";
import { useWebVitals } from "@/hooks/use-web-vitals";
import { BrowserRouter } from "react-router-dom";
import AppRouter from "@/router/AppRouter";
import TenantBrandingApplicator from "@/components/tenant/TenantBrandingApplicator";

function AppInner() {
  useWebVitals();

  return (
    <>
      <TenantBrandingApplicator />
      <OfflineBanner />
      <SwUpdateManager />
      <AppSplash />
      <WhatsNewModal />
      <NetworkHealthDot />
      <InstallPromptBanner />
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

