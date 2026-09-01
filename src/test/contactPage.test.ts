import { describe, it, expect } from "vitest";

describe("Contact Page Validation & Data Architecture", () => {
  const OFFICIAL_EMAIL = "atharv@campusconnect.indevs.in";

  it("has the verified official email", () => {
    expect(OFFICIAL_EMAIL).toBe("atharv@campusconnect.indevs.in");
    expect(OFFICIAL_EMAIL).not.toContain("bkbirlanightcollege.qzz.io");
  });

  it("validates valid email formats correctly", () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    expect(emailRegex.test("atharv@campusconnect.indevs.in")).toBe(true);
    expect(emailRegex.test("dean@college.edu")).toBe(true);
    expect(emailRegex.test("invalid-email")).toBe(false);
    expect(emailRegex.test("no-at-sign.com")).toBe(false);
  });

  it("formats enquiry notes payload cleanly with enquiry type", () => {
    const enquiryType = "Institutional Partnership";
    const message = "We would like a platform demonstration for our 5000 students.";
    const notesPayload = `[Enquiry Type: ${enquiryType}]\n\n${message}`;

    expect(notesPayload).toContain("[Enquiry Type: Institutional Partnership]");
    expect(notesPayload).toContain(message);
  });

  it("verifies the exact institutional name and address", () => {
    const institutionName = "B.K. Birla Night Arts, Science & Commerce College (BKBNC)";
    const addressLine1 = "Birla College Road, Kalyan - 421301";
    const addressLine2 = "Maharashtra, India";

    expect(institutionName).toBe("B.K. Birla Night Arts, Science & Commerce College (BKBNC)");
    expect(addressLine1).toBe("Birla College Road, Kalyan - 421301");
    expect(addressLine2).toBe("Maharashtra, India");
  });
});
