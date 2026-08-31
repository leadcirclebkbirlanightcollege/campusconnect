import { useState, useCallback, useEffect } from "react";
import Cropper, { Point, Area } from "react-easy-crop";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Image as ImageIcon,
  RotateCcw,
  Minus,
  Plus,
  Loader2,
  AlertTriangle,
  Check,
} from "@/components/icons";
import { getCroppedImg, Area as CropArea } from "@/lib/crop-image";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface ImageCropDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageSrc: string | null;
  aspectRatio?: number;
  cropShape?: "rect" | "round";
  title?: string;
  description?: string;
  outputWidth?: number;
  outputHeight?: number;
  outputMimeType?: "image/jpeg" | "image/png" | "image/webp";
  isSaving?: boolean;
  onCropComplete: (result: { file: File; blob: Blob; url: string }) => Promise<void> | void;
}

export default function ImageCropDialog({
  open,
  onOpenChange,
  imageSrc,
  aspectRatio = 1,
  cropShape = "rect",
  title = "Crop Image",
  description = "Adjust the image inside the square.",
  outputWidth = 600,
  outputHeight = 600,
  outputMimeType = "image/jpeg",
  isSaving = false,
  onCropComplete,
}: ImageCropDialogProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CropArea | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Reset state whenever a new image is loaded
  useEffect(() => {
    if (open && imageSrc) {
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
      setLoadError(null);
      setPreviewUrl(null);
    }
  }, [open, imageSrc]);

  // Clean up any generated preview blob url when unmounting or closing
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const onCropChange = useCallback((newCrop: Point) => {
    setCrop(newCrop);
  }, []);

  const onZoomChange = useCallback((newZoom: number) => {
    setZoom(newZoom);
  }, []);

  const onCropCompleteCallback = useCallback(
    (_croppedArea: Area, currentCroppedAreaPixels: Area) => {
      setCroppedAreaPixels(currentCroppedAreaPixels);
    },
    []
  );

  const handleReset = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  };

  const handleConfirm = async () => {
    if (!imageSrc || !croppedAreaPixels) {
      toast.error("Please adjust the crop area before proceeding.");
      return;
    }

    try {
      setIsProcessing(true);
      const croppedResult = await getCroppedImg(
        imageSrc,
        croppedAreaPixels,
        outputWidth,
        outputHeight,
        outputMimeType,
        0.92
      );

      // Pass the cropped output to consumer handler
      await onCropComplete(croppedResult);
    } catch (err: any) {
      console.error("Failed to generate cropped image:", err);
      toast.error(err.message || "Couldn't process image crop. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    if (!isProcessing && !isSaving) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !isProcessing && !isSaving && onOpenChange(val)}>
      <DialogContent
        className="w-[calc(100%-1.5rem)] sm:max-w-xl p-0 gap-0 overflow-hidden bg-card border-border/60 rounded-3xl shadow-xl"
        onEscapeKeyDown={(e) => {
          if (isProcessing || isSaving) e.preventDefault();
        }}
        onPointerDownOutside={(e) => {
          if (isProcessing || isSaving) e.preventDefault();
        }}
      >
        {/* Modal Header */}
        <DialogHeader className="p-5 sm:p-6 pb-4 border-b border-border/40 bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <ImageIcon className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold text-foreground tracking-tight">
                {title}
              </DialogTitle>
              <DialogDescription className="text-[12px] sm:text-[13px] text-muted-foreground mt-0.5">
                {description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Cropper Viewport */}
        <div className="p-5 sm:p-6 space-y-5">
          {loadError ? (
            <div className="h-[280px] sm:h-[320px] rounded-2xl border border-destructive/30 bg-destructive/5 flex flex-col items-center justify-center p-6 text-center">
              <AlertTriangle className="h-8 w-8 text-destructive mb-2" />
              <p className="text-sm font-semibold text-foreground">Failed to load image</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">{loadError}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                className="mt-4 rounded-xl text-xs"
              >
                Close
              </Button>
            </div>
          ) : (
            <div className="relative w-full h-[280px] sm:h-[340px] rounded-2xl overflow-hidden bg-neutral-950 border border-border/40 shadow-inner select-none">
              {imageSrc ? (
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={aspectRatio}
                  cropShape={cropShape}
                  showGrid={true}
                  restrictPosition={true}
                  onCropChange={onCropChange}
                  onZoomChange={onZoomChange}
                  onCropComplete={onCropCompleteCallback}
                  onMediaLoaded={() => setLoadError(null)}
                  classes={{
                    containerClassName: "rounded-2xl",
                    cropAreaClassName: "border-2 border-primary/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.65)]",
                  }}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-xs">
                  No image selected
                </div>
              )}

              {/* Touch/Mouse drag hint badge */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-none bg-black/75 backdrop-blur-md border border-white/10 px-3 py-1 rounded-full text-[11px] font-medium text-white/90 shadow-sm flex items-center gap-1.5 whitespace-nowrap">
                Drag to reposition · Scroll or pinch to zoom
              </div>
            </div>
          )}

          {/* Zoom & Adjustment Controls */}
          <div className="bg-muted/30 border border-border/40 rounded-2xl p-3 sm:p-4 space-y-3">
            <div className="flex items-center justify-between gap-4">
              <span className="text-[12px] font-semibold text-foreground flex items-center gap-1.5 shrink-0">
                Zoom Control
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleReset}
                disabled={isProcessing || isSaving || zoom === 1}
                className="h-7 px-2 text-[11px] font-medium text-muted-foreground hover:text-foreground gap-1 rounded-lg"
              >
                <RotateCcw className="h-3 w-3" /> Reset
              </Button>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label="Zoom out"
                onClick={() => setZoom((prev) => Math.max(1, Number((prev - 0.2).toFixed(2))))}
                disabled={zoom <= 1 || isProcessing || isSaving}
                className="h-8 w-8 rounded-lg bg-card border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors shrink-0"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>

              <div className="flex-1 px-1">
                <Slider
                  value={[zoom]}
                  min={1}
                  max={3}
                  step={0.02}
                  onValueChange={(val) => setZoom(val[0])}
                  disabled={isProcessing || isSaving}
                  className="cursor-pointer"
                />
              </div>

              <button
                type="button"
                aria-label="Zoom in"
                onClick={() => setZoom((prev) => Math.min(3, Number((prev + 0.2).toFixed(2))))}
                disabled={zoom >= 3 || isProcessing || isSaving}
                className="h-8 w-8 rounded-lg bg-card border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors shrink-0"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>

              <span className="text-[11px] font-mono font-medium text-muted-foreground w-9 text-right shrink-0">
                {zoom.toFixed(1)}x
              </span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-5 sm:p-6 pt-3 border-t border-border/40 bg-muted/15 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
          <p className="text-[11px] text-muted-foreground text-center sm:text-left">
            Cropped image will be formatted as a 1:1 high-resolution profile avatar.
          </p>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isProcessing || isSaving}
              className="flex-1 sm:flex-initial rounded-xl text-[13px] h-9.5 px-4"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={!imageSrc || !croppedAreaPixels || isProcessing || isSaving}
              className="flex-1 sm:flex-initial rounded-xl text-[13px] h-9.5 px-5 gap-1.5 font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs transition-all"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving image...
                </>
              ) : isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Preparing image...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" /> Set Image
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
