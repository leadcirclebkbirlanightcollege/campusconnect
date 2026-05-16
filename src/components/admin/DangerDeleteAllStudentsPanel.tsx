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

type Props = {
  scope: "college" | "platform";
};

/**
 * Unified danger-zone panel used by both:
 *  - Admin → Student Management (scope="college")
 *  - Super Admin → Platform Controls (scope="platform")
 *
 * Hard-deletes every student account (auth + profile + role + owned rows).
 * Two-step confirmation: open dialog + typed confirmation phrase.
 */
export default function DangerDeleteAllStudentsPanel({ scope }: Props) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const fn = scope === "platform" ? "super-admin-reset-students" : "admin-reset-college-students";
  const scopeLabel = scope === "platform" ? "the entire platform" : "this institution";

  const run = async () => {
    if (confirm !== PHRASE) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke(fn, { body: { confirm: PHRASE } });
      if (error) throw new Error(error.message);
      const deleted = (data as { deleted?: number })?.deleted ?? 0;
      toast.success(`${deleted.toLocaleString()} student account${deleted === 1 ? "" : "s"} deleted successfully.`);
      setOpen(false);
      setConfirm("");
    } catch (e) {
      toast.error((e as Error).message ?? "Reset failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-destructive/30 bg-gradient-to-br from-destructive/[0.06] via-destructive/[0.03] to-transparent p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
        <div className="h-9 w-9 rounded-xl bg-destructive/15 text-destructive flex items-center justify-center shrink-0">
          <AlertTriangle className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[14px] font-semibold text-foreground flex items-center gap-2">
            Delete All Students
            <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-destructive/15 text-destructive">
              Danger zone
            </span>
          </h3>
          <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed">
            Permanently deletes every student account, profile, attendance record, points history
            and auth mapping for {scopeLabel}. Admins, faculty and platform settings are preserved.
            This action cannot be undone.
          </p>
          <div className="mt-3">
            <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setConfirm(""); }}>
              <DialogTrigger asChild>
                <Button size="sm" variant="destructive" className="h-9 gap-1.5 w-full sm:w-auto">
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete all students
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-4 w-4" /> Delete All Students
                  </DialogTitle>
                  <DialogDescription className="text-[12.5px] leading-relaxed">
                    This will permanently delete <span className="font-semibold text-foreground">ALL student accounts</span>
                    {" "}and student records for {scopeLabel}. This action <span className="font-semibold text-destructive">CANNOT be undone</span>.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-2">
                  <p className="text-[11.5px] text-muted-foreground">
                    Type <span className="font-mono font-semibold text-foreground">{PHRASE}</span> to confirm.
                  </p>
                  <Input
                    autoFocus
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder={PHRASE}
                    className="font-mono text-[13px]"
                    disabled={busy}
                  />
                </div>
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
