import { describe, it, expect } from "vitest";
import {
  getCampusTheme,
  resolveFestivalTheme,
  getCampusThemeConfig,
  getISTDateString,
  getMsUntilNextTransition,
  JANMASHTAMI_START_IST_MS,
  DAHI_HANDI_START_IST_MS,
  FESTIVAL_END_IST_MS,
} from "@/config/festivalTheme";

describe("Campus Connect Festival Theme Resolver", () => {
  it("converts dates to Asia/Kolkata date string accurately", () => {
    // 2026-09-03 19:00 UTC is 2026-09-04 00:30 IST
    const date1 = new Date("2026-09-03T19:00:00.000Z");
    expect(getISTDateString(date1)).toBe("2026-09-04");

    // 2026-09-04 19:00 UTC is 2026-09-05 00:30 IST
    const date2 = new Date("2026-09-04T19:00:00.000Z");
    expect(getISTDateString(date2)).toBe("2026-09-05");

    // 2026-09-05 19:00 UTC is 2026-09-06 00:30 IST
    const date3 = new Date("2026-09-05T19:00:00.000Z");
    expect(getISTDateString(date3)).toBe("2026-09-06");
  });

  /* ─────────────────────────────────────────────────────────────
   * MANDATORY SPECIFICATION BOUNDARIES:
   * Sep 3 23:59:59 IST → NORMAL
   * Sep 4 00:00:00 IST → JANMASHTAMI
   * Sep 4 12:00 IST    → JANMASHTAMI
   * Sep 4 23:59:59 IST → JANMASHTAMI
   * Sep 5 00:00:00 IST → DAHI_HANDI
   * Sep 5 12:00 IST    → DAHI_HANDI
   * Sep 5 23:59:59 IST → DAHI_HANDI
   * Sep 6 00:00:00 IST → NORMAL
   * Sep 6 12:00 IST    → NORMAL
   * ───────────────────────────────────────────────────────────── */

  it("Sep 3 23:59:59 IST → NORMAL", () => {
    const d = new Date("2026-09-03T23:59:59+05:30");
    expect(resolveFestivalTheme(d)).toBe("NORMAL");
    expect(getCampusTheme(d)).toBe("normal");
    expect(getCampusThemeConfig(d).isFestive).toBe(false);
  });

  it("Sep 4 00:00:00 IST → JANMASHTAMI", () => {
    const d = new Date("2026-09-04T00:00:00+05:30");
    expect(resolveFestivalTheme(d)).toBe("JANMASHTAMI");
    expect(getCampusTheme(d)).toBe("janmashtami");
    const config = getCampusThemeConfig(d);
    expect(config.isFestive).toBe(true);
    expect(config.name).toBe("Janmashtami");
    expect(config.greeting).toBe("Happy Janmashtami");
  });

  it("Sep 4 12:00 IST → JANMASHTAMI", () => {
    const d = new Date("2026-09-04T12:00:00+05:30");
    expect(resolveFestivalTheme(d)).toBe("JANMASHTAMI");
    expect(getCampusTheme(d)).toBe("janmashtami");
    expect(getCampusThemeConfig(d).isFestive).toBe(true);
  });

  it("Sep 4 23:59:59 IST → JANMASHTAMI", () => {
    const d = new Date("2026-09-04T23:59:59+05:30");
    expect(resolveFestivalTheme(d)).toBe("JANMASHTAMI");
    expect(getCampusTheme(d)).toBe("janmashtami");
    expect(getCampusThemeConfig(d).isFestive).toBe(true);
  });

  it("Sep 5 00:00:00 IST → DAHI_HANDI", () => {
    const d = new Date("2026-09-05T00:00:00+05:30");
    expect(resolveFestivalTheme(d)).toBe("DAHI_HANDI");
    expect(getCampusTheme(d)).toBe("dahi_handi");
    const config = getCampusThemeConfig(d);
    expect(config.isFestive).toBe(true);
    expect(config.name).toBe("Dahi Handi");
    expect(config.greeting).toBe("Happy Dahi Handi");
  });

  it("Sep 5 12:00 IST → DAHI_HANDI", () => {
    const d = new Date("2026-09-05T12:00:00+05:30");
    expect(resolveFestivalTheme(d)).toBe("DAHI_HANDI");
    expect(getCampusTheme(d)).toBe("dahi_handi");
    expect(getCampusThemeConfig(d).isFestive).toBe(true);
  });

  it("Sep 5 23:59:59 IST → DAHI_HANDI", () => {
    const d = new Date("2026-09-05T23:59:59+05:30");
    expect(resolveFestivalTheme(d)).toBe("DAHI_HANDI");
    expect(getCampusTheme(d)).toBe("dahi_handi");
    expect(getCampusThemeConfig(d).isFestive).toBe(true);
  });

  it("Sep 6 00:00:00 IST → NORMAL", () => {
    const d = new Date("2026-09-06T00:00:00+05:30");
    expect(resolveFestivalTheme(d)).toBe("NORMAL");
    expect(getCampusTheme(d)).toBe("normal");
    expect(getCampusThemeConfig(d).isFestive).toBe(false);
  });

  it("Sep 6 12:00 IST → NORMAL", () => {
    const d = new Date("2026-09-06T12:00:00+05:30");
    expect(resolveFestivalTheme(d)).toBe("NORMAL");
    expect(getCampusTheme(d)).toBe("normal");
    expect(getCampusThemeConfig(d).isFestive).toBe(false);
  });

  it("verifies exact millisecond boundary transitions", () => {
    // 1 millisecond before Janmashtami starts (Sep 3 23:59:59.999 IST)
    expect(getCampusTheme(new Date(JANMASHTAMI_START_IST_MS - 1))).toBe("normal");

    // Exact moment Janmashtami starts (Sep 4 00:00:00.000 IST)
    expect(getCampusTheme(new Date(JANMASHTAMI_START_IST_MS))).toBe("janmashtami");

    // 1 millisecond before Dahi Handi starts (Sep 4 23:59:59.999 IST)
    expect(getCampusTheme(new Date(DAHI_HANDI_START_IST_MS - 1))).toBe("janmashtami");

    // Exact moment Dahi Handi starts (Sep 5 00:00:00.000 IST)
    expect(getCampusTheme(new Date(DAHI_HANDI_START_IST_MS))).toBe("dahi_handi");

    // 1 millisecond before Normal rollback (Sep 5 23:59:59.999 IST)
    expect(getCampusTheme(new Date(FESTIVAL_END_IST_MS - 1))).toBe("dahi_handi");

    // Exact moment Normal rolls back (Sep 6 00:00:00.000 IST)
    expect(getCampusTheme(new Date(FESTIVAL_END_IST_MS))).toBe("normal");
  });

  it("accurately calculates exact transition timing delays", () => {
    // 1000ms before Janmashtami start
    const justBeforeJan = new Date(JANMASHTAMI_START_IST_MS - 1000);
    expect(getMsUntilNextTransition(justBeforeJan)).toBe(1000);

    // Midday Sep 4 -> delay until Dahi Handi (12 hours = 43200000ms)
    const middaySep4 = new Date("2026-09-04T12:00:00+05:30");
    expect(getMsUntilNextTransition(middaySep4)).toBe(43200000);

    // Midday Sep 5 -> delay until Normal rollback (12 hours = 43200000ms)
    const middaySep5 = new Date("2026-09-05T12:00:00+05:30");
    expect(getMsUntilNextTransition(middaySep5)).toBe(43200000);

    // On or after Sep 6 00:00:00 IST -> null (no further transitions)
    const sep6Start = new Date("2026-09-06T00:00:00+05:30");
    expect(getMsUntilNextTransition(sep6Start)).toBeNull();

    const sep6Noon = new Date("2026-09-06T12:00:00+05:30");
    expect(getMsUntilNextTransition(sep6Noon)).toBeNull();
  });
});
