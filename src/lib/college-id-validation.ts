/**
 * College ID Card Upload Validation Helpers
 * Validates MIME types, file sizes, image corruption, and dimensions.
 */

export const ACCEPTED_ID_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const ACCEPTED_ID_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"] as const;

export const MAX_ID_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
export const MIN_ID_DIMENSION_PX = 100; // Minimum acceptable width/height in px

export interface IdValidationResult {
  isValid: boolean;
  error?: string;
  width?: number;
  height?: number;
}

/**
 * Validates file basic properties (type and size) synchronously before reading.
 */
export function validateIdFileBasics(file: File): { isValid: boolean; error?: string } {
  if (!file) {
    return { isValid: false, error: "Please select an ID card image to upload." };
  }

  if (file.size === 0) {
    return { isValid: false, error: "The selected file is empty (0 bytes). Please choose a valid photo." };
  }

  if (file.size > MAX_ID_FILE_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      isValid: false,
      error: `File size (${sizeMb} MB) exceeds the maximum allowed limit of 10 MB. Please compress or resize your image.`,
    };
  }

  const mime = file.type.toLowerCase();
  const ext = "." + (file.name.split(".").pop() || "").toLowerCase();

  const isAcceptedMime = ACCEPTED_ID_MIME_TYPES.includes(mime as any);
  const isAcceptedExt = ACCEPTED_ID_EXTENSIONS.includes(ext as any);

  if (!isAcceptedMime && !isAcceptedExt) {
    return {
      isValid: false,
      error: "Unsupported file format. Please upload a clear JPG, JPEG, PNG, or WEBP image of your college ID card.",
    };
  }

  return { isValid: true };
}

/**
 * Validates image readability and dimensions asynchronously using in-browser Image object.
 */
export async function validateIdImageReadability(file: File): Promise<IdValidationResult> {
  const basic = validateIdFileBasics(file);
  if (!basic.isValid) {
    return basic;
  }

  // If in a non-browser environment (e.g. Node tests), skip Image element check
  if (typeof window === "undefined" || typeof window.Image === "undefined") {
    return { isValid: true };
  }

  return new Promise((resolve) => {
    let objectUrl: string | null = null;
    try {
      objectUrl = URL.createObjectURL(file);
      const img = new Image();

      img.onload = () => {
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        const width = img.naturalWidth;
        const height = img.naturalHeight;

        if (width < MIN_ID_DIMENSION_PX || height < MIN_ID_DIMENSION_PX) {
          resolve({
            isValid: false,
            error: `Image resolution is too low (${width}x${height}px). Please upload a clear, legible photo of your college ID card.`,
            width,
            height,
          });
        } else {
          resolve({
            isValid: true,
            width,
            height,
          });
        }
      };

      img.onerror = () => {
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        resolve({
          isValid: false,
          error: "The selected image file appears corrupted or unreadable. Please choose a different photo.",
        });
      };

      img.src = objectUrl;
    } catch {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      resolve({
        isValid: false,
        error: "Unable to process the image file. Please try selecting a different photo.",
      });
    }
  });
}
