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

  it("validates that 1 member (Team Lead) is mandatory, while members 2-4 are optional", async () => {
    const { stallFormSchema } = await import(
      "@/pages/student/events/StallRegistrationDialog"
    );

    // Solo registration (only 1 member, members 2-4 empty) MUST succeed!
    const soloRegistration = {
      team_lead_name: "Aarav Sharma",
      team_lead_class: "TYCS",
      team_lead_gender: "Male" as const,
      member_2_name: "",
      member_2_class: "",
      member_2_gender: "Male" as const,
      member_3_name: "",
      member_3_class: "",
      member_3_gender: "Male" as const,
      member_4_name: "",
      member_4_class: "",
      member_4_gender: "Male" as const,
      phone: "9876543210",
      selling_description: "Handcrafted Ganpati eco-friendly idols and stationery stalls",
      extra_requirements: ["Table", "Electric Board"],
      suggestion: "Corner stall please",
    };

    const soloResult = stallFormSchema.safeParse(soloRegistration);
    expect(soloResult.success).toBe(true);

    // Full 4-member team registration MUST succeed
    const fullTeamRegistration = {
      ...soloRegistration,
      member_2_name: "Priya Patil",
      member_2_class: "SYCS",
      member_2_gender: "Female" as const,
      member_3_name: "Rohan Gupta",
      member_3_class: "FYCS",
      member_3_gender: "Male" as const,
      member_4_name: "Ananya Deshmukh",
      member_4_class: "TYBCOM",
      member_4_gender: "Female" as const,
    };
    expect(stallFormSchema.safeParse(fullTeamRegistration).success).toBe(true);

    // 2-member team registration MUST succeed
    const twoMemberRegistration = {
      ...soloRegistration,
      member_2_name: "Priya Patil",
      member_2_class: "SYCS",
      member_2_gender: "Female" as const,
    };
    expect(stallFormSchema.safeParse(twoMemberRegistration).success).toBe(true);

    // If Member 2 name is entered, Member 2 class MUST be selected
    const m2WithoutClass = {
      ...soloRegistration,
      member_2_name: "Priya Patil",
      member_2_class: "",
    };
    const m2WithoutClassResult = stallFormSchema.safeParse(m2WithoutClass);
    expect(m2WithoutClassResult.success).toBe(false);

    // If Member 2 class is selected, Member 2 name MUST be entered
    const m2WithoutName = {
      ...soloRegistration,
      member_2_name: "",
      member_2_class: "SYCS",
    };
    expect(stallFormSchema.safeParse(m2WithoutName).success).toBe(false);

    // Missing Team Lead name MUST fail
    const missingLeadName = { ...soloRegistration, team_lead_name: " " };
    expect(stallFormSchema.safeParse(missingLeadName).success).toBe(false);

    // Missing Team Lead class MUST fail
    const missingLeadClass = { ...soloRegistration, team_lead_class: "" };
    expect(stallFormSchema.safeParse(missingLeadClass).success).toBe(false);

    // Less than 2 extra requirements MUST fail
    const oneReq = { ...soloRegistration, extra_requirements: ["Table"] };
    expect(stallFormSchema.safeParse(oneReq).success).toBe(false);

    // More than 2 extra requirements MUST fail
    const threeReqs = { ...soloRegistration, extra_requirements: ["Table", "Chair", "Bench"] };
    expect(stallFormSchema.safeParse(threeReqs).success).toBe(false);

    // Invalid phone number MUST fail
    const invalidPhone = { ...soloRegistration, phone: "12345" };
    expect(stallFormSchema.safeParse(invalidPhone).success).toBe(false);
  });

  it("renders ClassSelect and preserves selected value immediately", async () => {
    const React = await import("react");
    const { render, screen, fireEvent } = await import("@testing-library/react");
    const { ClassSelect } = await import(
      "@/pages/student/events/StallRegistrationDialog"
    );

    let currentValue = "";
    const handleChange = (v: string) => {
      currentValue = v;
    };

    const { rerender } = render(
      React.createElement(ClassSelect, {
        id: "team_lead_class",
        name: "team_lead_class",
        label: "Team Lead Class",
        value: currentValue,
        onChange: handleChange,
      })
    );

    const select = screen.getByLabelText("Team Lead Class") as HTMLSelectElement;
    expect(select.value).toBe("");

    // User selects FYBCom (Management studies)
    fireEvent.change(select, {
      target: { value: "FYBCom (Management studies)" },
    });
    expect(currentValue).toBe("FYBCom (Management studies)");

    // Parent re-renders with the new controlled value
    rerender(
      React.createElement(ClassSelect, {
        id: "team_lead_class",
        name: "team_lead_class",
        label: "Team Lead Class",
        value: currentValue,
        onChange: handleChange,
      })
    );

    expect(select.value).toBe("FYBCom (Management studies)");
    expect(screen.getAllByText("FYBCom (Management studies)").length).toBeGreaterThan(0);
  });
});
