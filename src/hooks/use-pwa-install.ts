import { useEffect, useState, useCallback } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type InstallState = "unsupported" | "installable" | "installed";

const DISMISS_KEY = "pwa_install_dismissed_at";
const DISMISS_TTL_MS = 24 * 60 * 60 * 1000; // 24h — re-prompt the next day

function isMobileUA() {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

function isIOSUA() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/i.test(ua) ||
    (ua.includes("Mac") && "ontouchend" in document);
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    (navigator as any).standalone === true
  );
}

function readDismissed(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const ts = parseInt(raw, 10);
    if (Number.isNaN(ts)) return false;
    return Date.now() - ts < DISMISS_TTL_MS;
  } catch {
    return false;
  }
}

export function usePwaInstall() {
  const [installState, setInstallState] = useState<InstallState>(() => {
    if (isStandalone()) return "installed";
    // On mobile we always treat as installable (iOS has no beforeinstallprompt).
    if (isMobileUA()) return "installable";
    return "unsupported";
  });
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(readDismissed);
  const isIOS = isIOSUA();
  const isMobile = isMobileUA();
  const canPrompt = !!deferredPrompt;

  useEffect(() => {
    if (isStandalone()) {
      setInstallState("installed");
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setInstallState("installable");
    };

    const installedHandler = () => {
      setInstallState("installed");
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", installedHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
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
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {}
  }, []);

  const resetDismiss = useCallback(() => {
    setDismissed(false);
    try {
      localStorage.removeItem(DISMISS_KEY);
      localStorage.removeItem("pwa_install_dismissed"); // legacy key
    } catch {}
  }, []);

  return {
    installState,
    dismissed,
    triggerInstall,
    dismiss,
    resetDismiss,
    canPrompt,
    isIOS,
    isMobile,
  };
}
