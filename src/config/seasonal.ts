/**
 * SEASONAL CAMPAIGN CONFIG
 *
 * Single source of truth for temporary, visual-only seasonal layers.
 * No business logic depends on this — purely presentational.
 */

export const INDEPENDENCE_DAY_MODE = true;
export const INDEPENDENCE_DAY_START = "2026-08-13";
export const INDEPENDENCE_DAY_END = "2026-08-17";

/** Global CSS hook: <html data-season="independence"> while the campaign runs */
export const SEASON_ATTRIBUTE = "data-season";
export const SEASON_ID = "independence";


/** Session key so the launch screen shows once per browser session */
const LAUNCH_SEEN_KEY = "cc_independence_launch_seen_2026";

/** Inclusive date-window check (local time, date-only comparison) */
export function isIndependenceDayActive(now: Date = new Date()): boolean {
  if (!INDEPENDENCE_DAY_MODE) return false;
  const day = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")}`;
  return day >= INDEPENDENCE_DAY_START && day <= INDEPENDENCE_DAY_END;
}

/** True only on 15 August itself */
export function isIndependenceDayItself(now: Date = new Date()): boolean {
  return isIndependenceDayActive(now) && now.getMonth() === 7 && now.getDate() === 15;
}

export function hasSeenIndependenceLaunch(): boolean {
  try {
    return sessionStorage.getItem(LAUNCH_SEEN_KEY) === "1";
  } catch {
    return true;
  }
}

export function markIndependenceLaunchSeen(): void {
  try {
    sessionStorage.setItem(LAUNCH_SEEN_KEY, "1");
  } catch {
    /* no-op */
  }
}

/** Tricolour tokens — used only for the seasonal layer */
export const TRICOLOUR = {
  saffron: "#FF9933",
  white: "#FFFFFF",
  green: "#138808",
  chakra: "#0B2A6F",
  gold: "#D4A537",
} as const;
