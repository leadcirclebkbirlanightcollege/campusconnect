/**
 * SwUpdateManager — Safe Service Worker update handler.
 *
 * Strategy: "prompt" mode (no auto-reload).
 * When a new SW finishes installing and is waiting, we show a soft
 * "New version available" banner. The user decides when to refresh.
 *
 * This prevents infinite reload loops caused by the old autoUpdate approach
 * where controllerchange → window.location.reload() could cycle indefinitely.
 */
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SwUpdateManager() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const checkForWaiting = async () => {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (!reg) return;

        // Already a waiting worker when we mount
        if (reg.waiting) {
          setWaitingWorker(reg.waiting);
        }

        // A new SW finishes installing and enters "waiting" state
        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              // New version ready — prompt user, don't auto-reload
              setWaitingWorker(newWorker);
            }
          });
        });
      } catch {
        // SW not available — app still loads normally
      }
    };

    void checkForWaiting();

    // Trigger SW update check on mount
    navigator.serviceWorker.getRegistration().then((reg) => {
      reg?.update().catch(() => undefined);
    });
  }, []);

  const handleRefresh = () => {
    if (!waitingWorker) return;
    // Tell the waiting SW to take control
    waitingWorker.postMessage({ type: "SKIP_WAITING" });
    // Listen for controller change then reload ONCE
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      window.location.reload();
    }, { once: true });
    setWaitingWorker(null);
  };

  const handleDismiss = () => {
    setWaitingWorker(null);
  };

  return (
    <AnimatePresence>
      {waitingWorker && (
        <motion.div
          key="sw-update-banner"
          initial={{ opacity: 0, y: -48 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -48 }}
          transition={{ type: "spring", stiffness: 340, damping: 28 }}
          className="fixed top-0 left-0 right-0 z-[9997] flex items-center justify-between gap-3
                     px-4 py-2.5 bg-primary text-primary-foreground shadow-lg"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="shrink-0 h-6 w-6 rounded-full bg-primary-foreground/15 flex items-center justify-center">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <p className="text-[13px] font-medium leading-snug truncate">
              New version available — tap Refresh to update
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              size="sm"
              variant="secondary"
              className="h-7 px-3 text-xs font-semibold gap-1.5 bg-primary-foreground/15 hover:bg-primary-foreground/25 text-primary-foreground border-0"
              onClick={handleRefresh}
            >
              <RefreshCw className="h-3 w-3" />
              Refresh
            </Button>
            <button
              type="button"
              onClick={handleDismiss}
              className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-primary-foreground/15 transition-colors"
              aria-label="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
