import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/providers/AuthProvider";
import { useTenant } from "@/providers/TenantProvider";
import { usePlatformBranding } from "@/hooks/use-platform-branding";
import { BRANDING } from "@/config/branding";
import { APP_VERSION } from "@/config/version";
import { Loader2 } from "@/components/icons";

/**
 * Fresh Branded Campus Connect Splash Screen.
 *
 * App opens → Splash appears → Real auth/session initialization → Splash smoothly resolves.
 * - Branded Campus Connect logo & typography.
 * - Deep midnight/navy background with subtle electric blue/cyan radial depth.
 * - Hierarchy: Logo -> CAMPUS CONNECT -> BKBNC.
 * - Driven strictly by REAL initialization state with a sensible minimum display time
 *   (400ms) to avoid jarring flashes, plus an 8s safety timeout.
 * - Zero dependency on any third-party or obsolete branding.
 */
export default function AppSplash() {
  const { isLoading: authLoading, user } = useAuth();
  const { isLoading: tenantLoading } = useTenant();
  const { branding } = usePlatformBranding();
  const [hasInitialized, setHasInitialized] = useState(false);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  // App is bootstrapping while auth session is resolving, or (if user present) tenant/role is resolving
  const isInitializing = authLoading || (Boolean(user) && tenantLoading);

  useEffect(() => {
    if (!isInitializing) {
      setHasInitialized(true);
    }
  }, [isInitializing]);

  // Minimum visual display time to prevent an unpleasant instant flash on fast cache hits
  useEffect(() => {
    const minTimer = window.setTimeout(() => {
      setMinTimeElapsed(true);
    }, 400);
    return () => clearTimeout(minTimer);
  }, []);

  // Safety fallback: Never trap the user indefinitely if network or auth stalls
  useEffect(() => {
    const safetyTimer = window.setTimeout(() => {
      setTimedOut(true);
    }, 8000);
    return () => clearTimeout(safetyTimer);
  }, []);

  // Splash resolves when initialization is complete AND minimum time has elapsed, or on safety timeout
  const isVisible = (!hasInitialized || !minTimeElapsed) && !timedOut;

  const logoSrc = branding.logo_url ?? BRANDING.logo;
  const brandName = branding.brand_name ?? BRANDING.name;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="canonical-app-splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 0.99 }}
          transition={{ duration: 0.32, ease: "easeInOut" }}
          role="status"
          aria-label="Loading Campus Connect"
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#080D18] select-none pointer-events-auto overflow-hidden"
        >
          {/* Subtle electric blue / cyan radial glow */}
          <div
            className="absolute inset-0 pointer-events-none opacity-80"
            style={{
              background:
                "radial-gradient(circle at 50% 46%, rgba(75, 111, 251, 0.16) 0%, rgba(6, 182, 212, 0.06) 42%, transparent 72%)",
            }}
          />

          {/* Centered Brand Column */}
          <div className="relative z-10 flex flex-col items-center px-4 text-center">
            {/* Campus Connect Logo Mark */}
            <motion.div
              initial={{ scale: 0.88, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="relative flex items-center justify-center p-3.5 rounded-3xl bg-white/[0.04] border border-white/10 shadow-[0_0_40px_-10px_rgba(75,111,251,0.4)] backdrop-blur-md"
            >
              <img
                src={logoSrc}
                width={80}
                height={80}
                alt={`${brandName} logo`}
                className="rounded-2xl object-contain"
                loading="eager"
                decoding="sync"
              />
            </motion.div>

            {/* Campus Connect Primary Brand Hierarchy */}
            <motion.div
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.28, ease: "easeOut" }}
              className="mt-5 space-y-1"
            >
              <h1 className="text-xl sm:text-2xl font-black uppercase tracking-[0.22em] text-white">
                {brandName}
              </h1>
              <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-cyan-400/90">
                BKBNC
              </p>
            </motion.div>

            {/* Subtle loading subtitle and indicator */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.25 }}
              className="mt-6 flex flex-col items-center gap-3"
            >
              <p className="text-xs text-slate-400 font-medium tracking-wide">
                Loading your campus experience...
              </p>
              <div className="w-28 h-1 bg-slate-800/80 rounded-full overflow-hidden relative border border-white/5">
                <motion.div
                  className="h-full w-14 bg-gradient-to-r from-[#315BEA] via-[#4B6FFB] to-[#06B6D4] rounded-full"
                  animate={{ x: ["-100%", "250%"] }}
                  transition={{
                    repeat: Infinity,
                    duration: 1.4,
                    ease: "easeInOut",
                  }}
                />
              </div>
              <div className="sr-only">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
              </div>
            </motion.div>
          </div>

          {/* Version badge */}
          <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[11px] text-slate-500 font-mono tracking-wider">
            Version {APP_VERSION}
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
