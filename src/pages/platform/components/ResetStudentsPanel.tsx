import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

const PHRASE = "DELETE ALL STUDENTS";

/**
 * Super Admin → Danger Zone → Hard delete every student account on the platform.
 * Two-step confirmation: open dialog + typed confirmation phrase.
 */
export default function ResetStudentsPanel() {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (confirm !== PHRASE) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("super-admin-reset-students", {
        body: { confirm: PHRASE },
      });
      if (error) throw new Error(error.message);
      const deleted = (data as { deleted?: number })?.deleted ?? 0;
      toast.success(`Deleted ${deleted} student account${deleted === 1 ? "" : "s"}`);
      setOpen(false);
      setConfirm("");
    } catch (e) {
      toast.error((e as Error).message ?? "Reset failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-danger/30 bg-danger/[0.04] p-5">
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-xl bg-danger/15 text-danger flex items-center justify-center shrink-0">
          <AlertTriangle className="h-4.5 w-4.5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[14px] font-semibold text-foreground">Reset Student Database</h3>
          <p className="text-[12px] text-muted-foreground mt-0.5 leading-relaxed">
            Permanently deletes every student account, profile, attendance record, points history,
            and auth mapping across the entire platform. Admins, faculty and super admins are preserved.
            This action cannot be undone.
          </p>
          <div className="mt-3">
            <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setConfirm(""); }}>
              <DialogTrigger asChild>
                <Button size="sm" variant="destructive" className="h-8 gap-1.5">
                  <Trash2 className="h-3.5 w-3.5" />
                  Hard delete all students
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-danger">
                    <AlertTriangle className="h-4 w-4" /> Irreversible action
                  </DialogTitle>
                  <DialogDescription className="text-[12px]">
                    Type <span className="font-mono font-semibold text-foreground">{PHRASE}</span> to
                    confirm. Every student record on the platform will be permanently removed.
                  </DialogDescription>
                </DialogHeader>
                <Input
                  autoFocus
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder={PHRASE}
                  className="font-mono text-[13px]"
                  disabled={busy}
                />
                <DialogFooter className="gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={busy}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={run}
                    disabled={busy || confirm !== PHRASE}
                  >
                    {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Trash2 className="h-3.5 w-3.5 mr-1" />}
                    Permanently delete
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </div>
  );
}
