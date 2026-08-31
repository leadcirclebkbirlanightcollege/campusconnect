import React, { useState, useRef } from "react";
import ImageCropDialog, { ImageCropDialogProps } from "./ImageCropDialog";
import { validateImageFile } from "@/lib/crop-image";
import { toast } from "sonner";

export interface ImageCropperProps extends Omit<ImageCropDialogProps, "open" | "onOpenChange" | "imageSrc" | "onCropComplete"> {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  imageSrc?: string | null;
  onCropComplete: (result: { file: File; blob: Blob; url: string }) => Promise<void> | void;
  children?: (props: {
    openCropModal: (file: File) => void;
    triggerFileInput: () => void;
    fileInputRef: React.RefObject<HTMLInputElement>;
  }) => React.ReactNode;
}

/**
 * Main reusable ImageCropper component.
 * Can be used as a controlled crop dialog or as a render-prop wrapper around file input.
 */
export function ImageCropper({
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  imageSrc: controlledImageSrc,
  aspectRatio = 1,
  cropShape = "rect",
  title = "Crop Image",
  description = "Drag image to reposition · Pinch / scroll to zoom",
  outputWidth = 600,
  outputHeight = 600,
  outputMimeType = "image/jpeg",
  isSaving = false,
  onCropComplete,
  children,
}: ImageCropperProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [internalSrc, setInternalSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;
  const activeImageSrc = controlledImageSrc !== undefined ? controlledImageSrc : internalSrc;

  const handleOpenChange = (val: boolean) => {
    if (isControlled) {
      controlledOnOpenChange?.(val);
    } else {
      setInternalOpen(val);
      if (!val && internalSrc) {
        // Clean up object URL when closing
        URL.revokeObjectURL(internalSrc);
        setInternalSrc(null);
      }
    }
  };

  const openCropModal = (file: File) => {
    const validation = validateImageFile(file, 10);
    if (!validation.valid) {
      toast.error(validation.error || "Invalid image file");
      return;
    }

    // Generate local preview URL for cropper
    const objectUrl = URL.createObjectURL(file);
    setInternalSrc(objectUrl);
    setInternalOpen(true);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      openCropModal(file);
    }
    // reset input value so re-uploading same file triggers change
    e.target.value = "";
  };

  const handleCropResult = async (result: { file: File; blob: Blob; url: string }) => {
    try {
      await onCropComplete(result);
      handleOpenChange(false);
    } catch (err: any) {
      // Keep cropper open on upload failure so user doesn't lose position
      console.error("Cropped image submission error:", err);
      toast.error("Couldn't update image. Please try again.");
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/jpg"
        onChange={handleFileChange}
        className="hidden"
        aria-hidden="true"
      />

      {children?.({
        openCropModal,
        triggerFileInput,
        fileInputRef,
      })}

      <ImageCropDialog
        open={isOpen}
        onOpenChange={handleOpenChange}
        imageSrc={activeImageSrc}
        aspectRatio={aspectRatio}
        cropShape={cropShape}
        title={title}
        description={description}
        outputWidth={outputWidth}
        outputHeight={outputHeight}
        outputMimeType={outputMimeType}
        isSaving={isSaving}
        onCropComplete={handleCropResult}
      />
    </>
  );
}

export default ImageCropper;
export { ImageCropDialog };
