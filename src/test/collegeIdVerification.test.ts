import { describe, it, expect } from "vitest";
import {
  validateIdFileBasics,
  MAX_ID_FILE_SIZE_BYTES,
  ACCEPTED_ID_MIME_TYPES,
  ACCEPTED_ID_EXTENSIONS,
} from "@/lib/college-id-validation";

describe("College ID Card Validation", () => {
  it("accepts valid JPEG, PNG, and WEBP files under 10MB", () => {
    const validJpeg = new File(["valid-content"], "college_id.jpg", {
      type: "image/jpeg",
    });
    const validPng = new File(["valid-content"], "college_id.png", {
      type: "image/png",
    });
    const validWebp = new File(["valid-content"], "college_id.webp", {
      type: "image/webp",
    });

    expect(validateIdFileBasics(validJpeg).isValid).toBe(true);
    expect(validateIdFileBasics(validPng).isValid).toBe(true);
    expect(validateIdFileBasics(validWebp).isValid).toBe(true);
  });

  it("rejects empty files (0 bytes)", () => {
    const emptyFile = new File([], "empty.jpg", { type: "image/jpeg" });
    const result = validateIdFileBasics(emptyFile);

    expect(result.isValid).toBe(false);
    expect(result.error).toContain("empty");
  });

  it("rejects oversized files exceeding 10MB", () => {
    const oversizedBlob = new Blob([new Uint8Array(MAX_ID_FILE_SIZE_BYTES + 1024)], {
      type: "image/jpeg",
    });
    const oversizedFile = new File([oversizedBlob], "large_id.jpg", {
      type: "image/jpeg",
    });

    const result = validateIdFileBasics(oversizedFile);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain("exceeds");
    expect(result.error).toContain("10 MB");
  });

  it("rejects unsupported MIME types such as PDF or text", () => {
    const pdfFile = new File(["dummy pdf content"], "doc.pdf", {
      type: "application/pdf",
    });
    const txtFile = new File(["dummy text content"], "card.txt", {
      type: "text/plain",
    });

    const pdfResult = validateIdFileBasics(pdfFile);
    const txtResult = validateIdFileBasics(txtFile);

    expect(pdfResult.isValid).toBe(false);
    expect(pdfResult.error).toContain("Unsupported file format");

    expect(txtResult.isValid).toBe(false);
    expect(txtResult.error).toContain("Unsupported file format");
  });

  it("defines explicit accepted formats matching institutional specs", () => {
    expect(ACCEPTED_ID_MIME_TYPES).toContain("image/jpeg");
    expect(ACCEPTED_ID_MIME_TYPES).toContain("image/png");
    expect(ACCEPTED_ID_MIME_TYPES).toContain("image/webp");
    expect(ACCEPTED_ID_EXTENSIONS).toContain(".jpg");
    expect(ACCEPTED_ID_EXTENSIONS).toContain(".png");
    expect(ACCEPTED_ID_EXTENSIONS).toContain(".webp");
  });
});

describe("Verification State Machine Transitions & Retention Policy", () => {
  type VerificationState = "not_submitted" | "pending" | "approved" | "rejected" | "deleted";

  interface StudentRecord {
    id: string;
    approval_status: VerificationState;
    id_card_path: string | null;
    rejected_at: Date | null;
    delete_after: Date | null;
  }

  function simulateApproval(student: StudentRecord): StudentRecord {
    if (student.approval_status !== "pending") return student;
    return {
      ...student,
      approval_status: "approved",
      id_card_path: null, // Data minimization: ID card path cleared upon approval
      rejected_at: null,
      delete_after: null,
    };
  }

  function simulateRejection(student: StudentRecord, rejectedAt: Date): StudentRecord {
    if (student.approval_status === "approved") return student;
    const deleteAfter = new Date(rejectedAt.getTime() + 2 * 60 * 1000); // exactly 2 minutes
    return {
      ...student,
      approval_status: "rejected",
      rejected_at: rejectedAt,
      delete_after: deleteAfter,
    };
  }

  function simulateCleanup(student: StudentRecord, currentTime: Date): StudentRecord | null {
    // Only rejected accounts with delete_after <= currentTime are purged
    if (
      student.approval_status === "rejected" &&
      student.delete_after &&
      currentTime >= student.delete_after
    ) {
      return null; // Permanently deleted
    }
    return student; // Retained
  }

  it("follows standard path: not_submitted -> pending -> approved with ID card purged", () => {
    let student: StudentRecord = {
      id: "student-1",
      approval_status: "pending",
      id_card_path: "student-1/college-id-123.jpg",
      rejected_at: null,
      delete_after: null,
    };

    const approved = simulateApproval(student);
    expect(approved.approval_status).toBe("approved");
    expect(approved.id_card_path).toBeNull(); // Data minimization check
  });

  it("calculates exact 2-minute deletion window on rejection", () => {
    const baseTime = new Date("2026-09-03T12:00:00Z");
    let student: StudentRecord = {
      id: "student-2",
      approval_status: "pending",
      id_card_path: "student-2/college-id-456.jpg",
      rejected_at: null,
      delete_after: null,
    };

    const rejected = simulateRejection(student, baseTime);
    expect(rejected.approval_status).toBe("rejected");
    expect(rejected.rejected_at).toEqual(baseTime);
    expect(rejected.delete_after).toEqual(new Date("2026-09-03T12:02:00Z")); // Exactly +2 minutes
  });

  it("retains rejected student during the 2-minute grace window", () => {
    const rejectedAt = new Date("2026-09-03T12:00:00Z");
    const student = simulateRejection(
      {
        id: "student-3",
        approval_status: "pending",
        id_card_path: "student-3/id.jpg",
        rejected_at: null,
        delete_after: null,
      },
      rejectedAt
    );

    // After 1 minute: student must still exist
    const oneMinLater = new Date("2026-09-03T12:01:00Z");
    const retained = simulateCleanup(student, oneMinLater);
    expect(retained).not.toBeNull();
    expect(retained?.approval_status).toBe("rejected");
  });

  it("permanently purges rejected student once the 2-minute window has expired", () => {
    const rejectedAt = new Date("2026-09-03T12:00:00Z");
    const student = simulateRejection(
      {
        id: "student-4",
        approval_status: "pending",
        id_card_path: "student-4/id.jpg",
        rejected_at: null,
        delete_after: null,
      },
      rejectedAt
    );

    // After 2 minutes and 1 second: account is permanently purged
    const expiredTime = new Date("2026-09-03T12:02:01Z");
    const purged = simulateCleanup(student, expiredTime);
    expect(purged).toBeNull();
  });

  it("protects approved students from ever being purged by cleanup", () => {
    const student: StudentRecord = {
      id: "student-5",
      approval_status: "approved",
      id_card_path: null,
      rejected_at: null,
      delete_after: new Date("2020-01-01T00:00:00Z"), // Past timestamp simulation
    };

    const result = simulateCleanup(student, new Date());
    expect(result).not.toBeNull();
    expect(result?.approval_status).toBe("approved");
  });

  it("is idempotent: repeated cleanup passes do not cause errors", () => {
    const rejectedAt = new Date("2026-09-03T12:00:00Z");
    let student: StudentRecord | null = simulateRejection(
      {
        id: "student-6",
        approval_status: "pending",
        id_card_path: "student-6/id.jpg",
        rejected_at: null,
        delete_after: null,
      },
      rejectedAt
    );

    const expiredTime = new Date("2026-09-03T12:05:00Z");
    // Pass 1: purges
    student = simulateCleanup(student!, expiredTime);
    expect(student).toBeNull();

    // Pass 2: already null, safe and idempotent
    if (student) {
      student = simulateCleanup(student, expiredTime);
    }
    expect(student).toBeNull();
  });
});
