import { describe, it, expect, vi } from "vitest";
import { parseISO, isToday, format } from "date-fns";

describe("Faculty Dashboard date resilience helpers", () => {
  function safeParseDate(dateStr?: string | null): Date | null {
    if (!dateStr) return null;
    try {
      const d = parseISO(dateStr);
      return isNaN(d.getTime()) ? null : d;
    } catch {
      return null;
    }
  }

  function safeIsToday(dateStr?: string | null): boolean {
    const d = safeParseDate(dateStr);
    return d ? isToday(d) : false;
  }

  function safeFormatDate(dateStr?: string | null | Date, fmt = "MMM d"): string {
    if (!dateStr) return "—";
    try {
      const d = typeof dateStr === "string" ? safeParseDate(dateStr) : dateStr;
      if (!d || isNaN(d.getTime())) return "—";
      return format(d, fmt);
    } catch {
      return "—";
    }
  }

  it("handles null, undefined, and empty string without throwing RangeError", () => {
    expect(safeParseDate(null)).toBeNull();
    expect(safeParseDate(undefined)).toBeNull();
    expect(safeParseDate("")).toBeNull();

    expect(safeIsToday(null)).toBe(false);
    expect(safeIsToday(undefined)).toBe(false);
    expect(safeIsToday("invalid-date-string")).toBe(false);

    expect(safeFormatDate(null)).toBe("—");
    expect(safeFormatDate(undefined)).toBe("—");
    expect(safeFormatDate("")).toBe("—");
    expect(safeFormatDate("not-a-date")).toBe("—");
  });

  it("correctly identifies today for current ISO date", () => {
    const todayIso = format(new Date(), "yyyy-MM-dd");
    expect(safeIsToday(todayIso)).toBe(true);
  });

  it("formats valid ISO date correctly", () => {
    const formatted = safeFormatDate("2026-09-03", "MMM d, yyyy");
    expect(formatted).toBe("Sep 3, 2026");
  });
});

describe("ErrorBoundary Reference ID and Recovery specifications", () => {
  function generateErrorId() {
    return `ERR-${Date.now().toString(36).toUpperCase()}`;
  }

  it("generates a structured reference ID matching ERR-* pattern", () => {
    const id = generateErrorId();
    expect(id).toMatch(/^ERR-[A-Z0-9]+$/);
  });

  it("determines correct dashboard destination from route pathname", () => {
    const getDashboardPath = (path: string) => {
      if (path.startsWith("/faculty")) return "/faculty/dashboard";
      if (path.startsWith("/platform/admin-control")) return "/platform/admin-control/dashboard";
      if (path.startsWith("/platform/admin")) return "/platform/admin/dashboard";
      if (path.startsWith("/app")) return "/app/dashboard";
      return "/";
    };

    expect(getDashboardPath("/faculty/dashboard")).toBe("/faculty/dashboard");
    expect(getDashboardPath("/faculty/my-lectures")).toBe("/faculty/dashboard");
    expect(getDashboardPath("/platform/admin/students")).toBe("/platform/admin/dashboard");
    expect(getDashboardPath("/app/profile")).toBe("/app/dashboard");
    expect(getDashboardPath("/auth")).toBe("/");
  });
});
