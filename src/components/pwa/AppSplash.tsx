import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/providers/AuthProvider";
import { useTenant } from "@/providers/TenantProvider";
import { usePlatformBranding } from "@/hooks/use-platform-branding";
import { BRANDING } from "@/config/branding";
import { APP_VERSION } from "@/config/version";
import { Loader2 } from "@/components/icons";

/**
 * Canonical Campus Connect Splash Screen.
 *
 * App opens → Splash appears → Real auth/session initialization → Splash smoothly resolves.
 * - Branded Campus Connect logo & typography.
 * - Driven strictly by REAL initialization state (no fake timeouts).
 * - Safety cap to ensure users are never trapped if network or auth service fails.
 * - Canonical: Single initial splash across all routes (student, admin, faculty, unauthenticated).
 */
export default function AppSplash() {
  const { isLoading: authLoading, user } = useAuth();
  const { isLoading: tenantLoading } = useTenant();
  const { branding } = usePlatformBranding();
  const [hasInitialized, setHasInitialized] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  // App is bootstrapping while auth session is resolving, or (if user present) tenant/role is resolving
  const isInitializing = authLoading || (Boolean(user) && tenantLoading);

  useEffect(() => {
    if (!isInitializing) {
      setHasInitialized(true);
    }
  }, [isInitializing]);

  // Safety fallback: Never trap the user indefinitely if network or auth stalls
  useEffect(() => {
    const safetyTimer = window.setTimeout(() => {
      setTimedOut(true);
    }, 8000);
    return () => clearTimeout(safetyTimer);
  }, []);

  const isVisible = !hasInitialized && !timedOut;

  const logoSrc = branding.logo_url ?? BRANDING.logo;
  const name = branding.brand_name ?? BRANDING.name;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="canonical-app-splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28, ease: "easeInOut" }}
          role="status"
          aria-label="Loading Campus Connect"
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background select-none pointer-events-auto"
        >
          {/* Centered Campus Connect Logo */}
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="relative flex items-center justify-center"
          >
            <img
              src={logoSrc}
              width={76}
              height={76}
              alt={`${name} logo`}
              className="rounded-2xl shadow-lg border border-border/40 object-contain"
              loading="eager"
              decoding="sync"
            />
          </motion.div>

          {/* Campus Connect Brand Name & Message */}
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.12, duration: 0.28, ease: "easeOut" }}
            className="mt-4 text-center px-4"
          >
            <h1 className="text-xl font-bold tracking-tight text-foreground">{name}</h1>
            <p className="text-xs text-muted-foreground mt-1.5 font-medium tracking-wide">
              Loading your campus experience...
            </p>
          </motion.div>

          {/* Subtle loading indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.25 }}
            className="mt-6 flex items-center justify-center"
          >
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </motion.div>

          {/* Version badge */}
          <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[11px] text-muted-foreground/60 font-mono tracking-wider">
            Version {APP_VERSION}
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
