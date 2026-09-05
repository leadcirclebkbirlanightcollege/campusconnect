import { describe, it, expect } from "vitest";
import {
  CLASS_OPTIONS,
  GENDER_OPTIONS,
  EXTRA_REQUIREMENT_OPTIONS,
} from "@/pages/student/events/StallRegistrationDialog";

describe("Stall Registration Validation & Configuration", () => {
  it("includes all 18 specified academic classes in exact order", () => {
    expect(CLASS_OPTIONS).toHaveLength(18);
    expect(CLASS_OPTIONS).toEqual([
      "FYBA",
      "SYBA",
      "TYBA",
      "FYBCom (Management studies)",
      "SYBCom (Management studies)",
      "TYBCom (Management studies)",
      "FYBAF",
      "SYBAF",
      "TYBAF",
      "FYBFM",
      "SYBFM",
      "TYBFM",
      "FYBCOM",
      "SYBCOM",
      "TYBCOM",
      "FYCS",
      "SYCS",
      "TYCS",
    ]);
  });

  it("includes Male and Female gender options", () => {
    expect(GENDER_OPTIONS).toEqual(["Male", "Female"]);
  });

  it("includes exact 4 extra requirements options", () => {
    expect(EXTRA_REQUIREMENT_OPTIONS).toEqual([
      "Table",
      "Chair",
      "Electric Board",
      "Bench",
    ]);
  });

  it("validates official WhatsApp group URLs correctly", () => {
    function isValidWhatsAppUrl(url?: string | null): boolean {
      if (!url) return false;
      try {
        const parsed = new URL(url);
        return (
          (parsed.hostname === "chat.whatsapp.com" || parsed.hostname === "wa.me") &&
          parsed.protocol === "https:"
        );
      } catch {
        return false;
      }
    }

    // Valid WhatsApp group URL
    expect(
      isValidWhatsAppUrl(
        "https://chat.whatsapp.com/DF04JFwzfLnDkxpFwhqplc?s=cl&p=a&mlu=0&ilr=4"
      )
    ).toBe(true);

    // Malicious or invalid protocols/domains rejected
    expect(isValidWhatsAppUrl("javascript:alert(1)")).toBe(false);
    expect(isValidWhatsAppUrl("data:text/html,<script></script>")).toBe(false);
    expect(isValidWhatsAppUrl("http://chat.whatsapp.com/test")).toBe(false);
    expect(isValidWhatsAppUrl("https://evil.com/redirect?url=chat.whatsapp.com")).toBe(false);
    expect(isValidWhatsAppUrl("https://localhost:3000/hack")).toBe(false);
    expect(isValidWhatsAppUrl("")).toBe(false);
    expect(isValidWhatsAppUrl(null)).toBe(false);
    expect(isValidWhatsAppUrl(undefined)).toBe(false);
  });

  it("validates that all 4 team members require individual name, class, and gender", async () => {
    const { stallFormSchema } = await import(
      "@/pages/student/events/StallRegistrationDialog"
    );

    const validBase = {
      team_lead_name: "Aarav Sharma",
      team_lead_class: "TYCS",
      team_lead_gender: "Male" as const,
      member_2_name: "Priya Patil",
      member_2_class: "SYCS",
      member_2_gender: "Female" as const,
      member_3_name: "Rohan Gupta",
      member_3_class: "FYCS",
      member_3_gender: "Male" as const,
      member_4_name: "Ananya Deshmukh",
      member_4_class: "TYBCOM",
      member_4_gender: "Female" as const,
      phone: "9876543210",
      selling_description: "Handcrafted Ganpati eco-friendly idols and stationery stalls",
      extra_requirements: ["Table", "Electric Board"],
      suggestion: "Need corner stall if possible",
    };

    // Valid data succeeds
    const successResult = stallFormSchema.safeParse(validBase);
    expect(successResult.success).toBe(true);

    // Missing Member 2 gender fails
    const missingM2Gender = { ...validBase, member_2_gender: undefined };
    expect(stallFormSchema.safeParse(missingM2Gender).success).toBe(false);

    // Missing Member 4 class fails
    const missingM4Class = { ...validBase, member_4_class: "" };
    expect(stallFormSchema.safeParse(missingM4Class).success).toBe(false);

    // Missing Team Lead name fails
    const missingLeadName = { ...validBase, team_lead_name: " " };
    expect(stallFormSchema.safeParse(missingLeadName).success).toBe(false);

    // Less than 2 extra requirements fails
    const oneReq = { ...validBase, extra_requirements: ["Table"] };
    expect(stallFormSchema.safeParse(oneReq).success).toBe(false);

    // More than 2 extra requirements fails
    const threeReqs = { ...validBase, extra_requirements: ["Table", "Chair", "Bench"] };
    expect(stallFormSchema.safeParse(threeReqs).success).toBe(false);

    // Invalid phone number fails
    const invalidPhone = { ...validBase, phone: "12345" };
    expect(stallFormSchema.safeParse(invalidPhone).success).toBe(false);
  });
});
