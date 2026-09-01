import { describe, it, expect } from "vitest";
import { normalizeError } from "@/lib/error-handling";

describe("Central Error Handling & Normalization Engine", () => {
  describe("PostgreSQL Error Code Mapping", () => {
    it("maps 42501 (RLS / permission violation) to safe authorization message", () => {
      const rlsError = {
        code: "42501",
        message: "new row violates row-level security policy for table 'lectures'",
        details: "Failing row contains (9ec3edf6, null, Math 101, ...)",
      };

      const normalized = normalizeError(rlsError);

      expect(normalized.category).toBe("authorization");
      expect(normalized.userMessage).toBe("You don't have permission to perform this action.");
      expect(normalized.isRetryable).toBe(false);
      // Ensure raw table and SQL details are not in the user message
      expect(normalized.userMessage).not.toContain("row-level security");
      expect(normalized.userMessage).not.toContain("lectures");
      // But technical message retains diagnostics for developers
      expect(normalized.technicalMessage).toContain("42501");
      expect(normalized.technicalMessage).toContain("lectures");
    });

    it("maps 23505 (unique violation / duplicate key) to safe conflict message", () => {
      const duplicateError = {
        code: "23505",
        message: "duplicate key value violates unique constraint 'profiles_email_key'",
      };

      const normalized = normalizeError(duplicateError);

      expect(normalized.category).toBe("conflict");
      expect(normalized.userMessage).toBe("A record with this information already exists.");
      expect(normalized.isRetryable).toBe(false);
      expect(normalized.userMessage).not.toContain("profiles_email_key");
    });

    it("maps 23503 (foreign key violation) to safe relational conflict message with retry", () => {
      const fkError = {
        code: "23503",
        message: "insert or update on table 'attendance' violates foreign key constraint 'attendance_lecture_id_fkey'",
      };

      const normalized = normalizeError(fkError);

      expect(normalized.category).toBe("conflict");
      expect(normalized.userMessage).toBe("The selected item or relationship is no longer available.");
      expect(normalized.isRetryable).toBe(true);
    });

    it("maps 23502 (not null violation) to safe validation message", () => {
      const nullError = {
        code: "23502",
        message: "null value in column 'college_id' of relation 'students' violates not-null constraint",
      };

      const normalized = normalizeError(nullError);

      expect(normalized.category).toBe("validation");
      expect(normalized.userMessage).toBe("Please fill in all required fields.");
      expect(normalized.isRetryable).toBe(false);
    });
  });

  describe("HTTP Status Codes & Network Failures", () => {
    it("handles 401 and JWT expiration", () => {
      const authError = {
        status: 401,
        message: "JWT expired",
      };

      const normalized = normalizeError(authError);

      expect(normalized.category).toBe("authentication");
      expect(normalized.userMessage).toBe("Your session has expired. Please sign in again.");
      expect(normalized.isRetryable).toBe(false);
    });

    it("handles network interruptions and fetch failures", () => {
      const networkError = new TypeError("Failed to fetch");

      const normalized = normalizeError(networkError);

      expect(normalized.category).toBe("network");
      expect(normalized.userMessage).toBe("Unable to connect. Please check your internet connection.");
      expect(normalized.isRetryable).toBe(true);
    });

    it("handles request timeouts", () => {
      const timeoutError = {
        message: "The operation was aborted due to timeout",
      };

      const normalized = normalizeError(timeoutError);

      expect(normalized.category).toBe("timeout");
      expect(normalized.userMessage).toBe("The request timed out. Please try again.");
      expect(normalized.isRetryable).toBe(true);
    });
  });

  describe("Context-Specific Message Mapping", () => {
    it("applies context message for lecture scheduling RLS failure", () => {
      const rlsError = {
        code: "42501",
        message: "new row violates row-level security policy for table 'lectures'",
      };

      const normalized = normalizeError(rlsError, "schedule-lecture");

      expect(normalized.category).toBe("authorization");
      expect(normalized.userMessage).toBe("You are not authorized to schedule lectures for this class.");
    });

    it("applies context message for student creation conflict", () => {
      const duplicateError = {
        code: "23505",
        message: "duplicate key value violates unique constraint 'students_email_key'",
      };

      const normalized = normalizeError(duplicateError, "create-student");

      expect(normalized.category).toBe("conflict");
      expect(normalized.userMessage).toBe("A student with this email or student ID already exists.");
    });

    it("applies context message for faculty creation conflict", () => {
      const duplicateError = {
        code: "23505",
        message: "duplicate key value violates unique constraint 'faculty_email_key'",
      };

      const normalized = normalizeError(duplicateError, "add-faculty");

      expect(normalized.category).toBe("conflict");
      expect(normalized.userMessage).toBe("A faculty member with this email or ID already exists.");
    });

    it("applies context message for timetable slot collision", () => {
      const conflictError = {
        code: "23505",
        message: "duplicate key value violates unique constraint 'timetable_slots_overlap_idx'",
      };

      const normalized = normalizeError(conflictError, "save-timetable");

      expect(normalized.category).toBe("conflict");
      expect(normalized.userMessage).toBe("A slot already overlaps with this time and room.");
    });
  });

  describe("Sanitization & Clean Pass-through", () => {
    it("passes through safe, human-readable client validation messages", () => {
      const clientValidationError = new Error("End time must be after start time");

      const normalized = normalizeError(clientValidationError);

      expect(normalized.category).toBe("validation");
      expect(normalized.userMessage).toBe("End time must be after start time");
    });

    it("sanitizes schema/syntax errors and prevents leaking database internals", () => {
      const syntaxError = {
        message: "column 'kind' of relation 'notifications' does not exist",
        code: "42703",
      };

      const normalized = normalizeError(syntaxError);

      expect(normalized.userMessage).not.toContain("column 'kind'");
      expect(normalized.userMessage).not.toContain("relation 'notifications'");
      expect(normalized.userMessage).toBe("Something went wrong. Please try again.");
    });
  });
});
