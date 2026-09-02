import { useEffect, useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Search,
  CheckCircle2,
  XCircle,
  Loader2,
  Image as ImageIcon,
  Clock,
  Sparkles,
  RefreshCw,
  GraduationCap,
  Building2,
  ShieldCheck,
  Plus,
  Minus,
  RotateCcw,
  Eye,
  FileCheck2,
  AlertCircle,
  User as UserIcon,
} from "@/components/icons";
import { formatDistanceToNow, format } from "date-fns";

type Pending = {
  user_id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  phone: string | null;
  enrollment_number: string | null;
  student_id: string | null;
  course_name: string | null;
  course_code: string | null;
  academic_year: string | null;
  date_of_birth: string | null;
  gender: string | null;
  approval_status: string;
  profile_submitted_at: string | null;
  created_at: string;
  id_card_path: string | null;
  id_card_status: string | null;
  id_card_rejection_reason: string | null;
  rejection_reason: string | null;
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

const PRESET_REJECTION_REASONS = [
  "ID card photograph is blurry or illegible. Please upload a clear photo.",
  "Not an official B. K. Birla Night Arts, Science & Commerce College ID card.",
  "Student name on ID card does not match registered account name.",
  "ID card is expired or has incorrect academic session.",
  "Card is partially cropped or details are obscured.",
];

export default function AdminStudentVerificationPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"pending" | "rejected" | "all">("pending");
  const [target, setTarget] = useState<Pending | null>(null);
  const [mode, setMode] = useState<"approve" | "reject" | "inspect" | "photo" | null>(null);

  // Approval state
  const [collegeId, setCollegeId] = useState("");
  const [studentIdOverride, setStudentIdOverride] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [regenBusy, setRegenBusy] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const [previewBusy, setPreviewBusy] = useState(false);

  // ID Card Viewer state
  const [idCardSignedUrl, setIdCardSignedUrl] = useState<string | null>(null);
  const [idCardLoading, setIdCardLoading] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);

  // Colleges query
  const { data: colleges = [] } = useQuery({
    queryKey: ["verification", "colleges"],
    queryFn: async () => {
      const { data } = await supabase
        .from("colleges")
        .select("id, college_name")
        .eq("is_active", true)
        .order("college_name");
      return data ?? [];
    },
    staleTime: 300_000,
  });

  // Pending students query
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["verification", "pending", search],
    staleTime: 15_000,
    queryFn: async () => {
      // Opportunistic data minimization: purge expired rejected accounts
      supabase.rpc("cleanup_expired_rejected_students").catch(() => {});

      let q = supabase
        .from("profiles")
        .select(
          "user_id,name,email,avatar_url,phone,enrollment_number,student_id,course_name,course_code,academic_year,date_of_birth,gender,approval_status,profile_submitted_at,created_at,id_card_path,id_card_status,id_card_rejection_reason,rejection_reason,rejected_at,delete_after"
        )
        .eq("profile_completed", true)
        .in("approval_status", ["pending", "rejected"])
        .order("profile_submitted_at", { ascending: false, nullsFirst: false })
        .limit(200);

      if (search.trim()) {
        const term = `%${search.trim()}%`;
        q = q.or(
          `name.ilike.${term},email.ilike.${term},enrollment_number.ilike.${term},course_name.ilike.${term}`
        );
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Pending[];
    },
  });

  // Filter rows based on active tab
  const filteredRows = useMemo(() => {
    if (activeTab === "pending") return rows.filter((r) => r.approval_status === "pending");
    if (activeTab === "rejected") return rows.filter((r) => r.approval_status === "rejected");
    return rows;
  }, [rows, activeTab]);

  const pendingCount = useMemo(() => rows.filter((r) => r.approval_status === "pending").length, [rows]);
  const rejectedCount = useMemo(() => rows.filter((r) => r.approval_status === "rejected").length, [rows]);

  // Auto-preview when college changes
  useEffect(() => {
    if (mode !== "approve" || !target || !collegeId) {
      setPreview(null);
      return;
    }
    let cancelled = false;
    setPreviewBusy(true);
    (async () => {
      try {
        const { data, error } = await supabase.rpc("admin_preview_student_assignment", {
          p_user_id: target.user_id,
          p_college_id: collegeId,
        });
        if (cancelled) return;
        if (error) setPreview({ ok: false, error: error.message });
        else setPreview(data);
      } finally {
        if (!cancelled) setPreviewBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, target, collegeId]);

  // Generate signed URL when inspecting an ID card
  async function openInspect(p: Pending) {
    setTarget(p);
    setMode("inspect");
    setZoomLevel(1);
    setRotation(0);
    setIdCardSignedUrl(null);

    if (p.id_card_path) {
      setIdCardLoading(true);
      try {
        const { data, error } = await supabase.storage
          .from("student-id-cards")
          .createSignedUrl(p.id_card_path, 600);

        if (!error && data?.signedUrl) {
          setIdCardSignedUrl(data.signedUrl);
        } else {
          toast.error("Unable to load ID card image from secure storage");
        }
      } catch {
        toast.error("Failed to generate secure URL");
      } finally {
        setIdCardLoading(false);
      }
    }
  }

  function openApprove(p: Pending) {
    setTarget(p);
    const defaultCollege =
      colleges.find((c: any) => c.college_name?.toLowerCase().includes("birla"))?.id ||
      colleges[0]?.id ||
      "";
    setCollegeId(defaultCollege);
    setPreview(null);
    setStudentIdOverride(p.student_id ?? "");
    setMode("approve");
  }

  function openReject(p: Pending) {
    setTarget(p);
    setReason("");
    setMode("reject");
  }

  async function submitApprove() {
    if (!target || !collegeId) return;
    setBusy(true);
    const photoToPurge = target.id_card_path;
    try {
      const { error } = await supabase.rpc("admin_approve_student", {
        p_user_id: target.user_id,
        p_college_id: collegeId,
        p_student_id: studentIdOverride.trim() || null,
      });
      if (error) throw error;

      // Data Minimization: purge physical College ID card photo from storage once approved
      if (photoToPurge) {
        supabase.storage
          .from("student-id-cards")
          .remove([photoToPurge])
          .catch((cleanupErr) => {
            console.warn("Storage deletion deferred:", cleanupErr);
          });
      }

      toast.success(`${target.name} approved! 🎉`, {
        description: preview?.ok
          ? `Assigned to ${preview.department_name} · ${preview.class_name}`
          : "Student account activated and ID card purged from storage.",
      });
      setMode(null);
      setTarget(null);
      qc.invalidateQueries({ queryKey: ["verification"] });
    } catch (e: any) {
      toast.error(friendly(e));
    } finally {
      setBusy(false);
    }
  }

  async function submitReject() {
    if (!target) return;
    setBusy(true);
    try {
      const { error } = await supabase.rpc("admin_reject_student", {
        p_user_id: target.user_id,
        p_reason: reason.trim() || null,
      });
      if (error) throw error;
      toast.error(`${target.name} verification rejected`, {
        description: "Account will be permanently deleted after 2 minutes per retention policy.",
      });
      setMode(null);
      setTarget(null);
      qc.invalidateQueries({ queryKey: ["verification"] });
    } catch (e: any) {
      toast.error(friendly(e));
    } finally {
      setBusy(false);
    }
  }

  async function regenerateClasses() {
    setRegenBusy(true);
    try {
      const { data, error } = await supabase.rpc("admin_regenerate_classes");
      if (error) throw error;
      const n = (data as any)?.departments_processed ?? 0;
      toast.success("Regenerated FY/SY/TY classes", {
        description: `${n} department(s) processed.`,
      });
    } catch (e: any) {
      toast.error(friendly(e));
    } finally {
      setRegenBusy(false);
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-[1400px] mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[20px] md:text-[22px] font-bold tracking-tight">
              Student College ID Verification
            </h1>
            <Badge variant="secondary" className="font-mono text-[11px]">
              {rows.length} Total
            </Badge>
          </div>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            Verify College ID cards, review enrollment details, and grant official institutional access.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={regenerateClasses}
            disabled={regenBusy}
            className="h-9 gap-2 border-border-subtle"
          >
            {regenBusy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Regenerate Cohorts
          </Button>

          <div className="relative w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, PRN…"
              className="pl-9 h-9 text-[13px]"
            />
          </div>
        </div>
      </div>

      {/* Tabs Filter */}
      <div className="flex items-center justify-between border-b border-border-subtle pb-2">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="h-9 bg-surface-2 p-1 border border-border-subtle rounded-lg">
            <TabsTrigger value="pending" className="text-[12px] font-semibold gap-1.5 px-3">
              <Clock className="h-3.5 w-3.5" />
              Pending Review
              <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
                {pendingCount}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="rejected" className="text-[12px] font-semibold gap-1.5 px-3">
              <AlertCircle className="h-3.5 w-3.5 text-destructive" />
              Needs Correction
              <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
                {rejectedCount}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="all" className="text-[12px] font-semibold px-3">
              All Submissions ({rows.length})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Queue Table */}
      <div className="rounded-xl border border-border-subtle bg-surface-1 overflow-hidden shadow-sm">
        <div className="hidden md:grid grid-cols-[80px_1.4fr_1.1fr_1fr_120px_130px_220px] gap-3 px-4 py-2.5 bg-surface-2 border-b border-border-subtle text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
          <div>College ID</div>
          <div>Student</div>
          <div>Course / Year</div>
          <div>Enrollment / ID</div>
          <div>Status</div>
          <div>Submitted</div>
          <div className="text-right">Actions</div>
        </div>

        {isLoading ? (
          <div className="p-12 flex items-center justify-center text-muted-foreground gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" /> Loading verifications…
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-[13px] space-y-1">
            <CheckCircle2 className="h-8 w-8 text-success mx-auto mb-2" />
            <p className="font-semibold text-foreground">No verification requests found</p>
            <p className="text-[12px]">All student submissions have been reviewed.</p>
          </div>
        ) : (
          filteredRows.map((p) => (
            <div
              key={p.user_id}
              className="md:grid md:grid-cols-[80px_1.4fr_1.1fr_1fr_120px_130px_220px] flex flex-col gap-3 px-4 py-3 border-b border-border-subtle hover:bg-surface-2/40 transition-colors md:items-center"
            >
              {/* ID Card Thumbnail Trigger */}
              <div>
                {p.id_card_path ? (
                  <button
                    type="button"
                    onClick={() => openInspect(p)}
                    className="relative group h-12 w-16 rounded-lg overflow-hidden border border-primary/25 bg-surface-2 flex items-center justify-center transition-all hover:scale-105 hover:shadow-md cursor-pointer"
                    title="Click to inspect College ID card"
                  >
                    <div className="absolute inset-0 bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <ShieldCheck className="h-5 w-5 text-primary" />
                    </div>
                    <span className="absolute bottom-0.5 right-0.5 bg-black/60 text-white rounded p-0.5 text-[9px]">
                      <Eye className="h-2.5 w-2.5" />
                    </span>
                  </button>
                ) : (
                  <Badge variant="outline" className="text-[10px] text-muted-foreground">
                    No Card
                  </Badge>
                )}
              </div>

              {/* Student Identity */}
              <div className="min-w-0 flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setTarget(p);
                    setMode("photo");
                  }}
                  className="h-9 w-9 rounded-full overflow-hidden bg-surface-2 border border-border-subtle shrink-0 flex items-center justify-center cursor-pointer"
                >
                  {p.avatar_url ? (
                    <img src={p.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <UserIcon className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-foreground truncate">{p.name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{p.email}</p>
                </div>
              </div>

              {/* Course & Year */}
              <div className="text-[12px] min-w-0">
                <p className="font-medium truncate">{p.course_name ?? "General"}</p>
                <p className="text-[11px] text-muted-foreground font-semibold">
                  Year: {p.academic_year ?? "—"}
                </p>
              </div>

              {/* MU Enrollment / Student ID */}
              <div className="min-w-0 text-[12px]">
                {p.enrollment_number ? (
                  <p className="font-mono text-[12px] truncate">{p.enrollment_number}</p>
                ) : (
                  <span className="text-[11px] text-muted-foreground italic">
                    ID Verification Only
                  </span>
                )}
                {p.phone && <p className="text-[11px] text-muted-foreground">{p.phone}</p>}
              </div>

              {/* Status Badge */}
              <div>
                {p.approval_status === "rejected" ? (
                  <Badge variant="destructive" className="text-[10px] gap-1">
                    <XCircle className="h-3 w-3" /> Rejected
                  </Badge>
                ) : (
                  <Badge
                    variant="secondary"
                    className="text-[10px] gap-1 bg-warning/15 text-warning-foreground border-warning/30 font-medium"
                  >
                    <Clock className="h-3 w-3 text-warning" /> Pending
                  </Badge>
                )}
              </div>

              {/* Submitted Time */}
              <div className="text-[11px] text-muted-foreground">
                {p.profile_submitted_at
                  ? formatDistanceToNow(new Date(p.profile_submitted_at), { addSuffix: true })
                  : "—"}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-1.5 md:justify-end items-center">
                {p.id_card_path && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 px-2.5 text-[12px] gap-1 border-border-subtle"
                    onClick={() => openInspect(p)}
                  >
                    <Eye className="h-3.5 w-3.5" /> Inspect
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 px-2 text-[12px] gap-1 border-border-subtle text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => openReject(p)}
                >
                  <XCircle className="h-3.5 w-3.5" /> Reject
                </Button>
                <Button
                  size="sm"
                  className="h-8 px-2.5 text-[12px] gap-1 bg-success hover:bg-success/90 text-success-foreground shadow-sm"
                  onClick={() => openApprove(p)}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── INSPECT COLLEGE ID CARD MODAL ── */}
      <Dialog open={mode === "inspect"} onOpenChange={(o) => !o && setMode(null)}>
        <DialogContent className="max-w-3xl max-h-[92dvh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-[17px] font-bold flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              College ID Verification — {target?.name}
            </DialogTitle>
            <DialogDescription className="text-[12px]">
              Review the student's submitted ID card photo and institutional credentials before approving.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Interactive Image Viewer Canvas */}
            <div className="relative rounded-xl border border-border-subtle bg-black/90 p-2 min-h-[320px] flex flex-col items-center justify-center overflow-hidden">
              {idCardLoading ? (
                <div className="flex items-center gap-2 text-white/70 text-[13px]">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Generating secure signed link…
                </div>
              ) : idCardSignedUrl ? (
                <div className="overflow-auto max-h-[50vh] w-full flex items-center justify-center">
                  <img
                    src={idCardSignedUrl}
                    alt="College ID Card"
                    className="max-h-[48vh] w-auto object-contain transition-transform duration-200"
                    style={{
                      transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                    }}
                  />
                </div>
              ) : (
                <div className="text-white/60 text-[13px]">No ID card photo uploaded.</div>
              )}

              {/* Image Controls Bar */}
              {idCardSignedUrl && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-md rounded-full px-3 py-1.5 flex items-center gap-2 text-white border border-white/10 shadow-lg">
                  <button
                    type="button"
                    onClick={() => setZoomLevel((z) => Math.min(z + 0.25, 2.5))}
                    className="p-1 hover:text-primary transition-colors"
                    title="Zoom In"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                  <span className="text-[11px] font-mono px-1">{(zoomLevel * 100).toFixed(0)}%</span>
                  <button
                    type="button"
                    onClick={() => setZoomLevel((z) => Math.max(z - 0.25, 0.75))}
                    className="p-1 hover:text-primary transition-colors"
                    title="Zoom Out"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <div className="h-3 w-px bg-white/20" />
                  <button
                    type="button"
                    onClick={() => setRotation((r) => (r + 90) % 360)}
                    className="p-1 hover:text-primary transition-colors"
                    title="Rotate 90°"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setZoomLevel(1);
                      setRotation(0);
                    }}
                    className="text-[10px] uppercase font-bold px-1 hover:text-primary"
                  >
                    Reset
                  </button>
                </div>
              )}
            </div>

            {/* Student Details & Checklist Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Left Column: Student Details */}
              <div className="rounded-xl border border-border-subtle bg-surface-2 p-3.5 space-y-1.5 text-[12px]">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Student Registration Profile
                </p>
                <p>
                  <span className="text-muted-foreground">Full Name:</span>{" "}
                  <span className="font-semibold text-foreground">{target?.name}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Email:</span> {target?.email}
                </p>
                <p>
                  <span className="text-muted-foreground">Phone:</span> {target?.phone ?? "—"}
                </p>
                <p>
                  <span className="text-muted-foreground">Programme:</span>{" "}
                  <span className="font-medium text-foreground">{target?.course_name}</span> (
                  {target?.academic_year})
                </p>
                <p>
                  <span className="text-muted-foreground">MU Enrollment:</span>{" "}
                  <span className="font-mono font-medium">
                    {target?.enrollment_number ?? "Not provided (Card Only)"}
                  </span>
                </p>
              </div>

              {/* Right Column: Verification Criteria Checklist */}
              <div className="rounded-xl border border-border-subtle bg-surface-2 p-3.5 space-y-2 text-[12px]">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Verification Criteria Checklist
                </p>
                <div className="space-y-1 text-[11px] text-muted-foreground">
                  <p className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span>Confirm BKBNC college logo / header on card</span>
                  </p>
                  <p className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span>Confirm student name matches ID card</span>
                  </p>
                  <p className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span>Confirm photograph is authentic &amp; identifiable</span>
                  </p>
                  <p className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span>Check that card is not expired or damaged</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-border-subtle">
            <Button variant="outline" onClick={() => setMode(null)}>
              Close
            </Button>
            <Button
              variant="outline"
              className="text-destructive hover:bg-destructive/10 border-border-subtle gap-1.5"
              onClick={() => {
                setMode("reject");
              }}
            >
              <XCircle className="h-4 w-4" /> Reject ID Card
            </Button>
            <Button
              className="bg-success hover:bg-success/90 text-success-foreground gap-1.5 font-bold"
              onClick={() => {
                if (target) openApprove(target);
              }}
            >
              <CheckCircle2 className="h-4 w-4" /> Proceed to Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── APPROVE STUDENT DIALOG ── */}
      <Dialog open={mode === "approve"} onOpenChange={(o) => !o && setMode(null)}>
        <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Approve {target?.name}</DialogTitle>
            <DialogDescription>
              Assign college — cohort department &amp; class section are auto-resolved.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="rounded-lg border border-border-subtle bg-surface-2 p-3 text-[12px] space-y-0.5">
              <p>
                <span className="text-muted-foreground">Course:</span> {target?.course_name} (
                {target?.course_code})
              </p>
              <p>
                <span className="text-muted-foreground">Year:</span> {target?.academic_year}
              </p>
              {target?.enrollment_number && (
                <p>
                  <span className="text-muted-foreground">MU Enrollment:</span>{" "}
                  <span className="font-mono">{target.enrollment_number}</span>
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-[13px] font-semibold">
                Assign College <span className="text-destructive">*</span>
              </Label>
              <Select value={collegeId} onValueChange={setCollegeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select college" />
                </SelectTrigger>
                <SelectContent>
                  {colleges.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.college_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Auto-assignment preview */}
            {collegeId && (
              <div className="rounded-lg border border-border-subtle bg-surface-2 p-3 space-y-2">
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">
                  <Sparkles className="h-3.5 w-3.5 text-primary" /> Auto-Assignment Preview
                </div>
                {previewBusy ? (
                  <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Resolving class &amp;
                    department…
                  </div>
                ) : preview?.ok ? (
                  <div className="space-y-1.5 text-[13px]">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">Department:</span>
                      <span className="font-medium">{preview.department_name}</span>
                      <Badge className="ml-auto bg-success/15 text-success border-success/30 text-[10px]">
                        Auto
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">Class Cohort:</span>
                      <span className="font-medium">{preview.class_name}</span>
                      <Badge className="ml-auto bg-success/15 text-success border-success/30 text-[10px]">
                        Auto
                      </Badge>
                    </div>
                  </div>
                ) : (
                  <p className="text-[12px] text-warning">
                    {friendly({ message: preview?.error ?? "preview_failed" })}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-[13px] font-semibold">
                College Student ID / Roll No (optional)
              </Label>
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
              className="gap-2 bg-success hover:bg-success/90 text-success-foreground font-bold"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Approve &amp; Activate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── REJECT / CORRECTION DIALOG ── */}
      <Dialog open={mode === "reject"} onOpenChange={(o) => !o && setMode(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject / Request Correction</DialogTitle>
            <DialogDescription>
              Provide clear feedback for {target?.name}. They will receive this reason and can upload a
              new ID card to resubmit.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-[13px] font-semibold">Preset Rejection Reasons</Label>
              <Select onValueChange={(val) => setReason(val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a preset reason or type below" />
                </SelectTrigger>
                <SelectContent>
                  {PRESET_REJECTION_REASONS.map((r, i) => (
                    <SelectItem key={i} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[13px] font-semibold">Rejection Note to Student</Label>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. ID card photo is blurry. Please upload a clear photo."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setMode(null)} className="border-border-subtle">
              Cancel
            </Button>
            <Button
              onClick={submitReject}
              disabled={busy}
              variant="destructive"
              className="gap-2 font-semibold"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Send Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── AVATAR VIEWER ── */}
      <Dialog open={mode === "photo"} onOpenChange={(o) => !o && setMode(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{target?.name}</DialogTitle>
            <DialogDescription>{target?.email}</DialogDescription>
          </DialogHeader>
          {target?.avatar_url ? (
            <img src={target.avatar_url} alt="" className="w-full rounded-xl object-cover" />
          ) : (
            <div className="aspect-square flex items-center justify-center bg-surface-2 rounded-xl text-muted-foreground">
              No profile photo uploaded
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
