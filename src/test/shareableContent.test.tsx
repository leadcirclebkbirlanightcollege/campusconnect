import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import ShareDialog from "@/components/share/ShareDialog";
import ShareButton from "@/components/share/ShareButton";
import { validateImageFile } from "@/lib/crop-image";

describe("Universal Shareable Content & Deep-Link System", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("ShareDialog", () => {
    it("renders the canonical URL and entity label for events", () => {
      render(
        <ShareDialog
          open={true}
          onOpenChange={vi.fn()}
          title="Campus Hackathon 2026"
          description="Build cutting edge AI apps"
          url="https://campusconnect.indevs.in/events/test-event-123"
          entityType="event"
        />
      );

      expect(screen.getByText("Share Event")).toBeInTheDocument();
      expect(screen.getByText("Campus Hackathon 2026")).toBeInTheDocument();
      expect(screen.getByText("Build cutting edge AI apps")).toBeInTheDocument();

      const input = screen.getByDisplayValue("https://campusconnect.indevs.in/events/test-event-123");
      expect(input).toBeInTheDocument();
    });

    it("formats relative paths into canonical absolute URLs", () => {
      render(
        <ShareDialog
          open={true}
          onOpenChange={vi.fn()}
          title="Physics Lecture Notes"
          description="Chapter 4 Wave Mechanics"
          url="/notes/doc-456"
          entityType="note"
        />
      );

      expect(screen.getByText("Share Study Material")).toBeInTheDocument();
      const input = screen.getByRole("textbox") as HTMLInputElement;
      expect(input.value).toMatch(/^https?:\/\/.+\/notes\/doc-456$/);
    });

    it("copies canonical URL to clipboard on copy click", async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: {
          writeText: writeTextMock,
        },
      });

      render(
        <ShareDialog
          open={true}
          onOpenChange={vi.fn()}
          title="Operating Systems Assignment"
          url="https://campusconnect.indevs.in/assignments/asg-789"
          entityType="assignment"
        />
      );

      const copyBtn = screen.getByRole("button", { name: /copy/i });
      fireEvent.click(copyBtn);

      expect(writeTextMock).toHaveBeenCalledWith("https://campusconnect.indevs.in/assignments/asg-789");
      await waitFor(() => {
        expect(screen.getByText("Copied")).toBeInTheDocument();
      });
    });

    it("toggles QR code view when QR button is pressed", () => {
      render(
        <ShareDialog
          open={true}
          onOpenChange={vi.fn()}
          title="Midterm Examination"
          url="https://campusconnect.indevs.in/exams/ex-101"
          entityType="exam"
        />
      );

      const qrToggleBtn = screen.getByText("QR Code");
      fireEvent.click(qrToggleBtn);

      expect(screen.getByText(/Scan with any camera/i)).toBeInTheDocument();
    });
  });

  describe("ShareButton", () => {
    it("opens the fallback ShareDialog on devices without navigator.share", async () => {
      // Ensure navigator.share is undefined
      Object.defineProperty(navigator, "share", {
        value: undefined,
        configurable: true,
        writable: true,
      });

      render(
        <ShareButton
          title="Campus Cultural Fest"
          description="All night music and arts"
          url="/events/fest-2026"
          entityType="event"
        />
      );

      const button = screen.getByRole("button", { name: /share/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText("Share Event")).toBeInTheDocument();
      });
    });

    it("calls navigator.share when available", async () => {
      const shareMock = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, "share", {
        value: shareMock,
        configurable: true,
        writable: true,
      });

      render(
        <ShareButton
          title="E-Cell Pitch Day"
          description="Pitch your startup"
          url="https://campusconnect.indevs.in/events/pitch-day"
          entityType="event"
        />
      );

      const button = screen.getByRole("button", { name: /share/i });
      fireEvent.click(button);

      expect(shareMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "E-Cell Pitch Day",
          text: "Pitch your startup",
          url: "https://campusconnect.indevs.in/events/pitch-day",
        })
      );
    });
  });

  describe("Flyer Validation", () => {
    it("accepts valid JPEG, PNG, and WebP images within 10MB limit", () => {
      const validJpeg = new File(["dummy content"], "flyer.jpg", { type: "image/jpeg" });
      const validPng = new File(["dummy content"], "flyer.png", { type: "image/png" });
      const validWebp = new File(["dummy content"], "flyer.webp", { type: "image/webp" });

      expect(validateImageFile(validJpeg, 10).valid).toBe(true);
      expect(validateImageFile(validPng, 10).valid).toBe(true);
      expect(validateImageFile(validWebp, 10).valid).toBe(true);
    });

    it("rejects unsupported file formats like PDF or executable files", () => {
      const invalidPdf = new File(["dummy content"], "document.pdf", { type: "application/pdf" });
      const res = validateImageFile(invalidPdf, 10);
      expect(res.valid).toBe(false);
      expect(res.error).toMatch(/unsupported image format/i);
    });

    it("rejects files exceeding the specified maximum size limit", () => {
      // Mock large file (15MB)
      const bigFile = new File(["x".repeat(100)], "big.jpg", { type: "image/jpeg" });
      Object.defineProperty(bigFile, "size", { value: 15 * 1024 * 1024 });

      const res = validateImageFile(bigFile, 10);
      expect(res.valid).toBe(false);
      expect(res.error).toMatch(/too large/i);
    });
  });
});
