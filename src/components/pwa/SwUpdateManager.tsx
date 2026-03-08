import { useEffect } from "react";
import { toast } from "sonner";

const RELOAD_KEY    = "cc_reload_count";
const RELOAD_TS_KEY = "cc_reload_ts";
const MAX_RELOADS   = 1; // only ever auto-reload ONCE per 60 s window
const WINDOW_MS     = 60_000;

/**
 * Service-worker update manager — autoUpdate mode.
 *
 * When the SW detects a new version it calls skipWaiting and claims all
 * clients automatically (vite-plugin-pwa registerType: "autoUpdate").
 * We listen for the controllerchange event and do a single hard reload.
 *
 * A reload-loop guard (sessionStorage counter) prevents infinite cycling:
 * if a reload already happened within the last 60 s we skip and just
 * unregister the SW as a last resort.
 */
export default function SwUpdateManager() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const now   = Date.now();
    const count = Number(sessionStorage.getItem(RELOAD_KEY)  ?? 0);
    const ts    = Number(sessionStorage.getItem(RELOAD_TS_KEY) ?? 0);
    const withinWindow = now - ts < WINDOW_MS;

    if (withinWindow && count >= MAX_RELOADS) {
      // Already reloaded once — bail out safely
      navigator.serviceWorker.getRegistrations().then((regs) =>
        regs.forEach((r) => r.unregister())
      );
      toast.error("Update loop detected", {
        description: "Please clear your browser cache and refresh manually.",
        duration: 0,
      });
      return;
    }

    let refreshing = false;

    const handleControllerChange = () => {
      if (refreshing) return;
      refreshing = true;

      // Record this reload attempt
      sessionStorage.setItem(
        RELOAD_KEY,
        String(withinWindow ? count + 1 : 1)
      );
      sessionStorage.setItem(RELOAD_TS_KEY, String(now));

      toast.success("Updating Campus Connect…", {
        description: "Loading the latest version now.",
        duration: 2000,
      });

      // Small delay so the toast is visible before the page reloads
      setTimeout(() => window.location.reload(), 1200);
    };

    navigator.serviceWorker.addEventListener(
      "controllerchange",
      handleControllerChange
    );

    return () => {
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        handleControllerChange
      );
    };
  }, []);

  // No UI — updates are fully automatic
  return null;
}
