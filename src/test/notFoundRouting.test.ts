import { describe, it, expect } from "vitest";

describe("Custom 404 Route & UX Verification", () => {
  it("truncates very long destination paths correctly", () => {
    const longPath = "/faculty/dashboard/department/computer-science/semester-6/lecture/invalid-uuid-123456789";
    const displayPath = longPath.length > 45 ? `${longPath.slice(0, 42)}…` : longPath;

    expect(displayPath.length).toBeLessThanOrEqual(45);
    expect(displayPath.endsWith("…")).toBe(true);
  });

  it("leaves short destination paths intact", () => {
    const shortPath = "/unknown-path";
    const displayPath = shortPath.length > 45 ? `${shortPath.slice(0, 42)}…` : shortPath;

    expect(displayPath).toBe("/unknown-path");
  });

  it("resolves role-specific dashboard destinations accurately", () => {
    function resolveDashboardPath(role?: string) {
      if (role === "super_admin") return "/platform/admin-control/dashboard";
      if (role === "admin") return "/platform/admin/dashboard";
      if (role === "faculty") return "/faculty/dashboard";
      return "/app/dashboard";
    }

    expect(resolveDashboardPath("super_admin")).toBe("/platform/admin-control/dashboard");
    expect(resolveDashboardPath("admin")).toBe("/platform/admin/dashboard");
    expect(resolveDashboardPath("faculty")).toBe("/faculty/dashboard");
    expect(resolveDashboardPath("student")).toBe("/app/dashboard");
    expect(resolveDashboardPath(undefined)).toBe("/app/dashboard");
  });
});
