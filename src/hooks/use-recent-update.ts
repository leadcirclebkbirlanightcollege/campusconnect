import { useCallback, useEffect, useState } from "react";

type Options = {
  /** How long the indicator should stay visible after an update. */
  ttlMs?: number;
};

/**
 * Small helper for showing a brief "Last updated just now" UI after a realtime refresh.
 */
export function useRecentUpdate(options: Options = {}) {
  const ttlMs = options.ttlMs ?? 3500;
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);

  const markUpdated = useCallback(() => {
    setLastUpdatedAt(Date.now());
  }, []);

  const justUpdated = lastUpdatedAt !== null && Date.now() - lastUpdatedAt < ttlMs;

  useEffect(() => {
    if (!justUpdated) return;
    const t = window.setTimeout(() => {
      // Let it naturally disappear once TTL has passed.
      setLastUpdatedAt((prev) => prev);
    }, ttlMs);
    return () => window.clearTimeout(t);
  }, [justUpdated, ttlMs]);

  return { justUpdated, markUpdated };
}
