/**
 * CAMPUS CONNECT — FESTIVAL THEME RESOLVER
 * 
 * Centralized, dynamic festival resolver for Campus Connect.
 * 
 * EXACT FESTIVAL SCHEDULE (Asia/Kolkata / IST = UTC+05:30):
 * - 4 September 2026 (00:00:00 to 23:59:59 IST) => JANMASHTAMI
 * - 5 September 2026 (00:00:00 to 23:59:59 IST) => DAHI HANDI
 * - 6 September 2026 at 00:00:00 IST onwards     => NORMAL CAMPUS CONNECT THEME
 * 
 * AUTOMATIC TRANSITION & ZERO-REFRESH ROLLBACK:
 * - 2026-09-04 00:00:00 IST: Activates JANMASHTAMI
 * - 2026-09-05 00:00:00 IST: Transitions seamlessly to DAHI HANDI
 * - 2026-09-06 00:00:00 IST: Immediately returns to NORMAL Campus Connect
 */

export type FestivalThemeId = "normal" | "janmashtami" | "dahi_handi";
export type FestivalId = FestivalThemeId;

export type FestivalThemeCode = "NORMAL" | "JANMASHTAMI" | "DAHI_HANDI";

export interface FestivalConfig {
  id: FestivalThemeId;
  code: FestivalThemeCode;
  name: string;
  greeting: string;
  badgeLabel: string;
  tagline: string;
  dateStrIST: string;
  isFestive: boolean;
  accentColor: "primary" | "cyan" | "gold";
}

export const NORMAL_THEME_CONFIG: FestivalConfig = {
  id: "normal",
  code: "NORMAL",
  name: "Campus Connect",
  greeting: "",
  badgeLabel: "",
  tagline: "Academic Operating System",
  dateStrIST: "",
  isFestive: false,
  accentColor: "primary",
};

export const JANMASHTAMI_CONFIG: FestivalConfig = {
  id: "janmashtami",
  code: "JANMASHTAMI",
  name: "Janmashtami",
  greeting: "Happy Janmashtami",
  badgeLabel: "Janmashtami • Campus Connect",
  tagline: "Celebrating Janmashtami on Campus",
  dateStrIST: "2026-09-04",
  isFestive: true,
  accentColor: "cyan",
};

export const DAHI_HANDI_CONFIG: FestivalConfig = {
  id: "dahi_handi",
  code: "DAHI_HANDI",
  name: "Dahi Handi",
  greeting: "Happy Dahi Handi",
  badgeLabel: "Dahi Handi • Campus Connect",
  tagline: "Celebrating Dahi Handi on Campus",
  dateStrIST: "2026-09-05",
  isFestive: true,
  accentColor: "gold",
};

/**
 * Exact Unix Millisecond bounds in Asia/Kolkata (IST = UTC+05:30)
 * 
 * 1. Janmashtami Start:
 *    2026-09-04 00:00:00 IST = 2026-09-03 18:30:00.000 UTC = 1788460200000 ms
 * 
 * 2. Dahi Handi Start (Janmashtami End):
 *    2026-09-05 00:00:00 IST = 2026-09-04 18:30:00.000 UTC = 1788546600000 ms
 * 
 * 3. Festival End / Normal Rollback:
 *    2026-09-06 00:00:00 IST = 2026-09-05 18:30:00.000 UTC = 1788633000000 ms
 */
export const JANMASHTAMI_START_IST_MS = new Date("2026-09-04T00:00:00+05:30").getTime();
export const DAHI_HANDI_START_IST_MS = new Date("2026-09-05T00:00:00+05:30").getTime();
export const FESTIVAL_END_IST_MS = new Date("2026-09-06T00:00:00+05:30").getTime();

/**
 * Formats a given Date to YYYY-MM-DD in Asia/Kolkata timezone.
 */
export function getISTDateString(date: Date = new Date()): string {
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(date);
  } catch {
    // Fallback if Intl is unavailable: compute with +5.5 hours offset
    const utc = date.getTime() + date.getTimezoneOffset() * 60000;
    const ist = new Date(utc + 5.5 * 3600000);
    const y = ist.getFullYear();
    const m = String(ist.getMonth() + 1).padStart(2, "0");
    const d = String(ist.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
}

/**
 * Central pure resolver: returns active festival id based on IST date/time.
 * 
 * Guaranteed:
 * - 2026-09-04 00:00:00 to 23:59:59 IST => "janmashtami"
 * - 2026-09-05 00:00:00 to 23:59:59 IST => "dahi_handi"
 * - 2026-09-06 00:00:00 IST onwards     => "normal"
 * - Before 2026-09-04 00:00:00 IST      => "normal"
 */
export function getCampusTheme(targetDate: Date = new Date()): FestivalThemeId {
  // Check browser/testing preview overrides first (for QA / manual inspection)
  if (typeof window !== "undefined") {
    try {
      const params = new URLSearchParams(window.location.search);
      const queryTheme = (params.get("theme") || params.get("festival"))?.toLowerCase();
      if (queryTheme === "janmashtami") return "janmashtami";
      if (queryTheme === "dahi_handi" || queryTheme === "dahihandi" || queryTheme === "dahi-handi") return "dahi_handi";
      if (queryTheme === "normal") return "normal";

      const previewStorage = window.localStorage?.getItem("campus_festival_theme")?.toLowerCase();
      if (previewStorage === "janmashtami") return "janmashtami";
      if (previewStorage === "dahi_handi" || previewStorage === "dahihandi" || previewStorage === "dahi-handi") return "dahi_handi";
      if (previewStorage === "normal") return "normal";
    } catch {
      // Ignore storage errors in restricted contexts
    }
  }

  const timeMs = targetDate.getTime();

  // Strict millisecond range check for 4 September 2026 (Janmashtami)
  if (timeMs >= JANMASHTAMI_START_IST_MS && timeMs < DAHI_HANDI_START_IST_MS) {
    return "janmashtami";
  }

  // Strict millisecond range check for 5 September 2026 (Dahi Handi)
  if (timeMs >= DAHI_HANDI_START_IST_MS && timeMs < FESTIVAL_END_IST_MS) {
    return "dahi_handi";
  }

  // Cross-verification with Asia/Kolkata date string
  const istDateStr = getISTDateString(targetDate);
  if (istDateStr === "2026-09-04") {
    return "janmashtami";
  }
  if (istDateStr === "2026-09-05") {
    return "dahi_handi";
  }

  return "normal";
}

/**
 * Returns the theme code in uppercase (NORMAL | JANMASHTAMI | DAHI_HANDI).
 */
export function resolveFestivalTheme(targetDate: Date = new Date()): FestivalThemeCode {
  const theme = getCampusTheme(targetDate);
  if (theme === "janmashtami") return "JANMASHTAMI";
  if (theme === "dahi_handi") return "DAHI_HANDI";
  return "NORMAL";
}

/**
 * Returns the full configuration for the active theme.
 */
export function getCampusThemeConfig(targetDateOrTheme: Date | FestivalThemeId = new Date()): FestivalConfig {
  const theme = typeof targetDateOrTheme === "string" ? targetDateOrTheme : getCampusTheme(targetDateOrTheme);
  switch (theme) {
    case "janmashtami":
      return JANMASHTAMI_CONFIG;
    case "dahi_handi":
      return DAHI_HANDI_CONFIG;
    default:
      return NORMAL_THEME_CONFIG;
  }
}

/**
 * Calculates ms until the next scheduled theme transition (Sep 4, Sep 5, or Sep 6).
 * Used by the live timer to automatically switch without requiring a page refresh.
 */
export function getMsUntilNextTransition(now: Date = new Date()): number | null {
  const timeMs = now.getTime();
  if (timeMs < JANMASHTAMI_START_IST_MS) {
    return JANMASHTAMI_START_IST_MS - timeMs; // Delay until Janmashtami starts
  }
  if (timeMs < DAHI_HANDI_START_IST_MS) {
    return DAHI_HANDI_START_IST_MS - timeMs;  // Delay until Dahi Handi starts
  }
  if (timeMs < FESTIVAL_END_IST_MS) {
    return FESTIVAL_END_IST_MS - timeMs;      // Delay until Normal rollback
  }
  return null; // Festival period concluded
}
