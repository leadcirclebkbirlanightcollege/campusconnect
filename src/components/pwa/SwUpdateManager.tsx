import { useEffect, useState } from "react";
import { registerSW } from "virtual:pwa-register";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

/**
 * Service-worker update manager.
 *
 * • Registers the SW in prompt mode (never auto-reloads).
 * • Shows a branded bottom sheet when a new version is detected.
 * • Guards against reload loops via sessionStorage counter.
 * • User can dismiss (later) or confirm (update now).
 */
export default function SwUpdateManager() {
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const [updateSW, setUpdateSW] = useState<((reload?: boolean) => Promise<void>) | null>(null);

  useEffect(() => {
    // ── Reload-loop guard ────────────────────────────────────────
    const RELOAD_KEY = "cc_reload_count";
    const RELOAD_TS_KEY = "cc_reload_ts";
    const now = Date.now();
    const count = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0);
    const ts = Number(sessionStorage.getItem(RELOAD_TS_KEY) ?? 0);

    if (now - ts < 10_000) {
      if (count >= 3) {
        if ("serviceWorker" in navigator) {
          navigator.serviceWorker.getRegistrations().then((regs) =>
            regs.forEach((r) => r.unregister())
          );
        }
        toast.error("App stability issue detected", {
          description: "Service worker disabled. Clear cache and refresh.",
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

    // ── SW registration ──────────────────────────────────────────
    const fn = registerSW({
      immediate: false,
      onNeedRefresh() {
        setNeedsRefresh(true);
        setUpdateSW(() => fn);
      },
      onOfflineReady() {
        toast.success("App ready for offline use", {
          description: "Campus Connect is now cached on your device.",
          duration: 3000,
        });
      },
    });
  }, []);

  const handleUpdate = async () => {
    setNeedsRefresh(false);
    if (updateSW) await updateSW(true);
  };

  const handleDismiss = () => setNeedsRefresh(false);

  return (
    <AnimatePresence>
      {needsRefresh && (
        <motion.div
          key="sw-update"
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ type: "spring", stiffness: 360, damping: 30 }}
          className="fixed bottom-0 left-0 right-0 z-[9995] md:bottom-6 md:left-auto md:right-6 md:w-[380px]"
        >
          <div className="m-3 md:m-0 rounded-2xl border border-border/60 bg-surface-1 shadow-2xl overflow-hidden">
            <div className="h-[3px] bg-gradient-to-r from-primary to-primary/30" />
            <div className="p-5">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <RefreshCw className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-[14px] font-semibold text-foreground">New update available</p>
                  <p className="text-[12px] text-muted-foreground mt-0.5 leading-relaxed">
                    A new version of Campus Connect is ready. Update now for the latest features.
                  </p>
                </div>
                <button
                  onClick={handleDismiss}
                  className="text-muted-foreground/50 hover:text-muted-foreground transition-colors ml-1 -mt-0.5"
                  aria-label="Dismiss update"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex gap-2 mt-4">
                <Button
                  size="sm"
                  className="flex-1 h-9 text-[13px] gap-2"
                  onClick={handleUpdate}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Update Now
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-9 px-4 text-[13px] text-muted-foreground"
                  onClick={handleDismiss}
                >
                  Later
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
