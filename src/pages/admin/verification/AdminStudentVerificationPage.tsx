import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Search, CheckCircle2, XCircle, Loader2, Image as ImageIcon, Clock,
  Sparkles, RefreshCw, GraduationCap, Building2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type Pending = {
  user_id: string; name: string; email: string;
  avatar_url: string | null; phone: string | null;
  enrollment_number: string | null; student_id: string | null;
  course_name: string | null; course_code: string | null;
  academic_year: string | null; date_of_birth: string | null;
  gender: string | null; approval_status: string;
  profile_submitted_at: string | null; created_at: string;
};

const ERROR_MAP: Record<string, string> = {
  permission_denied: "You don't have permission to perform this action.",
  invalid_input: "Please assign a college before approving.",
  student_not_found: "Student profile not found.",
  onboarding_incomplete: "Student hasn't completed onboarding yet.",
  already_approved: "This student is already approved.",
  missing_enrollment: "Student is missing an enrollment number.",
  duplicate_enrollment: "Another approved student already uses this enrollment number.",
  department_not_found: "No matching department exists in this college for the student's course.",
  class_not_found: "Could not resolve a class for this student. Try regenerating classes.",
};
function friendly(err: any): string {
  const raw = String(err?.message ?? "").trim();
  const key = raw.split(":")[0]?.trim();
  return ERROR_MAP[key] ?? raw ?? "Something went wrong.";
}

export default function AdminStudentVerificationPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [target, setTarget] = useState<Pending | null>(null);
  const [mode, setMode] = useState<"approve" | "reject" | "photo" | null>(null);
  const [collegeId, setCollegeId] = useState("");
  const [studentIdOverride, setStudentIdOverride] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [regenBusy, setRegenBusy] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const [previewBusy, setPreviewBusy] = useState(false);

  const { data: colleges = [] } = useQuery({
    queryKey: ["verification", "colleges"],
    queryFn: async () => {
      const { data } = await supabase
        .from("colleges").select("id, college_name")
        .eq("is_active", true).order("college_name");
      return data ?? [];
    },
    staleTime: 300_000,
  });

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["verification", "pending", search],
    staleTime: 15_000,
    queryFn: async () => {
      let q = supabase
        .from("profiles")
        .select("user_id,name,email,avatar_url,phone,enrollment_number,student_id,course_name,course_code,academic_year,date_of_birth,gender,approval_status,profile_submitted_at,created_at")
        .eq("profile_completed", true)
        .in("approval_status", ["pending", "rejected"])
        .order("profile_submitted_at", { ascending: false, nullsFirst: false })
        .limit(200);
      if (search.trim()) {
        const term = `%${search.trim()}%`;
        q = q.or(`name.ilike.${term},email.ilike.${term},enrollment_number.ilike.${term}`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Pending[];
    },
  });

  // Auto-preview when college changes
  useEffect(() => {
    if (mode !== "approve" || !target || !collegeId) { setPreview(null); return; }
    let cancelled = false;
    setPreviewBusy(true);
    (async () => {
      try {
        const { data, error } = await supabase.rpc("admin_preview_student_assignment", {
          p_user_id: target.user_id, p_college_id: collegeId,
        });
        if (cancelled) return;
        if (error) setPreview({ ok: false, error: error.message });
        else setPreview(data);
      } finally {
        if (!cancelled) setPreviewBusy(false);
      }
    })();
    return () => { cancelled = true; };
  }, [mode, target, collegeId]);

  function openApprove(p: Pending) {
    setTarget(p); setCollegeId(""); setPreview(null);
    setStudentIdOverride(p.student_id ?? ""); setMode("approve");
  }
  function openReject(p: Pending) { setTarget(p); setReason(""); setMode("reject"); }

  async function submitApprove() {
    if (!target || !collegeId) return;
    setBusy(true);
    try {
      const { error } = await supabase.rpc("admin_approve_student", {
        p_user_id: target.user_id, p_college_id: collegeId,
        p_student_id: studentIdOverride.trim() || null,
      });
      if (error) throw error;
      toast.success(`${target.name} approved`, {
        description: preview?.ok ? `Assigned to ${preview.department_name} · ${preview.class_name}` : undefined,
      });
      setMode(null); setTarget(null);
      qc.invalidateQueries({ queryKey: ["verification"] });
    } catch (e: any) {
      toast.error(friendly(e));
    } finally { setBusy(false); }
  }

  async function submitReject() {
    if (!target) return;
    setBusy(true);
    try {
      const { error } = await supabase.rpc("admin_reject_student", {
        p_user_id: target.user_id, p_reason: reason.trim() || null,
      });
      if (error) throw error;
      toast.success(`${target.name} rejected`);
      setMode(null); setTarget(null);
      qc.invalidateQueries({ queryKey: ["verification"] });
    } catch (e: any) { toast.error(friendly(e)); } finally { setBusy(false); }
  }

  async function regenerateClasses() {
    setRegenBusy(true);
    try {
      const { data, error } = await supabase.rpc("admin_regenerate_classes");
      if (error) throw error;
      const n = (data as any)?.departments_processed ?? 0;
      toast.success(`Regenerated FY/SY/TY classes`, { description: `${n} department(s) processed.` });
    } catch (e: any) { toast.error(friendly(e)); } finally { setRegenBusy(false); }
  }

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-[1400px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
        <div>
          <h1 className="text-[20px] md:text-[22px] font-semibold tracking-tight">Pending Student Verification</h1>
          <p className="text-[13px] text-muted-foreground">
            Verify enrollment, assign college — department &amp; class are auto-resolved. {rows.length} item{rows.length !== 1 && "s"}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={regenerateClasses}
            disabled={regenBusy}
            className="h-9 gap-2"
          >
            {regenBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Regenerate Classes
          </Button>
          <div className="relative w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, enrollment…"
              className="pl-9 h-9"
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border-subtle bg-surface-1 overflow-hidden">
        <div className="hidden md:grid grid-cols-[60px_1.4fr_1.2fr_1fr_120px_140px_200px] gap-3 px-4 py-2.5 bg-surface-2 border-b border-border-subtle text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
          <div>Photo</div><div>Student</div><div>Enrollment</div>
          <div>Course / Year</div><div>Status</div><div>Submitted</div>
          <div className="text-right">Actions</div>
        </div>

        {isLoading ? (
          <div className="p-10 flex items-center justify-center text-muted-foreground gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground text-[13px]">
            No pending verifications.
          </div>
        ) : rows.map((p) => (
          <div
            key={p.user_id}
            className="md:grid md:grid-cols-[60px_1.4fr_1.2fr_1fr_120px_140px_200px] flex flex-col gap-3 px-4 py-3 border-b border-border-subtle hover:bg-surface-2/50 transition-colors md:items-center"
          >
            <button
              onClick={() => { setTarget(p); setMode("photo"); }}
              className="h-10 w-10 rounded-full overflow-hidden bg-surface-2 border border-border-subtle flex items-center justify-center self-start"
            >
              {p.avatar_url
                ? <img src={p.avatar_url} alt="" className="h-full w-full object-cover" />
                : <ImageIcon className="h-4 w-4 text-muted-foreground" />}
            </button>
            <div className="min-w-0">
              <p className="text-[13px] font-medium truncate">{p.name}</p>
              <p className="text-[11px] text-muted-foreground truncate">{p.email}</p>
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-mono">{p.enrollment_number ?? "—"}</p>
              {p.phone && <p className="text-[11px] text-muted-foreground">{p.phone}</p>}
            </div>
            <div className="text-[12px]">
              <p className="truncate">{p.course_name ?? "—"}</p>
              <p className="text-muted-foreground">{p.academic_year ?? "—"}</p>
            </div>
            <div>
              {p.approval_status === "rejected"
                ? <Badge variant="destructive" className="text-[10px]">Rejected</Badge>
                : <Badge variant="secondary" className="text-[10px] gap-1"><Clock className="h-3 w-3" />Pending</Badge>}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {p.profile_submitted_at
                ? formatDistanceToNow(new Date(p.profile_submitted_at), { addSuffix: true })
                : "—"}
            </div>
            <div className="flex gap-1.5 md:justify-end">
              <Button
                size="sm" variant="outline"
                className="h-9 gap-1.5 border-border-subtle"
                onClick={() => openReject(p)}
              >
                <XCircle className="h-3.5 w-3.5" /> Reject
              </Button>
              <Button
                size="sm"
                className="h-9 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                onClick={() => openApprove(p)}
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> Approve
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Approve dialog */}
      <Dialog open={mode === "approve"} onOpenChange={(o) => !o && setMode(null)}>
        <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Approve {target?.name}</DialogTitle>
            <DialogDescription>
              Assign a college — department &amp; class are resolved automatically.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="rounded-lg border border-border-subtle bg-surface-2 p-3 text-[12px] space-y-0.5">
              <p><span className="text-muted-foreground">Enrollment:</span> <span className="font-mono">{target?.enrollment_number}</span></p>
              <p><span className="text-muted-foreground">Course:</span> {target?.course_name} ({target?.course_code})</p>
              <p><span className="text-muted-foreground">Year:</span> {target?.academic_year}</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[13px]">Assign College <span className="text-red-500">*</span></Label>
              <Select value={collegeId} onValueChange={setCollegeId}>
                <SelectTrigger><SelectValue placeholder="Select college" /></SelectTrigger>
                <SelectContent>
                  {colleges.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.college_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Auto-assignment preview */}
            {collegeId && (
              <div className="rounded-lg border border-border-subtle bg-surface-2 p-3 space-y-2">
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">
                  <Sparkles className="h-3.5 w-3.5" /> Auto-Assignment Preview
                </div>
                {previewBusy ? (
                  <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Resolving…
                  </div>
                ) : preview?.ok ? (
                  <div className="space-y-1.5 text-[13px]">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">Department:</span>
                      <span className="font-medium">{preview.department_name}</span>
                      <Badge className="ml-auto bg-emerald-600/15 text-emerald-400 border-emerald-600/30 text-[10px]">Auto</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">Class:</span>
                      <span className="font-medium">{preview.class_name}</span>
                      <Badge className="ml-auto bg-emerald-600/15 text-emerald-400 border-emerald-600/30 text-[10px]">Auto</Badge>
                    </div>
                  </div>
                ) : (
                  <p className="text-[12px] text-amber-400">
                    {friendly({ message: preview?.error ?? "preview_failed" })}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-[13px]">College Student ID (optional)</Label>
              <Input
                value={studentIdOverride}
                onChange={(e) => setStudentIdOverride(e.target.value)}
                placeholder="e.g. CS-2024-001"
              />
            </div>
          </div>

          <DialogFooter className="sticky bottom-0 bg-background pt-2">
            <Button variant="outline" onClick={() => setMode(null)} className="border-border-subtle">
              Cancel
            </Button>
            <Button
              onClick={submitApprove}
              disabled={!collegeId || busy || (preview && preview.ok === false)}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white disabled:bg-gray-700 disabled:text-gray-300 disabled:opacity-70"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Approve Student
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={mode === "reject"} onOpenChange={(o) => !o && setMode(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject {target?.name}</DialogTitle>
            <DialogDescription>
              The student will be able to update and resubmit their details.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 py-2">
            <Label className="text-[13px]">Reason (optional)</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Enrollment number invalid" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMode(null)} className="border-border-subtle">Cancel</Button>
            <Button
              onClick={submitReject}
              disabled={busy}
              className="gap-2 bg-red-600 hover:bg-red-700 text-white"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Photo viewer */}
      <Dialog open={mode === "photo"} onOpenChange={(o) => !o && setMode(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{target?.name}</DialogTitle>
            <DialogDescription>{target?.email}</DialogDescription>
          </DialogHeader>
          {target?.avatar_url
            ? <img src={target.avatar_url} alt="" className="w-full rounded-xl" />
            : <div className="aspect-square flex items-center justify-center bg-surface-2 rounded-xl text-muted-foreground">No photo</div>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
