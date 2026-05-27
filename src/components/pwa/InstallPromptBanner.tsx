import { motion, AnimatePresence } from "framer-motion";
import { Download, X, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { usePlatformBranding } from "@/hooks/use-platform-branding";

/**
 * Sticky bottom install banner.
 * Appears only when:
 *  • browser fires beforeinstallprompt (Chrome/Edge Android + Desktop)
 *  • user hasn't dismissed it before
 *  • app is NOT already installed
 */
export default function InstallPromptBanner() {
  const { installState, dismissed, triggerInstall, dismiss } = usePwaInstall();
  const { branding } = usePlatformBranding();

  const visible = installState === "installable" && !dismissed;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="install-banner"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
          className="fixed left-3 right-3 z-[9990] md:left-auto md:right-6 md:w-[360px]"
          style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 88px)" }}
        >
          <div className="rounded-2xl border border-border/60 bg-surface-1 shadow-2xl overflow-hidden">
            {/* accent bar */}
            <div className="h-[3px] bg-gradient-to-r from-primary to-primary/40" />
            <div className="p-4 flex items-start gap-3">
              <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Smartphone className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-foreground leading-snug">
                  Install {branding.brand_name}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                  Add to your home screen for the fastest campus experience.
                </p>
                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    className="h-8 text-[12px] gap-1.5 px-3"
                    onClick={triggerInstall}
                  >
                    <Download className="h-3.5 w-3.5" />
                    Install App
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 text-[12px] px-3 text-muted-foreground"
                    onClick={dismiss}
                  >
                    Not now
                  </Button>
                </div>
              </div>
              <button
                onClick={dismiss}
                className="ml-1 -mt-0.5 rounded-md border border-border-subtle bg-action-secondary p-1 text-action-secondary-foreground hover:bg-action-secondary-hover transition-colors"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
