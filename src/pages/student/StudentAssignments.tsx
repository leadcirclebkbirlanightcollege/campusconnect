import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageContainer, PageHeader } from "@/layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { FileText, Calendar, CheckCircle, Upload, Star, Paperclip, X } from "@/components/icons";
import { format, isPast, isToday } from "date-fns";
import { cn } from "@/lib/utils";

const MAX_FILES = 5;
const MAX_BYTES = 20 * 1024 * 1024;
const ACCEPT = ".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,.txt,.zip";

type StoredFile = { url: string; name: string; size: number };

export default function StudentAssignments() {
  const [selected, setSelected] = useState<any | null>(null);
  const [submitText, setSubmitText] = useState("");
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const { data: assignments, isLoading } = useQuery({
    queryKey: ["student", "assignments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assignments" as any)
        .select("*")
        .eq("is_active", true)
        .order("due_date", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30_000,
  });

  const { data: mySubmissions } = useQuery({
    queryKey: ["student", "my-submissions"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return [];
      const { data } = await supabase
        .from("submissions" as any)
        .select("assignment_id, status, marks_obtained, feedback, submitted_at, attachment_url, attachment_name, content");
      return data ?? [];
    },
    staleTime: 30_000,
  });

  const submissionMap: Record<string, any> = {};
  (mySubmissions ?? []).forEach((s: any) => { submissionMap[s.assignment_id] = s; });

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
          toast.error(`${file.name}: exceeds 20MB`);
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
      toast.error("Add a note or attach at least one file");
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
      toast.success("Assignment submitted!");
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
    if (submission?.status === "graded") return { label: "Graded", cls: "bg-primary/10 text-primary border-primary/20" };
    if (submission?.status === "submitted") return { label: "Submitted", cls: "bg-success/10 text-success border-success/20" };
    const due = new Date(dueDate);
    if (isPast(due) && !isToday(due)) return { label: "Overdue", cls: "bg-danger/10 text-danger border-danger/20" };
    if (isToday(due)) return { label: "Due Today", cls: "bg-warning/10 text-warning border-warning/20" };
    return { label: "Pending", cls: "bg-muted text-muted-foreground border-border" };
  };

  const currentSub = selected ? submissionMap[selected.id] : null;
  const isGraded = currentSub?.status === "graded";

  return (
    <PageContainer>
      <PageHeader title="Assignments" subtitle="View and submit your assignments" />

      {isLoading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
      ) : (assignments?.length ?? 0) === 0 ? (
        <div className="rounded-xl border border-border-subtle bg-surface-1 py-16 text-center">
          <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-sm text-muted-foreground">No assignments available</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(assignments ?? []).map((a: any) => {
            const sub = submissionMap[a.id];
            const badge = getDueBadge(a.due_date, sub);
            return (
              <button key={a.id} onClick={() => openSelected(a)}
                className="w-full text-left rounded-xl border border-border-subtle bg-surface-1 p-4 hover:border-primary/30 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{a.title}</p>
                    {a.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{a.description}</p>}
                  </div>
                  <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium shrink-0", badge.cls)}>
                    {badge.label}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    Due {format(new Date(a.due_date), "MMM dd, yyyy")}
                  </span>
                  <span className="text-xs text-muted-foreground">Max {a.max_marks} marks</span>
                  {sub?.marks_obtained != null && (
                    <span className="flex items-center gap-1 text-xs text-primary font-semibold">
                      <Star className="h-3 w-3" /> {sub.marks_obtained}/{a.max_marks}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={v => { if (!v) closeDialog(); }}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base">{selected.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {selected.description && (
                  <p className="text-sm text-muted-foreground">{selected.description}</p>
                )}
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Due {format(new Date(selected.due_date), "MMM dd, yyyy")}</span>
                  <span>Max {selected.max_marks} marks</span>
                </div>

                {isGraded && (
                  <div className="rounded-lg bg-surface-2 border border-border-subtle p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-success" />
                      <p className="text-sm font-medium text-foreground">Graded</p>
                    </div>
                    {currentSub?.marks_obtained != null && (
                      <p className="text-sm text-foreground font-semibold">
                        Score: {currentSub.marks_obtained} / {selected.max_marks}
                      </p>
                    )}
                    {currentSub?.feedback && (
                      <p className="text-xs text-muted-foreground">{currentSub.feedback}</p>
                    )}
                  </div>
                )}

                {!isGraded && (
                  <div className="space-y-3">
                    <Textarea
                      placeholder="Notes for your submission (optional if files attached)…"
                      rows={4}
                      value={submitText}
                      onChange={e => setSubmitText(e.target.value)}
                    />

                    {files.length > 0 && (
                      <div className="space-y-1.5">
                        {files.map((f, idx) => (
                          <div key={idx} className="flex items-center gap-2 rounded-lg border border-border-subtle bg-surface-2 px-3 py-2">
                            <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <button onClick={() => downloadFile(f.url)} className="flex-1 text-left text-xs text-foreground truncate hover:text-primary">
                              {f.name}
                            </button>
                            {f.size > 0 && <span className="text-[10px] text-muted-foreground shrink-0">{(f.size / 1024).toFixed(0)} KB</span>}
                            <button onClick={() => removeFile(idx)} className="text-muted-foreground hover:text-danger shrink-0">
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
                      className="w-full gap-2"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading || files.length >= MAX_FILES}
                    >
                      <Paperclip className="h-4 w-4" />
                      {uploading ? "Uploading…" : files.length >= MAX_FILES ? "Max files reached" : "Attach Files"}
                    </Button>
                    <p className="text-[10px] text-muted-foreground text-center">
                      Up to {MAX_FILES} files · 20 MB each · PDF, DOC, IMG, ZIP
                    </p>

                    <Button className="w-full gap-2" onClick={handleSubmit} disabled={submitting || uploading || (!submitText.trim() && files.length === 0)}>
                      <Upload className="h-4 w-4" />
                      {submitting ? "Submitting…" : currentSub ? "Update Submission" : "Submit Assignment"}
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
