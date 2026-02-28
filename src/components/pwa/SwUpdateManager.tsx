import { useEffect } from "react";
import { registerSW } from "virtual:pwa-register";
import { toast } from "sonner";

/**
 * Registers the service worker in prompt mode.
 * Shows a toast when a new version is available — no auto-reload ever.
 * Also guards against reload loops using sessionStorage.
 */
export default function SwUpdateManager() {
  useEffect(() => {
    // --- Reload loop guard ---
    const RELOAD_KEY = "cc_reload_count";
    const RELOAD_TS_KEY = "cc_reload_ts";
    const now = Date.now();
    const count = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0);
    const ts = Number(sessionStorage.getItem(RELOAD_TS_KEY) ?? 0);

    if (now - ts < 10_000) {
      // Within 10 seconds
      if (count >= 3) {
        // Disable SW and show fallback
        if ("serviceWorker" in navigator) {
          navigator.serviceWorker.getRegistrations().then((regs) => {
            regs.forEach((r) => r.unregister());
          });
        }
        toast.error("App stability issue detected", {
          description: "Service worker disabled. Please clear cache and refresh.",
          duration: 0,
        });
        sessionStorage.removeItem(RELOAD_KEY);
        sessionStorage.removeItem(RELOAD_TS_KEY);
        return;
      }
      sessionStorage.setItem(RELOAD_KEY, String(count + 1));
    } else {
      sessionStorage.setItem(RELOAD_KEY, "1");
      sessionStorage.setItem(RELOAD_TS_KEY, String(now));
    }

    // --- SW registration ---
    const updateSW = registerSW({
      immediate: false,
      onNeedRefresh() {
        toast.info("New version available", {
          description: "Tap 'Refresh' to update Campus Connect.",
          duration: 0,
          action: {
            label: "Refresh",
            onClick: () => updateSW(true),
          },
        });
      },
      onOfflineReady() {
        console.info("[SW] App ready for offline use.");
      },
    });
  }, []);

  return null;
}
