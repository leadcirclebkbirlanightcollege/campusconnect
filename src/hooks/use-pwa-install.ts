import { useEffect, useState, useCallback } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type InstallState = "unsupported" | "installable" | "installed";

export function usePwaInstall() {
  const [installState, setInstallState] = useState<InstallState>("unsupported");
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(() =>
    localStorage.getItem("pwa_install_dismissed") === "true"
  );

  useEffect(() => {
    // Already installed (standalone or fullscreen)
    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as any).standalone === true
    ) {
      setInstallState("installed");
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setInstallState("installable");
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Also detect if already installed via appinstalled
    window.addEventListener("appinstalled", () => {
      setInstallState("installed");
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const triggerInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setInstallState("installed");
    }
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const dismiss = useCallback(() => {
    setDismissed(true);
    localStorage.setItem("pwa_install_dismissed", "true");
  }, []);

  const resetDismiss = useCallback(() => {
    setDismissed(false);
    localStorage.removeItem("pwa_install_dismissed");
  }, []);

  return { installState, dismissed, triggerInstall, dismiss, resetDismiss };
}
