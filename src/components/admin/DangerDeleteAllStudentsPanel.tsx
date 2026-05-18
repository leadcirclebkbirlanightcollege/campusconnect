import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, CheckCircle2, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

const PHRASE = "DELETE ALL STUDENTS";

type Props = {
  scope: "college" | "platform";
};

type ResetResponse = {
  deleted: number;
  total_targets?: number;
  scope?: string;
  college_id?: string | null;
  table_counts?: Record<string, number>;
  role_deleted?: number;
  profile_deleted?: number;
  table_errors?: Record<string, string>;
  auth_errors?: string[];
  message?: string;
};

/**
 * Unified hard-delete danger panel.
 *  - Admin (scope="college")   → wipes students for caller's college only.
 *  - Super Admin (scope="platform") → choose ALL platform or a specific college.
 *
 * Hard-deletes every student account: auth user + profile + role + all owned rows
 * (attendance, points, claims, notifications, sessions, intelligence, etc.).
 */
export default function DangerDeleteAllStudentsPanel({ scope }: Props) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [collegeId, setCollegeId] = useState<string>("__all__");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ResetResponse | null>(null);

  const isPlatform = scope === "platform";
  const fn = isPlatform ? "super-admin-reset-students" : "admin-reset-college-students";

  // Super admin: load colleges for optional scoping
  const collegesQ = useQuery({
    enabled: isPlatform,
    queryKey: ["sa_reset_colleges"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("colleges")
        .select("id, college_name")
        .order("college_name", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });

  const selectedCollegeName = collegesQ.data?.find((c) => c.id === collegeId)?.college_name;
  const scopeLabel = isPlatform
    ? collegeId === "__all__"
      ? "the entire platform"
      : `the institution “${selectedCollegeName ?? "selected college"}”`
    : "this institution";

  const reset = () => {
    setConfirm("");
    setResult(null);
  };

  const run = async () => {
    if (confirm !== PHRASE) return;
    setBusy(true);
    try {
      const payload: Record<string, unknown> = { confirm: PHRASE };
      if (isPlatform && collegeId !== "__all__") payload.college_id = collegeId;

      const { data, error } = await supabase.functions.invoke(fn, { body: payload });
      if (error) {
        const msg = (data as { error?: string; step?: string })?.error
          ?? error.message
          ?? "Reset failed";
        const step = (data as { step?: string })?.step;
        throw new Error(step ? `${msg} (step: ${step})` : msg);
      }
      const res = (data ?? {}) as ResetResponse;
      setResult(res);
      const deleted = res.deleted ?? 0;
      toast.success(`${deleted.toLocaleString()} student account${deleted === 1 ? "" : "s"} deleted.`);
    } catch (e) {
      toast.error((e as Error).message ?? "Reset failed");
    } finally {
      setBusy(false);
    }
  };

  const tableSummary = result?.table_counts
    ? Object.entries(result.table_counts).filter(([, n]) => n > 0)
    : [];

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
              Hard delete
            </span>
          </h3>
          <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed">
            Permanently removes every student account, profile, attendance record, points history,
            notifications, sessions and auth mapping for {scopeLabel}. Admins, faculty, departments,
            programmes and platform settings are preserved. This action cannot be undone.
          </p>
          <div className="mt-3">
            <Dialog
              open={open}
              onOpenChange={(o) => { setOpen(o); if (!o) { reset(); } }}
            >
              <DialogTrigger asChild>
                <Button size="sm" variant="destructive" className="h-9 gap-1.5 w-full sm:w-auto">
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete all students
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-4 w-4" /> Delete All Students
                  </DialogTitle>
                  <DialogDescription className="text-[12.5px] leading-relaxed">
                    This will permanently delete <span className="font-semibold text-foreground">ALL student accounts</span>
                    {" "}and student-owned records for {scopeLabel}.{" "}
                    <span className="font-semibold text-destructive">This action CANNOT be undone.</span>
                  </DialogDescription>
                </DialogHeader>

                {!result && (
                  <div className="space-y-3">
                    {isPlatform && (
                      <div className="space-y-1.5">
                        <p className="text-[11.5px] font-medium text-foreground">Scope</p>
                        <Select value={collegeId} onValueChange={setCollegeId} disabled={busy}>
                          <SelectTrigger className="h-9 text-[13px]">
                            <SelectValue placeholder="Choose scope" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__all__">All colleges (entire platform)</SelectItem>
                            {(collegesQ.data ?? []).map((c) => (
                              <SelectItem key={c.id} value={c.id}>{c.college_name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div className="space-y-1.5">
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
                  </div>
                )}

                {result && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-success">
                      <CheckCircle2 className="h-4 w-4" />
                      <p className="text-[13px] font-semibold">Student database cleared successfully</p>
                    </div>
                    <div className="rounded-lg border border-border-subtle bg-surface-1 p-3 space-y-1.5 text-[12px]">
                      <Row label="Auth accounts removed" value={result.deleted ?? 0} />
                      <Row label="Profiles removed" value={result.profile_deleted ?? 0} />
                      <Row label="Role mappings removed" value={result.role_deleted ?? 0} />
                      <Row label="Total targets" value={result.total_targets ?? 0} muted />
                    </div>
                    {tableSummary.length > 0 && (
                      <div className="rounded-lg border border-border-subtle bg-surface-1 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                          Dependent records removed
                        </p>
                        <div className="space-y-1 max-h-48 overflow-y-auto">
                          {tableSummary.map(([table, n]) => (
                            <Row key={table} label={table} value={n} mono />
                          ))}
                        </div>
                      </div>
                    )}
                    {result.table_errors && Object.keys(result.table_errors).length > 0 && (
                      <div className="rounded-lg border border-warning/40 bg-warning/5 p-3 space-y-1 text-[11.5px]">
                        <p className="font-semibold text-warning">Some tables reported errors:</p>
                        {Object.entries(result.table_errors).map(([t, err]) => (
                          <p key={t} className="font-mono text-[11px] text-foreground/80 break-words">
                            {t}: {err}
                          </p>
                        ))}
                      </div>
                    )}
                    {result.auth_errors && result.auth_errors.length > 0 && (
                      <div className="rounded-lg border border-warning/40 bg-warning/5 p-3 space-y-1 text-[11.5px]">
                        <p className="font-semibold text-warning">Auth user deletion errors (first {result.auth_errors.length}):</p>
                        {result.auth_errors.map((e, i) => (
                          <p key={i} className="font-mono text-[11px] text-foreground/80 break-words">{e}</p>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <DialogFooter className="gap-2">
                  {result ? (
                    <Button size="sm" onClick={() => { setOpen(false); reset(); }}>
                      Done
                    </Button>
                  ) : (
                    <>
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
                    </>
                  )}
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, mono, muted }: { label: string; value: number; mono?: boolean; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={`${mono ? "font-mono text-[11px]" : "text-[12px]"} ${muted ? "text-muted-foreground" : "text-foreground/80"}`}>
        {label}
      </span>
      <span className="tabular-nums font-semibold text-[12px] text-foreground">
        {value.toLocaleString()}
      </span>
    </div>
  );
}
