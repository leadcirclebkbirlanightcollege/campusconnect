import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type EntityType =
  | "document"
  | "academic"
  | "event"
  | "notice"
  | "certificate"
  | "assignment"
  | "submission"
  | "student_id"
  | "avatar"
  | "media"
  | "general";

export type AccessLevel = "public" | "authenticated" | "private" | "admin";

export type StorageFileRecord = Tables<"storage_files">;

export interface GoogleDriveStatus {
  configured: boolean;
  oauth_valid?: boolean;
  root_folder_ready?: boolean;
  provider_type: "personal" | "shared_drive";
  root_folder: string;
  missing_keys?: string[];
  oauth_error?: string;
  diagnostics?: {
    client_id_format_valid?: boolean;
    client_secret_length?: number;
    refresh_token_format_valid?: boolean;
  };
}

export interface UploadOptions {
  file: File;
  entity_type: EntityType;
  entity_id?: string | null;
  access_level?: AccessLevel;
  college_id?: string | null;
}

export class GoogleDriveConfigError extends Error {
  code: "GOOGLE_OAUTH_CONFIG_MISSING" | "GOOGLE_OAUTH_AUTH_FAILED" = "GOOGLE_OAUTH_CONFIG_MISSING";
  missingSecrets: string[] = [];

  constructor(
    message = "Google Drive OAuth credentials not configured in backend environment.",
    missingSecrets: string[] = [],
    code: "GOOGLE_OAUTH_CONFIG_MISSING" | "GOOGLE_OAUTH_AUTH_FAILED" = "GOOGLE_OAUTH_CONFIG_MISSING"
  ) {
    super(message);
    this.name = "GoogleDriveConfigError";
    this.code = code;
    this.missingSecrets = missingSecrets;
  }
}

/**
 * Check if the backend Edge Function has Google Drive OAuth credentials configured.
 */
export async function checkGoogleDriveStatus(): Promise<GoogleDriveStatus> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://alllxeqkxhdjyyyavyai.supabase.co";
    const endpoint = `${supabaseUrl}/functions/v1/storage-google-drive/status`;

    const res = await fetch(endpoint, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!res.ok) {
      return { configured: false, provider_type: "personal", root_folder: "Campus Connect", missing_keys: [] };
    }

    const data = await res.json();
    return (
      data?.google_drive || {
        configured: false,
        provider_type: "personal",
        root_folder: "Campus Connect",
        missing_keys: [],
      }
    );
  } catch {
    return { configured: false, provider_type: "personal", root_folder: "Campus Connect", missing_keys: [] };
  }
}

/**
 * Upload a file directly to Google Drive via the secure Supabase Edge Function.
 */
export async function uploadToGoogleDrive(options: UploadOptions): Promise<StorageFileRecord> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error("You must be logged in to upload files.");
  }

  const formData = new FormData();
  formData.append("file", options.file);
  formData.append("file_name", options.file.name);
  formData.append("entity_type", options.entity_type);
  if (options.entity_id) formData.append("entity_id", options.entity_id);
  if (options.access_level) formData.append("access_level", options.access_level);
  if (options.college_id) formData.append("college_id", options.college_id);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://alllxeqkxhdjyyyavyai.supabase.co";
  const endpoint = `${supabaseUrl}/functions/v1/storage-google-drive/upload`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
    body: formData,
  });

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    if (res.status === 503 && json?.code === "GOOGLE_OAUTH_CONFIG_MISSING") {
      throw new GoogleDriveConfigError(
        json.details || "Google Drive OAuth credentials are not yet configured in Supabase secrets.",
        json.missing_secrets || [],
        "GOOGLE_OAUTH_CONFIG_MISSING"
      );
    }
    if (res.status === 502 && json?.code === "GOOGLE_OAUTH_AUTH_FAILED") {
      throw new GoogleDriveConfigError(
        json.details || "Google OAuth token refresh failed: unauthorized_client. Please verify your refresh token matches your GOOGLE_CLIENT_ID.",
        [],
        "GOOGLE_OAUTH_AUTH_FAILED"
      );
    }
    throw new Error(json?.error || json?.details || `Upload failed with status ${res.status}`);
  }

  if (!json?.file) {
    throw new Error("Invalid response from Google Drive storage function");
  }

  return json.file as StorageFileRecord;
}

/**
 * Delete a file from Google Drive and mark its metadata deleted.
 */
export async function deleteFromGoogleDrive(fileId: string): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Authentication required");

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://alllxeqkxhdjyyyavyai.supabase.co";
  const endpoint = `${supabaseUrl}/functions/v1/storage-google-drive/file/${fileId}`;

  const res = await fetch(endpoint, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (!res.ok) {
    const json = await res.json().catch(() => null);
    throw new Error(json?.error || `Failed to delete file (${res.status})`);
  }

  return true;
}

/**
 * Download a file from Google Drive via backend proxy stream.
 */
export async function downloadFromGoogleDrive(file: StorageFileRecord): Promise<void> {
  if (file.access_level === "public" && file.drive_url) {
    window.open(file.drive_url, "_blank");
    return;
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Authentication required");

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://alllxeqkxhdjyyyavyai.supabase.co";
  const endpoint = `${supabaseUrl}/functions/v1/storage-google-drive/download/${file.id}`;

  const res = await fetch(endpoint, {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (!res.ok) {
    if (file.drive_url) {
      window.open(file.drive_url, "_blank");
      return;
    }
    throw new Error(`Failed to download file (${res.status})`);
  }

  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = file.file_name || "download";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(blobUrl);
}

/**
 * Reconcile Supabase metadata against Google Drive.
 */
export async function reconcileGoogleDriveFiles(): Promise<{
  success: boolean;
  count: number;
  report: Array<{ id: string; name: string; status: string }>;
}> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Authentication required");

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://alllxeqkxhdjyyyavyai.supabase.co";
  const endpoint = `${supabaseUrl}/functions/v1/storage-google-drive/reconcile`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const json = await res.json().catch(() => null);
    throw new Error(json?.error || "Reconciliation failed");
  }

  return await res.json();
}

/**
 * Format bytes into readable string.
 */
export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/**
 * Determine if a file URL is from legacy Supabase storage.
 */
export function isLegacySupabaseStorageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.includes("/storage/v1/object/") || url.includes("supabase.co/storage/");
}
