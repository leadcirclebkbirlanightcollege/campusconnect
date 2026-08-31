import { describe, it, expect } from "vitest";
import { ADMIN_NAV_SECTIONS, getAdminPageMeta } from "@/pages/admin/adminNavConfig";

describe("Admin Navigation Config", () => {
  it("defines all required top-level logical sections", () => {
    const labels = ADMIN_NAV_SECTIONS.map((s) => s.label);
    expect(labels).toContain("Command");
    expect(labels).toContain("Academics");
    expect(labels).toContain("Academic Operations");
    expect(labels).toContain("Attendance");
    expect(labels).toContain("Exams & Content");
    expect(labels).toContain("Campus");
    expect(labels).toContain("E-Cell");
    expect(labels).toContain("System");
  });

  it("contains Faculty in Academics and Lectures/Timetable in Academic Operations", () => {
    const academics = ADMIN_NAV_SECTIONS.find((s) => s.label === "Academics");
    expect(academics).toBeDefined();
    const facultyItem = academics?.items.find((i) => i.url === "/platform/admin/faculty");
    expect(facultyItem).toBeDefined();
    expect(facultyItem?.title).toBe("Faculty");

    const academicOps = ADMIN_NAV_SECTIONS.find((s) => s.label === "Academic Operations");
    expect(academicOps).toBeDefined();
    expect(academicOps?.items.some((i) => i.url === "/platform/admin/lectures")).toBe(true);
    expect(academicOps?.items.some((i) => i.url === "/platform/admin/timetable")).toBe(true);
    expect(academicOps?.items.some((i) => i.url === "/platform/admin/promotion")).toBe(true);
  });

  it("resolves page metadata for faculty and other routes", () => {
    const meta = getAdminPageMeta("/platform/admin/faculty");
    expect(meta.title).toBe("Faculty Management");
    expect(meta.description).toContain("faculty directory");

    const overviewMeta = getAdminPageMeta("/platform/admin/dashboard");
    expect(overviewMeta.title).toBe("Command Center");
  });
});
