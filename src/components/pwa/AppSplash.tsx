import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePlatformBranding } from "@/hooks/use-platform-branding";
import { BRANDING } from "@/config/branding";

/**
 * Branded PWA splash screen.
 * - Reads platform branding (name, tagline, logo).
 * - Animates logo → name → tagline → progress bar.
 * - Hides once the page loads (≤1.8 s safety cap).
 */
export default function AppSplash() {
  const [visible, setVisible] = useState(true);
  const [progress, setProgress] = useState(0);
  const { branding } = usePlatformBranding();

  // Fake progress bar: 0 → 85% quickly, 85 → 100 when page ready
  useEffect(() => {
    let raf: number;
    let start: number | null = null;
    const duration = 900;

    const tick = (ts: number) => {
      if (!start) start = ts;
      const elapsed = ts - start;
      const p = Math.min(85, (elapsed / duration) * 85);
      setProgress(p);
      if (p < 85) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    let timeout: number;

    const hide = () => {
      setProgress(100);
      timeout = window.setTimeout(() => setVisible(false), 320);
    };

    if (document.readyState === "complete") {
      hide();
    } else {
      window.addEventListener("load", hide, { once: true });
      // Safety cap: 1.8 s
      timeout = window.setTimeout(hide, 1800);
    }

    return () => {
      window.removeEventListener("load", hide);
      clearTimeout(timeout);
    };
  }, []);

  const logoSrc = branding.logo_url ?? BRANDING.logo;
  const name = branding.brand_name ?? BRANDING.name;
  const tagline = branding.tagline ?? BRANDING.tagline;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28 }}
          role="status"
          aria-label="Loading"
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background"
        >
          {/* Logo */}
          <motion.div
            initial={{ scale: 0.72, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
          >
            <img
              src={logoSrc}
              width={88}
              height={88}
              alt={name}
              className="rounded-[22px] shadow-xl"
              loading="eager"
              decoding="sync"
            />
          </motion.div>

          {/* Name + tagline */}
          <motion.div
            initial={{ y: 14, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.22, duration: 0.32, ease: "easeOut" }}
            className="mt-5 text-center"
          >
            <p className="text-[18px] font-bold tracking-tight text-foreground">{name}</p>
            <p className="text-[12px] text-muted-foreground mt-1">{tagline}</p>
          </motion.div>

          {/* Progress bar */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="absolute bottom-12 left-1/2 -translate-x-1/2 w-36 h-[3px] rounded-full bg-border overflow-hidden"
          >
            <motion.div
              className="h-full bg-primary rounded-full"
              animate={{ width: `${progress}%` }}
              transition={{ ease: "easeOut", duration: 0.18 }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
