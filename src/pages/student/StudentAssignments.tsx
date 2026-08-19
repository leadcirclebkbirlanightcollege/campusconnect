import { useRef, useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageContainer, PageHeader } from "@/layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  FileText,
  Calendar,
  CheckCircle2,
  Upload,
  Star,
  Paperclip,
  X,
  Clock,
  AlertTriangle,
  ArrowRight,
  Download,
} from "@/components/icons";
import { format, isPast, isToday } from "date-fns";
import { cn } from "@/lib/utils";
import { SegmentedFilter } from "@/components/ui/SegmentedFilter";

const MAX_FILES = 5;
const MAX_BYTES = 20 * 1024 * 1024;
const ACCEPT = ".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,.txt,.zip";

type StoredFile = { url: string; name: string; size: number };

type FilterStatus = "all" | "pending" | "submitted" | "graded";

export default function StudentAssignments() {
  const [selected, setSelected] = useState<any | null>(null);
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [submitText, setSubmitText] = useState("");
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ["student", "assignments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assignments" as any)
        .select("*")
        .eq("is_active", true)
        .order("due_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as any[];
    },
    staleTime: 30_000,
  });

  const { data: mySubmissions = [] } = useQuery({
    queryKey: ["student", "my-submissions"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return [];
      const { data } = await supabase
        .from("submissions" as any)
        .select("assignment_id, status, marks_obtained, feedback, submitted_at, attachment_url, attachment_name, content");
      return (data ?? []) as any[];
    },
    staleTime: 30_000,
  });

  const submissionMap = useMemo(() => {
    const map: Record<string, any> = {};
    (mySubmissions ?? []).forEach((s: any) => { map[s.assignment_id] = s; });
    return map;
  }, [mySubmissions]);

  const openSelected = (a: any) => {
    setSelected(a);
    const sub = submissionMap[a.id];
    setSubmitText(sub?.content ?? "");
    if (sub?.attachment_url) {
      try {
        const parsed = JSON.parse(sub.attachment_url);
        if (Array.isArray(parsed)) setFiles(parsed);
        else setFiles([{ url: sub.attachment_url, name: sub.attachment_name ?? "file", size: 0 }]);
      } catch {
        setFiles([{ url: sub.attachment_url, name: sub.attachment_name ?? "file", size: 0 }]);
      }
    } else {
      setFiles([]);
    }
  };

  const closeDialog = () => {
    setSelected(null);
    setSubmitText("");
    setFiles([]);
  };

  const handleFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    if (picked.length === 0) return;
    e.target.value = "";

    if (files.length + picked.length > MAX_FILES) {
      toast.error(`Maximum ${MAX_FILES} files per submission`);
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { toast.error("Not authenticated"); return; }

    setUploading(true);
    try {
      const uploaded: StoredFile[] = [];
      for (const file of picked) {
        if (file.size > MAX_BYTES) {
          toast.error(`${file.name}: exceeds 20MB limit`);
          continue;
        }
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${session.user.id}/${selected.id}/${Date.now()}-${safeName}`;
        const { error: upErr } = await supabase.storage
          .from("submissions")
          .upload(path, file, { upsert: false, contentType: file.type });
        if (upErr) { toast.error(`${file.name}: ${upErr.message}`); continue; }
        uploaded.push({ url: path, name: file.name, size: file.size });
      }
      setFiles(prev => [...prev, ...uploaded]);
      if (uploaded.length) toast.success(`${uploaded.length} file(s) attached`);
    } finally {
      setUploading(false);
    }
  };

  const removeFile = async (idx: number) => {
    const f = files[idx];
    if (f.url && !f.url.startsWith("http")) {
      await supabase.storage.from("submissions").remove([f.url]);
    }
    setFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!selected) return;
    if (!submitText.trim() && files.length === 0) {
      toast.error("Please add a note or attach at least one file");
      return;
    }
    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const { data: role } = await supabase
        .from("user_roles").select("college_id").eq("user_id", session.user.id).maybeSingle();
      const { error } = await supabase.from("submissions" as any).upsert({
        assignment_id: selected.id,
        student_user_id: session.user.id,
        college_id: role?.college_id,
        content: submitText.trim() || null,
        attachment_url: files.length ? JSON.stringify(files) : null,
        attachment_name: files[0]?.name ?? null,
        status: "submitted",
        submitted_at: new Date().toISOString(),
      }, { onConflict: "assignment_id,student_user_id" });
      if (error) throw error;
      toast.success("Assignment submitted successfully!");
      qc.invalidateQueries({ queryKey: ["student", "my-submissions"] });
      closeDialog();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const downloadFile = async (path: string) => {
    if (path.startsWith("http")) { window.open(path, "_blank"); return; }
    const { data, error } = await supabase.storage.from("submissions").createSignedUrl(path, 300);
    if (error) { toast.error(error.message); return; }
    window.open(data.signedUrl, "_blank");
  };

  const getDueBadge = (dueDate: string, submission: any) => {
    if (submission?.status === "graded") return { label: "Graded", cls: "bg-primary/10 text-primary border-primary/25" };
    if (submission?.status === "submitted") return { label: "Submitted", cls: "bg-success/10 text-success border-success/25" };
    const due = new Date(dueDate);
    if (isPast(due) && !isToday(due)) return { label: "Overdue", cls: "bg-danger/10 text-danger border-danger/25" };
    if (isToday(due)) return { label: "Due Today", cls: "bg-warning/10 text-warning border-warning/25" };
    return { label: "Pending", cls: "bg-surface-3 text-muted-foreground border-border-subtle" };
  };

  const filteredAssignments = useMemo(() => {
    return assignments.filter((a) => {
      const sub = submissionMap[a.id];
      if (filter === "graded") return sub?.status === "graded";
      if (filter === "submitted") return sub?.status === "submitted";
      if (filter === "pending") return !sub || (sub.status !== "submitted" && sub.status !== "graded");
      return true;
    });
  }, [assignments, submissionMap, filter]);

  const currentSub = selected ? submissionMap[selected.id] : null;
  const isGraded = currentSub?.status === "graded";

  return (
    <PageContainer className="space-y-6 pb-24" withBottomNav>
      <PageHeader
        title="Course Tasks & Assignments"
        subtitle="Manage coursework submissions and view grading feedback"
      />

      {/* Segmented Filter Bar */}
      <SegmentedFilter<FilterStatus>
        value={filter}
        onChange={setFilter}
        options={[
          { value: "all", label: "All", count: assignments.length },
          { value: "pending", label: "Pending", count: assignments.filter(a => !submissionMap[a.id]).length },
          { value: "submitted", label: "Submitted", count: assignments.filter(a => submissionMap[a.id]?.status === "submitted").length },
          { value: "graded", label: "Graded", count: assignments.filter(a => submissionMap[a.id]?.status === "graded").length },
        ]}
      />

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      ) : filteredAssignments.length === 0 ? (
        <div className="rounded-3xl border border-border-subtle bg-surface-1 py-16 text-center space-y-2">
          <FileText className="h-10 w-10 text-muted-foreground mx-auto opacity-30" />
          <h3 className="text-sm font-bold text-foreground">No Assignments in this Tab</h3>
          <p className="text-xs text-muted-foreground">You are up to date with your coursework tasks.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAssignments.map((a: any) => {
            const sub = submissionMap[a.id];
            const badge = getDueBadge(a.due_date, sub);
            return (
              <div
                key={a.id}
                onClick={() => openSelected(a)}
                className="cursor-pointer rounded-2xl border border-border-subtle bg-surface-1 p-4 sm:p-5 hover:border-primary/40 shadow-sm transition-all active:scale-[0.99]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="text-sm font-bold text-foreground truncate">{a.title}</p>
                    {a.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1">{a.description}</p>
                    )}
                  </div>
                  <span className={cn("text-[11px] px-2.5 py-0.5 rounded-full border font-bold uppercase tracking-wider shrink-0", badge.cls)}>
                    {badge.label}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-border-subtle/60 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-primary" />
                    Due {format(new Date(a.due_date), "MMM dd, yyyy")}
                  </span>
                  <span>·</span>
                  <span>Max {a.max_marks} marks</span>
                  {sub?.marks_obtained != null && (
                    <span className="ml-auto flex items-center gap-1 text-xs font-black text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                      <Star className="h-3.5 w-3.5 fill-current" /> {sub.marks_obtained}/{a.max_marks}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Submission Dialog Drawer */}
      <Dialog open={!!selected} onOpenChange={v => { if (!v) closeDialog(); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg font-black">{selected.title}</DialogTitle>
                <DialogDescription className="text-xs">
                  Due: {format(new Date(selected.due_date), "MMMM dd, yyyy")} · Max {selected.max_marks} marks
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 pt-2">
                {selected.description && (
                  <div className="p-3.5 rounded-2xl bg-surface-2 border border-border-subtle text-xs leading-relaxed text-foreground">
                    {selected.description}
                  </div>
                )}

                {isGraded && (
                  <div className="rounded-2xl bg-success/10 border border-success/30 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-success" />
                        <span className="font-bold text-sm text-success">Evaluated by Faculty</span>
                      </div>
                      {currentSub?.marks_obtained != null && (
                        <span className="text-base font-black text-foreground">
                          {currentSub.marks_obtained} / {selected.max_marks}
                        </span>
                      )}
                    </div>
                    {currentSub?.feedback && (
                      <p className="text-xs text-muted-foreground pt-1 border-t border-success/20">
                        <strong>Feedback:</strong> {currentSub.feedback}
                      </p>
                    )}
                  </div>
                )}

                {!isGraded && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                        Submission Notes / Answer Text
                      </label>
                      <Textarea
                        placeholder="Write your notes, external link, or submission summary here…"
                        rows={4}
                        value={submitText}
                        onChange={e => setSubmitText(e.target.value)}
                        className="rounded-2xl text-xs"
                      />
                    </div>

                    {files.length > 0 && (
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                          Attached Files ({files.length}/{MAX_FILES})
                        </label>
                        {files.map((f, idx) => (
                          <div key={idx} className="flex items-center gap-2.5 rounded-xl border border-border-subtle bg-surface-2 px-3 py-2 text-xs">
                            <Paperclip className="h-4 w-4 text-primary shrink-0" />
                            <button onClick={() => downloadFile(f.url)} className="flex-1 text-left font-semibold text-foreground truncate hover:text-primary">
                              {f.name}
                            </button>
                            {f.size > 0 && <span className="text-[10px] text-muted-foreground shrink-0">{(f.size / 1024).toFixed(0)} KB</span>}
                            <button onClick={() => removeFile(idx)} className="text-muted-foreground hover:text-danger p-1">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept={ACCEPT}
                      className="hidden"
                      onChange={handleFilePick}
                    />

                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-11 rounded-2xl gap-2 text-xs font-bold border-border-subtle hover:bg-surface-2"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading || files.length >= MAX_FILES}
                    >
                      <Paperclip className="h-4 w-4" />
                      {uploading ? "Uploading file…" : files.length >= MAX_FILES ? "Maximum Files Reached" : "Attach PDF / Documents / ZIP"}
                    </Button>

                    <Button
                      className="w-full h-12 rounded-2xl gap-2 font-bold shadow-md shadow-primary/20"
                      onClick={handleSubmit}
                      disabled={submitting || uploading || (!submitText.trim() && files.length === 0)}
                    >
                      <Upload className="h-4 w-4" />
                      {submitting ? "Submitting Work…" : currentSub ? "Update Submission" : "Submit Assignment"}
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
