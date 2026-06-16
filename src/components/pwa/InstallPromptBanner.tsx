import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X, Smartphone, Share, Plus, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { usePlatformBranding } from "@/hooks/use-platform-branding";

/**
 * Sticky bottom install banner.
 * Shows on ANY mobile device when the app is not installed.
 *  • Chrome/Edge Android: triggers native prompt via beforeinstallprompt.
 *  • iOS Safari / browsers without prompt API: shows manual Add-to-Home-Screen steps.
 */
export default function InstallPromptBanner() {
  const {
    installState,
    dismissed,
    triggerInstall,
    dismiss,
    canPrompt,
    isIOS,
    isMobile,
  } = usePwaInstall();
  const { branding } = usePlatformBranding();
  const [showHowTo, setShowHowTo] = useState(false);

  // Force on mobile when not installed and not dismissed (within 24h)
  const visible = isMobile && installState !== "installed" && !dismissed;

  const handleInstall = () => {
    if (canPrompt) {
      triggerInstall();
    } else {
      // Manual instructions (iOS / unsupported)
      setShowHowTo(true);
    }
  };

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
          <div className="card-premium rounded-2xl border border-border/60 bg-surface-1 shadow-2xl overflow-hidden">
            <div className="h-[3px] bg-gradient-to-r from-primary via-primary/70 to-primary/30" />
            <div className="p-4 flex items-start gap-3">
              <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Smartphone className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-foreground leading-snug">
                  Install {branding.brand_name}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                  {isIOS
                    ? "Add to your Home Screen for the full app experience."
                    : "Add to your home screen for the fastest campus experience."}
                </p>

                {showHowTo && !canPrompt && (
                  <div className="mt-3 rounded-lg border border-border-subtle bg-surface-2/60 p-3 text-[11px] text-muted-foreground space-y-2">
                    {isIOS ? (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">1.</span>
                          <Share className="h-3.5 w-3.5 text-primary" />
                          <span>Tap the Share button in Safari</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">2.</span>
                          <Plus className="h-3.5 w-3.5 text-primary" />
                          <span>Choose "Add to Home Screen"</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">3.</span>
                          <span>Tap "Add" to install</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">1.</span>
                          <MoreVertical className="h-3.5 w-3.5 text-primary" />
                          <span>Open browser menu</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">2.</span>
                          <span>Tap "Install app" or "Add to Home Screen"</span>
                        </div>
                      </>
                    )}
                  </div>
                )}

                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    className="h-8 text-[12px] gap-1.5 px-3"
                    onClick={handleInstall}
                  >
                    <Download className="h-3.5 w-3.5" />
                    {canPrompt ? "Install App" : isIOS ? "How to install" : "Show steps"}
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
