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
export const SLOW_AUTH_THRESHOLD_MS = 2000;

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
 * Logs slow backend requests (> 800ms for data queries, > 2000ms for auth verification) for optimization.
 */
export function setupSlowRequestLogger() {
  if (typeof window === "undefined" || !window.fetch) return () => undefined;

  const KEY = "__cc_fetch_monkey_patch__";
  const globalWithPatch = window as typeof window & { [KEY]?: boolean };
  if (globalWithPatch[KEY]) return () => undefined;

  // Track logged warnings to avoid spamming the console for repeated calls
  const loggedAuthEndpoints = new Set<string>();

  try {
    const originalFetch = window.fetch.bind(window);

    const patchedFetch = async (...args: Parameters<typeof fetch>) => {
      const startedAt = performance.now();
      const requestUrl = typeof args[0] === "string" ? args[0] : args[0] instanceof Request ? args[0].url : "";
      const isAuthRequest = requestUrl.includes("/auth/v1/");
      const isDataRequest = requestUrl.includes("/rest/v1/") || requestUrl.includes("/functions/v1/");

      try {
        const response = await originalFetch(...args);
        const durationMs = Math.round(performance.now() - startedAt);

        if (isAuthRequest) {
          // Supabase Auth token cryptographic verification routinely takes 800-1200ms.
          // Only warn if duration exceeds SLOW_AUTH_THRESHOLD_MS (2000ms), and avoid repeating the warning.
          if (durationMs > SLOW_AUTH_THRESHOLD_MS) {
            const endpointKey = `${response.status}:${requestUrl.split("?")[0]}`;
            if (!loggedAuthEndpoints.has(endpointKey)) {
              loggedAuthEndpoints.add(endpointKey);
              console.warn("[perf][slow-auth]", { durationMs, status: response.status, path: requestUrl });
            }
          }
        } else if (isDataRequest || requestUrl.includes("supabase")) {
          // Strict 800ms threshold for REST tables and Edge Functions
          if (durationMs > SLOW_REQUEST_THRESHOLD_MS) {
            console.warn("[perf][slow-api]", { durationMs, status: response.status, path: requestUrl });
          }
        }

        return response;
      } catch (error) {
        const durationMs = Math.round(performance.now() - startedAt);
        const threshold = isAuthRequest ? SLOW_AUTH_THRESHOLD_MS : SLOW_REQUEST_THRESHOLD_MS;
        if (durationMs > threshold || !isAuthRequest) {
          console.warn("[perf][slow-api-error]", { durationMs, path: requestUrl });
        }
        throw error;
      }
    };

    // Use Object.defineProperty to support environments where direct assignment is forbidden
    Object.defineProperty(window, "fetch", {
      value: patchedFetch,
      writable: true,
      configurable: true,
    });
    globalWithPatch[KEY] = true;

    return () => {
      try {
        Object.defineProperty(window, "fetch", {
          value: originalFetch,
          writable: true,
          configurable: true,
        });
      } catch {
        // no-op if restore fails
      }
      globalWithPatch[KEY] = false;
    };
  } catch {
    // If window.fetch cannot be redefined in this environment (e.g. strict getter-only), gracefully noop
    return () => undefined;
  }
}

