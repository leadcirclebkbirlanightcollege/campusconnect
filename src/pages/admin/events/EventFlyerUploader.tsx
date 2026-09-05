import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import ImageCropDialog from "@/components/image/ImageCropDialog";
import { validateImageFile } from "@/lib/crop-image";
import { toast } from "sonner";
import {
  UploadCloud,
  Image as ImageIcon,
  RotateCcw,
  Trash2,
  Check,
  Loader2,
  Eye,
} from "@/components/icons";

interface EventFlyerUploaderProps {
  value: string | null;
  onChange: (url: string | null) => void;
  disabled?: boolean;
}

export default function EventFlyerUploader({
  value,
  onChange,
  disabled = false,
}: EventFlyerUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedRawImage, setSelectedRawImage] = useState<string | null>(null);
  const [isCropOpen, setIsCropOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file, 10);
    if (!validation.valid) {
      toast.error(validation.error || "Invalid image file");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setSelectedRawImage(objectUrl);
    setIsCropOpen(true);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCropComplete = async (croppedResult: {
    file: File;
    blob: Blob;
    url: string;
  }) => {
    try {
      setIsUploading(true);

      const fileExt = croppedResult.file.type === "image/webp" ? "webp" : "jpg";
      const fileName = `events/${Date.now()}-${crypto.randomUUID()}.${fileExt}`;

      const { data, error: uploadError } = await supabase.storage
        .from("lecture-flyers")
        .upload(fileName, croppedResult.file, {
          cacheControl: "31536000",
          upsert: false,
          contentType: croppedResult.file.type || "image/jpeg",
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicData } = supabase.storage
        .from("lecture-flyers")
        .getPublicUrl(fileName);

      onChange(publicData.publicUrl);
      toast.success("Flyer uploaded and ready");
      setIsCropOpen(false);

      if (selectedRawImage) {
        URL.revokeObjectURL(selectedRawImage);
        setSelectedRawImage(null);
      }
    } catch (err: any) {
      console.error("Flyer upload error:", err);
      toast.error(err.message || "Failed to upload cropped flyer");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onChange(null);
    toast.info("Flyer removed");
  };

  const handleTriggerPicker = () => {
    if (disabled || isUploading) return;
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold text-foreground">Event Flyer</Label>
        <span className="text-[11px] text-muted-foreground">16:9 Banner Recommended (JPG, PNG, WebP)</span>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/jpg"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || isUploading}
      />

      {value ? (
        <div className="relative overflow-hidden rounded-2xl border border-border-subtle bg-surface-1 shadow-card group">
          <div className="relative aspect-[16/9] w-full max-h-[220px] bg-neutral-950 flex items-center justify-center overflow-hidden">
            <img
              src={value}
              alt="Event flyer preview"
              className="w-full h-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-4">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={handleTriggerPicker}
                disabled={disabled || isUploading}
                className="rounded-xl text-xs gap-1 font-semibold"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Replace Flyer
              </Button>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                onClick={handleRemove}
                disabled={disabled || isUploading}
                className="rounded-xl text-xs gap-1 font-semibold"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </Button>
            </div>
          </div>

          <div className="p-3 flex items-center justify-between border-t border-border-subtle bg-surface-2/60 text-xs">
            <span className="flex items-center gap-1.5 text-success font-medium">
              <Check className="h-3.5 w-3.5" /> Flyer attached
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleTriggerPicker}
                disabled={disabled || isUploading}
                className="h-7 text-xs font-semibold px-2 text-primary"
              >
                Replace
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemove}
                disabled={disabled || isUploading}
                className="h-7 text-xs font-semibold px-2 text-destructive hover:text-destructive"
              >
                Remove
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleTriggerPicker}
          disabled={disabled || isUploading}
          className="w-full border-2 border-dashed border-border-subtle hover:border-primary/60 bg-surface-1 hover:bg-surface-2 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 transition-all group cursor-pointer text-center"
        >
          <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-105 transition-transform">
            {isUploading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <UploadCloud className="h-6 w-6" />
            )}
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">
              {isUploading ? "Uploading Flyer..." : "Upload & Crop Event Flyer"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Drag and drop or click to select image (Max 10MB)
            </p>
          </div>
        </button>
      )}

      {/* Integrated Cropper Dialog */}
      <ImageCropDialog
        open={isCropOpen}
        onOpenChange={(val) => {
          setIsCropOpen(val);
          if (!val && selectedRawImage) {
            URL.revokeObjectURL(selectedRawImage);
            setSelectedRawImage(null);
          }
        }}
        imageSrc={selectedRawImage}
        aspectRatio={16 / 9}
        cropShape="rect"
        title="Crop Event Flyer"
        description="Position and scale the image for high-definition 16:9 campus flyer display."
        outputWidth={1200}
        outputHeight={675}
        outputMimeType="image/webp"
        isSaving={isUploading}
        onCropComplete={handleCropComplete}
      />
    </div>
  );
}
