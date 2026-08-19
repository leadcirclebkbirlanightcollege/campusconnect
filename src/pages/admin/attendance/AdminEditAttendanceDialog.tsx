import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, AlertTriangle } from "@/components/icons";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  attendanceId: string;
  studentName: string;
  currentStatus: string;
  lectureId: string;
};

export default function AdminEditAttendanceDialog({
  attendanceId,
  studentName,
  currentStatus,
  lectureId,
}: Props) {
  const [open, setOpen] = useState(false);
  const [newStatus, setNewStatus] = useState(currentStatus === "present" ? "absent" : "present");
  const [reason, setReason] = useState("");
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-update-attendance", {
        body: { attendanceId, newStatus, reason: reason.trim() },
      });
      if (error) throw new Error(error.message);
      if (data && !data.success) throw new Error(data.error || "Update failed");
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Attendance updated: ${data.old_status} → ${data.new_status}`);
      setOpen(false);
      setReason("");
      qc.invalidateQueries({ queryKey: ["admin", "attendance"] });
      qc.invalidateQueries({ queryKey: ["admin", "overview"] });
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : "Failed to update attendance");
    },
  });

  const canSubmit = reason.trim().length >= 3 && newStatus !== currentStatus;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 h-7 px-2">
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Edit Historical Attendance
          </DialogTitle>
          <DialogDescription>
            This will modify historical attendance for <strong>{studentName}</strong> and recalculate their intelligence scores.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Current status</span>
            <Badge variant={currentStatus === "present" ? "default" : "secondary"}>
              {currentStatus}
            </Badge>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">New Status</label>
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="present">Present</SelectItem>
                <SelectItem value="absent">Absent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Reason <span className="text-destructive">*</span>
            </label>
            <Textarea
              placeholder="Why is this attendance being modified? (min 3 chars)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>

          {newStatus === currentStatus && (
            <p className="text-xs text-muted-foreground">Status is already {currentStatus}. Select a different status.</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!canSubmit || mutation.isPending}
          >
            {mutation.isPending ? "Updating…" : "Confirm Edit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
