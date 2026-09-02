import React, { useRef, useState, useCallback } from "react";
import {
  Camera,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  Eye,
  ShieldCheck,
  FileCheck2,
  Loader2,
} from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  validateIdImageReadability,
  MAX_ID_FILE_SIZE_BYTES,
  ACCEPTED_ID_EXTENSIONS,
} from "@/lib/college-id-validation";
import { toast } from "sonner";

interface CollegeIdUploadCardProps {
  selectedFile: File | null;
  previewUrl: string | null;
  onFileSelect: (file: File) => void;
  onFileRemove: () => void;
  isUploading?: boolean;
  uploadProgress?: number;
  disabled?: boolean;
  previousRejectionReason?: string | null;
}

export function CollegeIdUploadCard({
  selectedFile,
  previewUrl,
  onFileSelect,
  onFileRemove,
  isUploading = false,
  uploadProgress = 0,
  disabled = false,
  previousRejectionReason,
}: CollegeIdUploadCardProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [showFullPreview, setShowFullPreview] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    async (file: File) => {
      setValidationError(null);
      setIsValidating(true);

      try {
        const result = await validateIdImageReadability(file);
        if (!result.isValid) {
          setValidationError(result.error || "Invalid file");
          toast.error("Invalid ID card image", { description: result.error });
          return;
        }

        onFileSelect(file);
        toast.success("College ID card selected", {
          description: `${file.name} (${(file.size / 1024).toFixed(0)} KB)`,
        });
      } catch {
        const err = "Failed to process image file. Please try again.";
        setValidationError(err);
        toast.error(err);
      } finally {
        setIsValidating(false);
      }
    },
    [onFileSelect]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    // Reset inputs so user can choose the same file again if desired
    e.target.value = "";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !isUploading) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled || isUploading) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  return (
    <div className="space-y-4">
      {/* Previous Rejection Alert (if student is resubmitting) */}
      {previousRejectionReason && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div className="text-[13px] leading-relaxed">
            <p className="font-semibold text-destructive">Previous Verification Rejected</p>
            <p className="text-destructive/90 mt-0.5">
              <span className="font-medium">Admin Feedback:</span> {previousRejectionReason}
            </p>
            <p className="text-[12px] text-muted-foreground mt-1">
              Please review the quality guidelines below and upload a clear, legible photograph of your valid ID card.
            </p>
          </div>
        </div>
      )}

      {/* ID Card Quality Guidance Box */}
      <div className="rounded-xl border border-border-subtle bg-surface-2/60 p-4 space-y-2.5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <span className="text-[12px] font-bold uppercase tracking-wider text-foreground">
            B. K. Birla Night College — ID Requirements
          </span>
        </div>
        <p className="text-[12px] text-muted-foreground leading-relaxed">
          Upload a clear photo of your official college identity card to verify institutional enrollment.
        </p>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] text-muted-foreground">
          <li className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
            <span>Front side of ID card clearly visible</span>
          </li>
          <li className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
            <span>Student full name must be legible</span>
          </li>
          <li className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
            <span>College name / logo visible</span>
          </li>
          <li className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
            <span>Student photograph is clearly shown</span>
          </li>
          <li className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
            <span>Avoid glare, heavy shadows or blur</span>
          </li>
          <li className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
            <span>Entire card corners within frame</span>
          </li>
        </ul>
      </div>

      {/* Hidden file inputs: one for generic file browser, one with capture for mobile camera */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleInputChange}
        disabled={disabled || isUploading}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        className="hidden"
        onChange={handleInputChange}
        disabled={disabled || isUploading}
      />

      {/* File Selected Preview State */}
      {previewUrl && selectedFile ? (
        <div className="rounded-2xl border border-primary/30 bg-surface-1/90 p-4 shadow-md space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileCheck2 className="h-4 w-4 text-primary" />
              <span className="text-[13px] font-semibold text-foreground">Document Ready to Upload</span>
            </div>
            <Badge variant="outline" className="text-[11px] font-mono bg-primary/10 text-primary border-primary/20">
              {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
            </Badge>
          </div>

          <div className="relative group rounded-xl overflow-hidden border border-border-subtle bg-black/5 aspect-[16/10] flex items-center justify-center">
            <img
              src={previewUrl}
              alt="College ID Preview"
              className="w-full h-full object-contain"
            />
            {/* Quick Hover / Tap Overlay with preview button */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-4">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="h-9 gap-1.5 text-[12px] font-medium shadow-lg"
                onClick={() => setShowFullPreview(true)}
              >
                <Eye className="h-3.5 w-3.5" /> Full View
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between text-[12px] text-muted-foreground pt-1">
            <span className="truncate max-w-[200px] sm:max-w-[260px] font-medium text-foreground">
              {selectedFile.name}
            </span>
            <span>{selectedFile.type.replace("image/", "").toUpperCase()}</span>
          </div>

          {/* Action buttons: Replace or Remove */}
          <div className="flex items-center gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1 h-9 gap-1.5 text-[12px] border-border-subtle"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || isUploading}
            >
              <RefreshCw className="h-3.5 w-3.5" /> Replace Photo
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 text-[12px] text-destructive hover:text-destructive border-border-subtle hover:bg-destructive/10"
              onClick={onFileRemove}
              disabled={disabled || isUploading}
            >
              <X className="h-3.5 w-3.5" /> Remove
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-9 px-2.5 text-[12px]"
              onClick={() => setShowFullPreview(true)}
              title="Inspect Full Image"
            >
              <Eye className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Upload Progress Bar if currently submitting */}
          {isUploading && (
            <div className="space-y-1.5 pt-2 border-t border-border-subtle">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Loader2 className="h-3 w-3 animate-spin text-primary" />
                  Encrypting &amp; uploading to secure storage…
                </span>
                <span className="font-mono">{uploadProgress > 0 ? `${uploadProgress}%` : "In progress"}</span>
              </div>
              <div className="h-1.5 w-full bg-surface-2 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300 rounded-full"
                  style={{ width: `${Math.max(uploadProgress, 25)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Empty Upload Zone */
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative rounded-2xl border-2 border-dashed p-6 sm:p-8 text-center transition-all ${
            isDragging
              ? "border-primary bg-primary/5 scale-[0.99]"
              : "border-border-subtle bg-surface-1/60 hover:bg-surface-1 hover:border-primary/40"
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary transition-transform group-hover:scale-105">
              {isValidating ? (
                <Loader2 className="h-7 w-7 animate-spin" />
              ) : (
                <ImageIcon className="h-7 w-7" />
              )}
            </div>

            <div className="space-y-1">
              <p className="text-[14px] font-semibold text-foreground">
                {isValidating ? "Validating ID card image…" : "Take a photo or upload your ID card"}
              </p>
              <p className="text-[12px] text-muted-foreground">
                JPG, JPEG, PNG, or WEBP up to 10 MB
              </p>
            </div>

            {/* Mobile & Desktop Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
              <Button
                type="button"
                className="h-10 px-4 gap-2 text-[13px] font-semibold shadow-sm"
                onClick={() => cameraInputRef.current?.click()}
                disabled={disabled || isValidating || isUploading}
              >
                <Camera className="h-4 w-4" />
                Take Photo
              </Button>

              <Button
                type="button"
                variant="outline"
                className="h-10 px-4 gap-2 text-[13px] font-medium border-border-subtle bg-surface-2 hover:bg-surface-3"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled || isValidating || isUploading}
              >
                <Upload className="h-4 w-4" />
                Browse Gallery
              </Button>
            </div>

            <p className="text-[11px] text-muted-foreground/80 hidden sm:block pt-1">
              or drag &amp; drop your ID card image here
            </p>
          </div>
        </div>
      )}

      {/* Validation Error Banner */}
      {validationError && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 flex items-start gap-2.5 text-destructive text-[12px]">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-semibold">Unable to accept this photo</p>
            <p>{validationError}</p>
          </div>
        </div>
      )}

      {/* Full Preview Modal */}
      <Dialog open={showFullPreview} onOpenChange={setShowFullPreview}>
        <DialogContent className="max-w-2xl p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-[16px] font-semibold flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              College ID Card Inspection Preview
            </DialogTitle>
          </DialogHeader>
          <div className="relative rounded-xl overflow-hidden border border-border-subtle bg-black/5 max-h-[70vh] flex items-center justify-center">
            {previewUrl && (
              <img
                src={previewUrl}
                alt="Full ID Card Preview"
                className="w-full h-auto max-h-[70vh] object-contain rounded-lg"
              />
            )}
          </div>
          <div className="flex items-center justify-between text-[12px] text-muted-foreground pt-2">
            <span>Verify your name, college logo, and photo are easily legible.</span>
            <Button size="sm" variant="outline" onClick={() => setShowFullPreview(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
