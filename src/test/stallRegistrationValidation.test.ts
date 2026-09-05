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
});
