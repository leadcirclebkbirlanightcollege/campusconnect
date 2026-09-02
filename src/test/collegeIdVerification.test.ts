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
    // Create dummy buffer of 11MB
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

describe("Verification State Machine Transitions", () => {
  type VerificationState = "not_submitted" | "pending" | "approved" | "rejected";

  function transitionVerificationState(
    current: VerificationState,
    action: "SUBMIT" | "APPROVE" | "REJECT" | "RESUBMIT"
  ): VerificationState {
    switch (current) {
      case "not_submitted":
        if (action === "SUBMIT") return "pending";
        break;
      case "pending":
        if (action === "APPROVE") return "approved";
        if (action === "REJECT") return "rejected";
        break;
      case "rejected":
        if (action === "RESUBMIT") return "pending";
        break;
      case "approved":
        // Approved is terminal active state
        return "approved";
    }
    return current;
  }

  it("follows standard path: not_submitted -> pending -> approved", () => {
    let state: VerificationState = "not_submitted";
    state = transitionVerificationState(state, "SUBMIT");
    expect(state).toBe("pending");

    state = transitionVerificationState(state, "APPROVE");
    expect(state).toBe("approved");
  });

  it("follows rejection and resubmission loop: pending -> rejected -> resubmit -> pending -> approved", () => {
    let state: VerificationState = "pending";
    state = transitionVerificationState(state, "REJECT");
    expect(state).toBe("rejected");

    // Student updates ID card and resubmits
    state = transitionVerificationState(state, "RESUBMIT");
    expect(state).toBe("pending");

    // Admin approves second submission
    state = transitionVerificationState(state, "APPROVE");
    expect(state).toBe("approved");
  });
});
