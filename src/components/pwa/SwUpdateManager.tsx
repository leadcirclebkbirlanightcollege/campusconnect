/**
 * SwUpdateManager — Safe Service Worker update handler.
 *
 * Strategy: production-safe auto-activation.
 * Token/CSS fixes must reach installed PWAs immediately; otherwise old
 * precached shells keep rendering broken/invisible buttons in production.
 */
import { useEffect } from "react";

export default function SwUpdateManager() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let refreshing = false;

    const activateWaitingWorker = (worker?: ServiceWorker | null) => {
      worker?.postMessage({ type: "SKIP_WAITING" });
    };

    const onControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    const checkForWaiting = async () => {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (!reg) return;

        activateWaitingWorker(reg.waiting);

        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              activateWaitingWorker(newWorker);
            }
          });
        });
      } catch {
        // SW not available — app still loads normally.
      }
    };

    void checkForWaiting();

    // Trigger SW update check on mount
    navigator.serviceWorker.getRegistration().then((reg) => {
      reg?.update().catch(() => undefined);
    });

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  return null;
}
