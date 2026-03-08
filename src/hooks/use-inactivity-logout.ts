/**
 * useInactivityLogout
 * Automatically signs the user out after a configurable idle period.
 * Shows a 60-second countdown warning before logging out.
 *
 * Usage: mount once inside an authenticated layout.
 */
import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ── Config ────────────────────────────────────────────────────────────────
const IDLE_TIMEOUT_MS   = 30 * 60 * 1000;  // 30 min idle → warn
const WARN_DURATION_MS  = 60 * 1000;         // 60 s warning period
const ACTIVITY_EVENTS   = [
  "mousedown", "mousemove", "keydown",
  "scroll", "touchstart", "pointerdown", "click",
] as const;

// ── Hook ──────────────────────────────────────────────────────────────────
export function useInactivityLogout(enabled = true) {
  const idleTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warnTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastIdRef   = useRef<string | number | null>(null);

  const clearTimers = useCallback(() => {
    if (idleTimer.current)  { clearTimeout(idleTimer.current);  idleTimer.current  = null; }
    if (warnTimer.current)  { clearTimeout(warnTimer.current);  warnTimer.current  = null; }
    if (toastIdRef.current !== null) { toast.dismiss(toastIdRef.current); toastIdRef.current = null; }
  }, []);

  const doLogout = useCallback(async () => {
    clearTimers();
    toast.error("Session expired", { description: "You were signed out due to inactivity." });
    await supabase.auth.signOut();
  }, [clearTimers]);

  const resetTimer = useCallback(() => {
    clearTimers();
    // After IDLE_TIMEOUT_MS → show warning
    idleTimer.current = setTimeout(() => {
      let remaining = Math.ceil(WARN_DURATION_MS / 1000);

      toastIdRef.current = toast.warning(
        `Session expiring in ${remaining}s`,
        {
          description: "Move your mouse or press a key to stay logged in.",
          duration: WARN_DURATION_MS,
          id: "inactivity-warn",
          action: {
            label: "Stay logged in",
            onClick: resetTimer,
          },
        }
      );

      // Update countdown every second
      const tick = setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) { clearInterval(tick); return; }
        toast.warning(`Session expiring in ${remaining}s`, {
          id: "inactivity-warn",
          description: "Move your mouse or press a key to stay logged in.",
          duration: WARN_DURATION_MS,
          action: { label: "Stay logged in", onClick: resetTimer },
        });
      }, 1000);

      // After the warning period, log out
      warnTimer.current = setTimeout(() => {
        clearInterval(tick);
        doLogout();
      }, WARN_DURATION_MS);
    }, IDLE_TIMEOUT_MS);
  }, [clearTimers, doLogout]);

  useEffect(() => {
    if (!enabled) return;

    resetTimer();

    const handleActivity = () => resetTimer();
    ACTIVITY_EVENTS.forEach(e => window.addEventListener(e, handleActivity, { passive: true }));

    return () => {
      clearTimers();
      ACTIVITY_EVENTS.forEach(e => window.removeEventListener(e, handleActivity));
    };
  }, [enabled, resetTimer, clearTimers]);
}
