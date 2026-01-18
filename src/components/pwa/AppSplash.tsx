import { useEffect, useState } from "react";

/**
 * Lightweight cross-platform splash overlay.
 * - Android PWA launch uses manifest + icon.
 * - iOS doesn't reliably honor manifest splash images, so this ensures a consistent splash.
 */
export default function AppSplash() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    let timeout: number | undefined;

    const hide = () => {
      timeout = window.setTimeout(() => setVisible(false), 450);
    };

    // If the page is already loaded, hide quickly.
    if (document.readyState === "complete") {
      hide();
      return () => {
        if (timeout) window.clearTimeout(timeout);
      };
    }

    window.addEventListener("load", hide, { once: true });
    // Safety fallback
    timeout = window.setTimeout(() => setVisible(false), 1600);

    return () => {
      window.removeEventListener("load", hide);
      if (timeout) window.clearTimeout(timeout);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-label="Loading"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-background"
    >
      <div className="flex flex-col items-center gap-4">
        <img
          src="/pwa-512.png"
          width={88}
          height={88}
          alt="Campus Connect"
          className="rounded-2xl shadow-lg"
          loading="eager"
          decoding="sync"
        />
        <div className="text-center">
          <div className="text-lg font-semibold tracking-tight">Campus Connect</div>
          <div className="text-sm text-muted-foreground">Preparing your dashboard…</div>
        </div>
      </div>
    </div>
  );
}
