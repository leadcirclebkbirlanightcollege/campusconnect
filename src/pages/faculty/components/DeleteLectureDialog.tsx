import { useState } from "react";
import { format, parseISO } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Trash2,
  AlertTriangle,
  Calendar,
  Clock,
  MapPin,
  BookOpen,
  Radio,
  Loader2,
} from "@/components/icons";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export interface LectureToDelete {
  id: string;
  topic: string;
  lecture_date: string;
  start_time: string;
  end_time: string;
  venue: string;
  status: string;
  faculty_name?: string;
}

interface DeleteLectureDialogProps {
  lecture: LectureToDelete | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export default function DeleteLectureDialog({
  lecture,
  open,
  onOpenChange,
  onSuccess,
}: DeleteLectureDialogProps) {
  const qc = useQueryClient();
  const [isDeleting, setIsDeleting] = useState(false);

  if (!lecture) return null;

  const isLive = lecture.status === "live";

  let dateFormatted = lecture.lecture_date;
  try {
    dateFormatted = format(parseISO(lecture.lecture_date), "EEEE, MMMM d, yyyy");
  } catch {
    // Keep raw if unparseable
  }

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const { data, error } = await supabase.rpc("faculty_delete_lecture", {
        p_lecture_id: lecture.id,
      });

      if (error) throw error;

      toast.success("Lecture deleted", {
        description: `"${lecture.topic}" has been permanently removed.`,
      });

      onOpenChange(false);
      await qc.invalidateQueries({ queryKey: ["faculty"] });
      onSuccess?.();
    } catch (err: any) {
      console.error("Failed to delete lecture:", err);
      toast.error("Deletion failed", {
        description:
          err.message?.includes("permission_denied")
            ? "You are not authorized to delete this lecture."
            : err.message || "Failed to delete lecture. Please try again.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !isDeleting && onOpenChange(val)}>
      <DialogContent className="max-w-md p-0 overflow-hidden border-destructive/20 bg-card">
        {/* Header with Warning Accent */}
        <div className="p-6 bg-destructive/5 border-b border-destructive/15">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-destructive/15 text-destructive flex items-center justify-center shrink-0">
              <Trash2 className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Delete Lecture?
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                This action cannot be undone and will permanently remove this session.
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Content Body with Lecture Details */}
        <div className="p-6 space-y-4">
          {/* Active Attendance Warning */}
          {isLive && (
            <div className="rounded-xl border border-warning/30 bg-warning/10 p-3.5 flex items-start gap-2.5 text-warning text-xs">
              <Radio className="h-4 w-4 shrink-0 mt-0.5 animate-pulse text-warning" />
              <div>
                <p className="font-bold text-warning-foreground">
                  Active Attendance Session Detected
                </p>
                <p className="text-muted-foreground mt-0.5 leading-relaxed">
                  This class is currently <strong>LIVE</strong>. Deleting it will immediately terminate the attendance session and invalidate any active QR codes and OTPs.
                </p>
              </div>
            </div>
          )}

          {/* Details Card */}
          <div className="rounded-xl border border-border/50 bg-muted/20 p-4 space-y-2.5 text-xs">
            <div className="flex items-start gap-2">
              <BookOpen className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <span className="text-[11px] text-muted-foreground block">Subject / Topic</span>
                <span className="font-bold text-foreground text-[13px]">{lecture.topic}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/30">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <div>
                  <span className="text-[10px] text-muted-foreground block">Date</span>
                  <span className="font-medium text-foreground">{dateFormatted}</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <div>
                  <span className="text-[10px] text-muted-foreground block">Time</span>
                  <span className="font-medium text-foreground">
                    {lecture.start_time?.slice(0, 5)} – {lecture.end_time?.slice(0, 5)}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/30">
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <div>
                  <span className="text-[10px] text-muted-foreground block">Venue / Room</span>
                  <span className="font-medium text-foreground">{lecture.venue}</span>
                </div>
              </div>

              {lecture.faculty_name && (
                <div>
                  <span className="text-[10px] text-muted-foreground block">Faculty</span>
                  <span className="font-medium text-foreground">{lecture.faculty_name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Confirmation Notice */}
          <p className="text-[11px] text-muted-foreground text-center">
            Confirming will invalidate any active attendance tokens and delete associated records.
          </p>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-muted/10 border-t border-border/40 flex items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
            className="rounded-xl text-xs"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={isDeleting}
            className="rounded-xl text-xs gap-1.5 font-semibold shadow-xs"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Deleting…
              </>
            ) : (
              <>
                <Trash2 className="h-3.5 w-3.5" />
                Delete Lecture
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
