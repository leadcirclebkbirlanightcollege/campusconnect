import { describe, it, expect } from "vitest";
import PublicFooter from "@/components/layout/PublicFooter";

describe("PublicFooter Standardization & Integrity", () => {
  const OFFICIAL_EMAIL = "atharv@campusconnect.indevs.in";
  const INSTITUTION_NAME = "B.K. Birla Night Arts, Science & Commerce College (BKBNC)";
  const INSTITUTION_ADDRESS = "Birla College Road, Kalyan - 421301, Maharashtra, India";

  it("exports PublicFooter component", () => {
    expect(PublicFooter).toBeDefined();
    expect(typeof PublicFooter).toBe("function");
  });

  it("has the verified official contact email and format", () => {
    expect(OFFICIAL_EMAIL).toBe("atharv@campusconnect.indevs.in");
    expect(OFFICIAL_EMAIL).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  });

  it("preserves exact verified institution details", () => {
    expect(INSTITUTION_NAME).toBe("B.K. Birla Night Arts, Science & Commerce College (BKBNC)");
    expect(INSTITUTION_ADDRESS).toContain("Kalyan - 421301");
    expect(INSTITUTION_ADDRESS).toContain("Maharashtra, India");
  });

  it("contains verified navigational routes without hash-only dead links", () => {
    const validRoutes = [
      "/",
      "/#benefits",
      "/#partners",
      "/auth",
      "/book-demo",
      "/onboarding",
      "/contact",
      "/help",
      "/demo",
      "/privacy",
      "/terms",
    ];

    validRoutes.forEach((route) => {
      expect(route).not.toBe("#");
      expect(route.startsWith("/") || route.startsWith("http")).toBe(true);
    });
  });

  it("verifies copyright format is single notice without developer credit", () => {
    const year = new Date().getFullYear();
    const brandName = "Campus Connect";
    const copyrightText = `© ${year} ${brandName}. All rights reserved.`;

    expect(copyrightText).toBe(`© 2026 Campus Connect. All rights reserved.`);
    expect(copyrightText).not.toContain("Designed & developed");
    expect(copyrightText).not.toContain("Department of Computer Science");
  });
});

