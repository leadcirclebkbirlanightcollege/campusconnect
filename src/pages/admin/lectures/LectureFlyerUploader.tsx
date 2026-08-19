import { useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { UploadCloud, ExternalLink, Image as ImageIcon, X } from "@/components/icons";

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import type { LectureRow } from "./LectureManagementTab";

function publicFlyerUrl(path: string) {
  const { data } = supabase.storage.from("lecture-flyers").getPublicUrl(path);
  return data.publicUrl;
}

type Props = {
  lecture: LectureRow;
  compact?: boolean;
};

export default function LectureFlyerUploader({ lecture, compact }: Props) {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [localUploading, setLocalUploading] = useState(false);

  const flyerUrl = useMemo(() => {
    if (!lecture.flyer_object_path) return null;
    return publicFlyerUrl(lecture.flyer_object_path);
  }, [lecture.flyer_object_path]);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      setLocalUploading(true);
      const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
      const objectPath = `${lecture.id}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("lecture-flyers")
        .upload(objectPath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || undefined,
        });
      if (uploadError) throw uploadError;

      const { error: updateError } = await supabase
        .from("lectures")
        .update({ flyer_object_path: objectPath })
        .eq("id", lecture.id);
      if (updateError) throw updateError;

      return objectPath;
    },
    onSuccess: async () => {
      toast.success("Flyer uploaded");
      await qc.invalidateQueries({ queryKey: ["admin", "lectures"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to upload flyer"),
    onSettled: () => setLocalUploading(false),
  });

  const clearMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("lectures")
        .update({ flyer_object_path: null })
        .eq("id", lecture.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Flyer removed");
      await qc.invalidateQueries({ queryKey: ["admin", "lectures"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to remove flyer"),
  });

  return (
    <div className={compact ? "flex flex-wrap items-center gap-2" : "flex flex-col gap-2"}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.currentTarget.files?.[0];
          if (!f) return;
          if (f.size > 20 * 1024 * 1024) {
            toast.error("Max file size is 20MB");
            return;
          }
          uploadMutation.mutate(f);
        }}
      />

      {flyerUrl ? (
        <div className={compact ? "flex items-center gap-2" : "flex items-center justify-between gap-2"}>
          <Badge variant="secondary" className="gap-2">
            <ImageIcon className="h-4 w-4" />
            Flyer
          </Badge>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm" className="gap-2">
              <a href={flyerUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4" />
                View
              </a>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => clearMutation.mutate()}
              disabled={clearMutation.isPending}
            >
              <X className="h-4 w-4" />
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => inputRef.current?.click()}
          disabled={localUploading || uploadMutation.isPending}
        >
          <UploadCloud className="h-4 w-4" />
          {localUploading ? "Uploading…" : "Upload flyer"}
        </Button>
      )}
    </div>
  );
}
