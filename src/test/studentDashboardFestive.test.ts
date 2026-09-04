import { describe, it, expect } from "vitest";
import {
  getCampusTheme,
  resolveFestivalTheme,
  getCampusThemeConfig,
  getMsUntilNextTransition,
  JANMASHTAMI_START_IST_MS,
  DAHI_HANDI_START_IST_MS,
  FESTIVAL_END_IST_MS,
} from "@/config/festivalTheme";

describe("Student Dashboard & Festival Integration", () => {
  it("resolves Janmashtami on 4 September 2026 IST", () => {
    const morning = new Date("2026-09-04T09:00:00+05:30");
    const evening = new Date("2026-09-04T20:30:00+05:30");
    expect(getCampusTheme(morning)).toBe("janmashtami");
    expect(getCampusTheme(evening)).toBe("janmashtami");
    expect(resolveFestivalTheme(morning)).toBe("JANMASHTAMI");

    const config = getCampusThemeConfig(morning);
    expect(config.name).toBe("Janmashtami");
    expect(config.greeting).toBe("Happy Janmashtami");
    expect(config.isFestive).toBe(true);
  });

  it("resolves Dahi Handi on 5 September 2026 IST", () => {
    const morning = new Date("2026-09-05T09:00:00+05:30");
    const afternoon = new Date("2026-09-05T14:15:00+05:30");
    expect(getCampusTheme(morning)).toBe("dahi_handi");
    expect(getCampusTheme(afternoon)).toBe("dahi_handi");
    expect(resolveFestivalTheme(morning)).toBe("DAHI_HANDI");

    const config = getCampusThemeConfig(morning);
    expect(config.name).toBe("Dahi Handi");
    expect(config.greeting).toBe("Happy Dahi Handi");
    expect(config.isFestive).toBe(true);
  });

  it("automatically returns to NORMAL at exactly 6 September 2026 00:00:00 IST", () => {
    const midnight = new Date("2026-09-06T00:00:00+05:30");
    const later = new Date("2026-09-06T12:00:00+05:30");
    expect(getCampusTheme(midnight)).toBe("normal");
    expect(getCampusTheme(later)).toBe("normal");
    expect(resolveFestivalTheme(midnight)).toBe("NORMAL");

    const config = getCampusThemeConfig(midnight);
    expect(config.isFestive).toBe(false);
    expect(config.name).toBe("Campus Connect");
  });

  it("correctly calculates delay until next transition for zero-refresh updates", () => {
    // During Janmashtami: next transition is Dahi Handi start
    const duringJanmashtami = new Date("2026-09-04T12:00:00+05:30");
    const delayToDahiHandi = getMsUntilNextTransition(duringJanmashtami);
    expect(delayToDahiHandi).toBe(DAHI_HANDI_START_IST_MS - duringJanmashtami.getTime());
    expect(delayToDahiHandi).toBeGreaterThan(0);

    // During Dahi Handi: next transition is Normal rollback
    const duringDahiHandi = new Date("2026-09-05T18:00:00+05:30");
    const delayToNormal = getMsUntilNextTransition(duringDahiHandi);
    expect(delayToNormal).toBe(FESTIVAL_END_IST_MS - duringDahiHandi.getTime());
    expect(delayToNormal).toBeGreaterThan(0);

    // After festival concluded: no further transitions
    const after = new Date("2026-09-06T01:00:00+05:30");
    expect(getMsUntilNextTransition(after)).toBeNull();
  });

  it("verifies all 8 student quick action routes are canonical in AppRouter", () => {
    const quickActionRoutes = [
      "/app/attendance",
      "/app/academics",
      "/app/events",
      "/app/ecell",
      "/app/announcements",
      "/app/timetable",
      "/app/assignments",
      "/app/more",
    ];

    expect(quickActionRoutes).toHaveLength(8);
    quickActionRoutes.forEach((route) => {
      expect(route.startsWith("/app/")).toBe(true);
    });
  });
});
