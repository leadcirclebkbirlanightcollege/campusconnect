/**
 * PERFORMANCE ENGINE — Query & rendering optimization utilities
 */

/** Standard stale times by data volatility */
export const STALE_TIME = {
  profile: 5 * 60_000,
  leaderboard: 60_000,
  attendance: 45_000,
  notifications: 30_000,
  live: 10_000,
  static: 15 * 60_000,
} as const;

/** GC times (how long unused queries stay in cache) */
export const GC_TIME = {
  short: 2 * 60_000,
  medium: 5 * 60_000,
  long: 15 * 60_000,
} as const;

/** Refetch intervals for real-time-like data */
export const REFETCH_INTERVAL = {
  live: 15_000,
  notifications: 60_000,
  stats: 2 * 60_000,
} as const;

export const SLOW_REQUEST_THRESHOLD_MS = 800;

export function queryOpts(
  opts: {
    staleTime?: number;
    gcTime?: number;
    refetchInterval?: number | false;
    retry?: number | false;
  } = {},
) {
  return {
    staleTime: opts.staleTime ?? STALE_TIME.attendance,
    gcTime: opts.gcTime ?? GC_TIME.medium,
    refetchInterval: opts.refetchInterval ?? false,
    retry: opts.retry ?? 1,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  };
}

/**
 * Global API timing logger (best effort).
 * Logs slow backend requests (> 800ms) for optimization.
 */
export function setupSlowRequestLogger() {
  if (typeof window === "undefined") return () => undefined;

  const KEY = "__cc_fetch_monkey_patch__";
  const globalWithPatch = window as typeof window & { [KEY]?: boolean };
  if (globalWithPatch[KEY]) return () => undefined;

  globalWithPatch[KEY] = true;
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (...args) => {
    const startedAt = performance.now();
    const requestUrl = typeof args[0] === "string" ? args[0] : args[0] instanceof Request ? args[0].url : "";

    try {
      const response = await originalFetch(...args);
      const durationMs = Math.round(performance.now() - startedAt);
      if (
        durationMs > SLOW_REQUEST_THRESHOLD_MS &&
        (requestUrl.includes("/rest/v1/") || requestUrl.includes("/functions/v1/") || requestUrl.includes("supabase"))
      ) {
        console.warn("[perf][slow-api]", { durationMs, status: response.status, path: requestUrl });
      }
      return response;
    } catch (error) {
      const durationMs = Math.round(performance.now() - startedAt);
      if (durationMs > SLOW_REQUEST_THRESHOLD_MS) {
        console.warn("[perf][slow-api-error]", { durationMs, path: requestUrl });
      }
      throw error;
    }
  };

  return () => {
    window.fetch = originalFetch;
    globalWithPatch[KEY] = false;
  };
}

