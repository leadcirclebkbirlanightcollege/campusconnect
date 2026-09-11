import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  formatFileSize,
  isLegacySupabaseStorageUrl,
  GoogleDriveConfigError,
  uploadToGoogleDrive,
  deleteFromGoogleDrive,
  downloadFromGoogleDrive,
  checkGoogleDriveStatus,
  StorageFileRecord,
} from "@/services/googleDriveStorage";
import { supabase } from "@/integrations/supabase/client";

describe("Google Drive Storage Integration Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Utility & Helper Functions", () => {
    it("formats file sizes correctly across units", () => {
      expect(formatFileSize(0)).toBe("0 B");
      expect(formatFileSize(null)).toBe("0 B");
      expect(formatFileSize(undefined)).toBe("0 B");
      expect(formatFileSize(512)).toBe("512 B");
      expect(formatFileSize(1024)).toBe("1.0 KB");
      expect(formatFileSize(1024 * 1024)).toBe("1.0 MB");
      expect(formatFileSize(1024 * 1024 * 15.5)).toBe("15.5 MB");
      expect(formatFileSize(1024 * 1024 * 1024 * 2.25)).toBe("2.25 GB");
    });

    it("correctly identifies legacy Supabase storage URLs", () => {
      expect(
        isLegacySupabaseStorageUrl(
          "https://alllxeqkxhdjyyyavyai.supabase.co/storage/v1/object/public/documents/notes.pdf"
        )
      ).toBe(true);
      expect(
        isLegacySupabaseStorageUrl(
          "https://alllxeqkxhdjyyyavyai.supabase.co/storage/v1/object/sign/submissions/test.docx"
        )
      ).toBe(true);
      expect(isLegacySupabaseStorageUrl("https://drive.google.com/file/d/12345/view")).toBe(false);
      expect(isLegacySupabaseStorageUrl("https://images.unsplash.com/photo-123")).toBe(false);
      expect(isLegacySupabaseStorageUrl(null)).toBe(false);
      expect(isLegacySupabaseStorageUrl("")).toBe(false);
    });

    it("creates GoogleDriveConfigError with missing secrets", () => {
      const err = new GoogleDriveConfigError("OAuth missing", [
        "GOOGLE_CLIENT_ID",
        "GOOGLE_REFRESH_TOKEN",
      ]);
      expect(err.code).toBe("GOOGLE_OAUTH_CONFIG_MISSING");
      expect(err.message).toBe("OAuth missing");
      expect(err.missingSecrets).toEqual(["GOOGLE_CLIENT_ID", "GOOGLE_REFRESH_TOKEN"]);
    });
  });

  describe("Upload to Google Drive", () => {
    it("throws an error when user is not authenticated", async () => {
      vi.spyOn(supabase.auth, "getSession").mockResolvedValueOnce({
        data: { session: null },
        error: null,
      });

      const dummyFile = new File(["sample content"], "syllabus.pdf", { type: "application/pdf" });

      await expect(
        uploadToGoogleDrive({
          file: dummyFile,
          entity_type: "document",
        })
      ).rejects.toThrow("You must be logged in to upload files.");
    });

    it("throws GoogleDriveConfigError when backend responds with 503 config missing", async () => {
      vi.spyOn(supabase.auth, "getSession").mockResolvedValueOnce({
        data: {
          session: {
            access_token: "mock-jwt-token",
          } as any,
        },
        error: null,
      });

      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({
          code: "GOOGLE_OAUTH_CONFIG_MISSING",
          details: "Google Drive OAuth credentials not configured in Supabase secrets.",
          missing_secrets: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REFRESH_TOKEN"],
        }),
      });
      globalThis.fetch = mockFetch;

      const dummyFile = new File(["sample content"], "unit1.pdf", { type: "application/pdf" });

      await expect(
        uploadToGoogleDrive({
          file: dummyFile,
          entity_type: "document",
        })
      ).rejects.toThrow(GoogleDriveConfigError);
    });

    it("successfully uploads file and returns metadata record", async () => {
      vi.spyOn(supabase.auth, "getSession").mockResolvedValueOnce({
        data: {
          session: {
            access_token: "mock-jwt-token",
          } as any,
        },
        error: null,
      });

      const mockFileRecord: StorageFileRecord = {
        id: "file-uuid-123",
        college_id: "college-456",
        file_name: "1726000000_unit1.pdf",
        original_file_name: "unit1.pdf",
        mime_type: "application/pdf",
        file_size: 1024,
        google_drive_file_id: "drive-id-999",
        google_drive_folder_id: null,
        drive_url: "https://drive.google.com/file/d/drive-id-999/view",
        drive_download_link: "https://drive.google.com/uc?id=drive-id-999&export=download",
        entity_type: "document",
        entity_id: null,
        access_level: "authenticated",
        uploaded_by: null,
        status: "active",
        metadata: {},
        created_at: "2026-09-11T12:00:00Z",
        updated_at: "2026-09-11T12:00:00Z",
      };

      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          success: true,
          file: mockFileRecord,
        }),
      });
      globalThis.fetch = mockFetch;

      const dummyFile = new File(["test data"], "unit1.pdf", { type: "application/pdf" });

      const result = await uploadToGoogleDrive({
        file: dummyFile,
        entity_type: "document",
        access_level: "authenticated",
        college_id: "college-456",
      });

      expect(result.id).toBe("file-uuid-123");
      expect(result.google_drive_file_id).toBe("drive-id-999");
      expect(result.drive_url).toContain("drive-id-999");
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("Delete from Google Drive", () => {
    it("deletes file successfully via backend edge function", async () => {
      vi.spyOn(supabase.auth, "getSession").mockResolvedValueOnce({
        data: {
          session: { access_token: "mock-jwt-token" } as any,
        },
        error: null,
      });

      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      });
      globalThis.fetch = mockFetch;

      const result = await deleteFromGoogleDrive("file-uuid-123");
      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/functions/v1/storage-google-drive/file/file-uuid-123"),
        expect.objectContaining({ method: "DELETE" })
      );
    });
  });

  describe("Download from Google Drive", () => {
    it("opens public web view URL directly for public files", async () => {
      const windowOpenSpy = vi.spyOn(window, "open").mockImplementation(() => null);

      const publicFile: StorageFileRecord = {
        id: "public-file-1",
        college_id: null,
        file_name: "poster.jpg",
        original_file_name: "poster.jpg",
        mime_type: "image/jpeg",
        file_size: 50000,
        google_drive_file_id: "drive-poster-1",
        google_drive_folder_id: null,
        drive_url: "https://drive.google.com/file/d/drive-poster-1/view",
        drive_download_link: null,
        entity_type: "event",
        entity_id: null,
        access_level: "public",
        uploaded_by: null,
        status: "active",
        metadata: {},
        created_at: "2026-09-11T12:00:00Z",
        updated_at: "2026-09-11T12:00:00Z",
      };

      await downloadFromGoogleDrive(publicFile);
      expect(windowOpenSpy).toHaveBeenCalledWith("https://drive.google.com/file/d/drive-poster-1/view", "_blank");
    });
  });

  describe("Check Google Drive Status", () => {
    it("fetches drive status from backend correctly", async () => {
      vi.spyOn(supabase.auth, "getSession").mockResolvedValueOnce({
        data: {
          session: { access_token: "mock-jwt" } as any,
        },
        error: null,
      });

      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          status: "ok",
          google_drive: {
            configured: true,
            provider_type: "personal",
            root_folder: "Campus Connect",
            missing_keys: [],
          },
        }),
      });
      globalThis.fetch = mockFetch;

      const status = await checkGoogleDriveStatus();
      expect(status.configured).toBe(true);
      expect(status.provider_type).toBe("personal");
      expect(status.root_folder).toBe("Campus Connect");
    });
  });
});
