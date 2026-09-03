import { describe, it, expect } from "vitest";

describe("Faculty Exams & Marks Logic", () => {
  it("computes status correctly based on max and min passing marks", () => {
    const minMarks = 40;
    const maxMarks = 100;

    const computeStatus = (marks: number | null | "", isAbsent: boolean) => {
      if (isAbsent) return "ABSENT";
      if (marks === "" || marks === null || isNaN(Number(marks))) return "PENDING";
      const num = Number(marks);
      return num >= minMarks ? "PASSED" : "FAILED";
    };

    expect(computeStatus("", false)).toBe("PENDING");
    expect(computeStatus(null, false)).toBe("PENDING");
    expect(computeStatus(75, false)).toBe("PASSED");
    expect(computeStatus(40, false)).toBe("PASSED");
    expect(computeStatus(39, false)).toBe("FAILED");
    expect(computeStatus(0, false)).toBe("FAILED");
    expect(computeStatus(50, true)).toBe("ABSENT");
  });

  it("validates that marks do not exceed max marks or fall below zero", () => {
    const maxMarks = 50;

    const validateMarks = (marks: number) => {
      if (marks < 0) return "Marks cannot be negative";
      if (marks > maxMarks) return `Marks cannot exceed ${maxMarks}`;
      return null;
    };

    expect(validateMarks(50)).toBeNull();
    expect(validateMarks(0)).toBeNull();
    expect(validateMarks(-5)).toBe("Marks cannot be negative");
    expect(validateMarks(51)).toBe("Marks cannot exceed 50");
  });

  it("verifies exam lifecycle transition guards", () => {
    const allowedTransitions: Record<string, string[]> = {
      DRAFT: ["MARKS_ENTRY", "LOCKED"],
      MARKS_ENTRY: ["LOCKED"],
      LOCKED: ["PUBLISHED", "MARKS_ENTRY"], // MARKS_ENTRY via admin unlock
      PUBLISHED: [],
    };

    const canTransition = (from: string, to: string) =>
      allowedTransitions[from]?.includes(to) ?? false;

    expect(canTransition("MARKS_ENTRY", "LOCKED")).toBe(true);
    expect(canTransition("LOCKED", "PUBLISHED")).toBe(true);
    expect(canTransition("LOCKED", "MARKS_ENTRY")).toBe(true); // Admin unlock
    expect(canTransition("PUBLISHED", "MARKS_ENTRY")).toBe(false); // Locked down once published
  });
});
