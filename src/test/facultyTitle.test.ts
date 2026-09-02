import { describe, it, expect } from "vitest";
import { formatFacultyName, FACULTY_TITLES, FacultyTitle } from "@/lib/faculty";
import { z } from "zod";

describe("Faculty Title / Prefix System", () => {
  describe("Allowed Titles Constant", () => {
    it("contains ONLY Dr., Mr., Ms., Mrs.", () => {
      expect(FACULTY_TITLES).toEqual(["Dr.", "Mr.", "Ms.", "Mrs."]);
      expect(FACULTY_TITLES).toHaveLength(4);
    });

    it("rejects unauthorized titles in schema validation", () => {
      const schema = z.enum(FACULTY_TITLES);

      expect(schema.safeParse("Dr.").success).toBe(true);
      expect(schema.safeParse("Mr.").success).toBe(true);
      expect(schema.safeParse("Ms.").success).toBe(true);
      expect(schema.safeParse("Mrs.").success).toBe(true);

      // Unauthorized titles
      expect(schema.safeParse("Prof.").success).toBe(false);
      expect(schema.safeParse("Sir").success).toBe(false);
      expect(schema.safeParse("Doctor").success).toBe(false);
      expect(schema.safeParse("Mister").success).toBe(false);
    });
  });

  describe("formatFacultyName Helper", () => {
    it("formats with Dr. title prefix", () => {
      expect(formatFacultyName("Rahul Sharma", "Dr.")).toBe("Dr. Rahul Sharma");
    });

    it("formats with Mr. title prefix", () => {
      expect(formatFacultyName("Amit Kumar", "Mr.")).toBe("Mr. Amit Kumar");
    });

    it("formats with Ms. title prefix", () => {
      expect(formatFacultyName("Priya Nair", "Ms.")).toBe("Ms. Priya Nair");
    });

    it("formats with Mrs. title prefix", () => {
      expect(formatFacultyName("Neha Patil", "Mrs.")).toBe("Mrs. Neha Patil");
    });

    it("returns name without prefix if no title has been selected (null or undefined)", () => {
      expect(formatFacultyName("Rahul Sharma", null)).toBe("Rahul Sharma");
      expect(formatFacultyName("Rahul Sharma", undefined)).toBe("Rahul Sharma");
      expect(formatFacultyName("Rahul Sharma", "")).toBe("Rahul Sharma");
      expect(formatFacultyName("Rahul Sharma", "   ")).toBe("Rahul Sharma");
    });

    it("returns empty string if name is missing or empty", () => {
      expect(formatFacultyName(null, "Dr.")).toBe("");
      expect(formatFacultyName(undefined, "Dr.")).toBe("");
      expect(formatFacultyName("", "Dr.")).toBe("");
      expect(formatFacultyName("   ", "Dr.")).toBe("");
    });

    it("does not duplicate title if name already starts with title", () => {
      expect(formatFacultyName("Dr. Rahul Sharma", "Dr.")).toBe("Dr. Rahul Sharma");
      expect(formatFacultyName("Mr. Amit Kumar", "Mr.")).toBe("Mr. Amit Kumar");
      expect(formatFacultyName("ms. priya nair", "Ms.")).toBe("ms. priya nair");
    });

    it("trims extraneous whitespace from name and title", () => {
      expect(formatFacultyName("  Rahul Sharma  ", "  Dr.  ")).toBe("Dr. Rahul Sharma");
    });
  });
});
