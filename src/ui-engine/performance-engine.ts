/**
 * PERFORMANCE ENGINE — Query & rendering optimization utilities
 *
 * Targets:
 *   - Page load < 1.2s
 *   - React Query stale-while-revalidate
 *   - Prevent unnecessary re-renders
 */

/** Standard stale times by data volatility */
export const STALE_TIME = {
  /** User profile — slow-changing */
  profile: 5 * 60_000,
  /** Leaderboard / rankings — refresh every 2 min */
  leaderboard: 2 * 60_000,
  /** Notifications — refresh every 30s */
  notifications: 30_000,
  /** Live lecture status — frequent polling */
  live: 10_000,
  /** Static content (branding, programmes) */
  static: 15 * 60_000,
} as const;

/** GC times (how long unused queries stay in cache) */
export const GC_TIME = {
  short:  2 * 60_000,
  medium: 5 * 60_000,
  long:   15 * 60_000,
} as const;

/** Refetch intervals for real-time-like data */
export const REFETCH_INTERVAL = {
  live:          15_000,
  notifications: 60_000,
  stats:         2 * 60_000,
} as const;

/**
 * Standard query options factory — apply consistently to reduce config duplication
 */
export function queryOpts<T>(
  opts: {
    staleTime?: number;
    gcTime?: number;
    refetchInterval?: number | false;
    retry?: number | false;
  } = {}
) {
  return {
    staleTime:       opts.staleTime       ?? STALE_TIME.profile,
    gcTime:          opts.gcTime          ?? GC_TIME.medium,
    refetchInterval: opts.refetchInterval ?? false,
    retry:           opts.retry           ?? 1,
    refetchOnWindowFocus: false,
  };
}
