/**
 * Canvas-based utility to crop images with exact coordinates and high-quality smoothing.
 */

export interface Area {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.setAttribute("crossOrigin", "anonymous");
    image.src = url;
  });

/**
 * Returns a cropped image as a Blob, File and Object URL from source image and pixel coordinates.
 */
export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  outputWidth: number = 600,
  outputHeight: number = 600,
  mimeType: string = "image/jpeg",
  quality: number = 0.92
): Promise<{ blob: Blob; file: File; url: string }> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Canvas 2D rendering context is not available.");
  }

  // Set canvas to desired output dimensions
  canvas.width = outputWidth;
  canvas.height = outputHeight;

  // Configure high-quality smoothing
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // Draw the selected crop area onto the canvas scaled to output size
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    outputWidth,
    outputHeight
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Image processing failed: Canvas produced empty output."));
          return;
        }
        const ext = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
        const filename = `cropped-avatar-${Date.now()}.${ext}`;
        const file = new File([blob], filename, { type: mimeType });
        const url = URL.createObjectURL(blob);
        resolve({ blob, file, url });
      },
      mimeType,
      quality
    );
  });
}

/**
 * Validates file format and size for image uploads.
 */
export function validateImageFile(
  file: File,
  maxSizeMB: number = 10
): { valid: boolean; error?: string } {
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.type.toLowerCase())) {
    return {
      valid: false,
      error: "Unsupported image format. Please select a JPG, JPEG, PNG, or WebP image.",
    };
  }

  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `Image file is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Maximum allowed size is ${maxSizeMB}MB.`,
    };
  }

  return { valid: true };
}
