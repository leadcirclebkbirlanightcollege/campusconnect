/**
 * useRateLimit
 * Client-side rate-limiter to prevent rapid repeated submissions
 * (attendance, daily check-in, notification triggers, etc.)
 *
 * Usage:
 *   const { attempt, remaining, blocked } = useRateLimit("daily-checkin", 3, 60_000);
 *   if (!attempt()) return; // blocked → shows toast, returns false
 */
import { useRef, useState, useCallback } from "react";
import { toast } from "sonner";

interface UsRateLimitResult {
  /** Call before the action. Returns false if rate-limited. */
  attempt: () => boolean;
  /** Number of remaining attempts in the current window. */
  remaining: number;
  /** Whether the user is currently blocked. */
  blocked: boolean;
  /** Reset the rate-limiter manually. */
  reset: () => void;
}

export function useRateLimit(
  /** Unique key (e.g. "daily-checkin", "mark-attendance") */
  key: string,
  /** Max attempts allowed in the window. Default 5. */
  maxAttempts = 5,
  /** Rolling window in ms. Default 60 000 (1 min). */
  windowMs = 60_000,
): UsRateLimitResult {
  const timestamps = useRef<number[]>([]);
  const [remaining, setRemaining] = useState(maxAttempts);
  const [blocked, setBlocked]     = useState(false);

  const prune = useCallback(() => {
    const now = Date.now();
    timestamps.current = timestamps.current.filter(t => now - t < windowMs);
  }, [windowMs]);

  const attempt = useCallback((): boolean => {
    prune();
    const count = timestamps.current.length;

    if (count >= maxAttempts) {
      const oldest    = timestamps.current[0];
      const resetInMs = windowMs - (Date.now() - oldest);
      const resetInS  = Math.ceil(resetInMs / 1000);

      setBlocked(true);
      setRemaining(0);
      toast.error("Too many attempts", {
        description: `Please wait ${resetInS}s before trying again (${key}).`,
        id: `rate-limit-${key}`,
      });
      return false;
    }

    timestamps.current.push(Date.now());
    const next = maxAttempts - timestamps.current.length;
    setRemaining(next);
    setBlocked(false);
    return true;
  }, [key, maxAttempts, windowMs, prune]);

  const reset = useCallback(() => {
    timestamps.current = [];
    setRemaining(maxAttempts);
    setBlocked(false);
  }, [maxAttempts]);

  return { attempt, remaining, blocked, reset };
}
