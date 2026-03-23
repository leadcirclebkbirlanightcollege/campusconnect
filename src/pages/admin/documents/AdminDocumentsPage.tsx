import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import {
  Plus, FileText, Trash2, Download, Search, BookOpen, File,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce";
import { format } from "date-fns";

type Doc = {
  id: string;
  title: string;
  file_url: string;
  file_name: string | null;
  doc_type: string;
  subject: string | null;
  access_level: string;
  created_at: string;
  uploaded_by: string;
};

const DOC_TYPES = ["notes", "syllabus", "assignment", "resource"];
const ACCESS_LEVELS = ["students", "faculty", "admin"];

const TYPE_COLORS: Record<string, string> = {
  notes: "bg-blue-500/10 text-blue-600",
  syllabus: "bg-purple-500/10 text-purple-600",
  assignment: "bg-orange-500/10 text-orange-600",
  resource: "bg-green-500/10 text-green-600",
};

type DocForm = {
  title: string;
  subject: string;
  doc_type: string;
  access_level: string;
};

export default function AdminDocumentsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<DocForm>({ title: "", subject: "", doc_type: "notes", access_level: "students" });
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const debouncedSearch = useDebounce(search, 300);

  const { data: collegeId } = useQuery({
    queryKey: ["my_college_id"],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_my_college_id");
      return data as string | null;
    },
    staleTime: 120_000,
  });

  const { data: docs = [], isLoading } = useQuery<Doc[]>({
    queryKey: ["admin", "documents", typeFilter, debouncedSearch],
    enabled: !!collegeId,
    queryFn: async () => {
      let q = supabase
        .from("documents")
        .select("id,title,file_url,file_name,doc_type,subject,access_level,created_at,uploaded_by")
        .eq("college_id", collegeId!)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (typeFilter !== "all") q = q.eq("doc_type", typeFilter);
      if (debouncedSearch) q = q.ilike("title", `%${debouncedSearch}%`);
      const { data } = await q.limit(100);
      return (data ?? []) as Doc[];
    },
    staleTime: 30_000,
  });

  const uploadDoc = async (file: File) => {
    if (!user || !collegeId) return;
    if (!form.title.trim()) { toast.error("Please enter a title first"); return; }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${collegeId}/${user.id}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("documents").upload(path, file, { upsert: true });
      if (uploadErr) throw uploadErr;
      const { data: urlData } = supabase.storage.from("documents").getPublicUrl(path);
      const { error: insertErr } = await supabase.from("documents").insert({
        college_id: collegeId,
        uploaded_by: user.id,
        title: form.title.trim(),
        file_url: urlData.publicUrl,
        file_name: file.name,
        file_size: file.size,
        doc_type: form.doc_type,
        subject: form.subject.trim() || null,
        access_level: form.access_level,
      });
      if (insertErr) throw insertErr;
      toast.success("Document uploaded");
      qc.invalidateQueries({ queryKey: ["admin", "documents"] });
      setOpen(false);
      setForm({ title: "", subject: "", doc_type: "notes", access_level: "students" });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploading(false);
    }
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("documents").update({ is_active: false }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Document removed"); qc.invalidateQueries({ queryKey: ["admin", "documents"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const formatSize = (bytes: number | null) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Document Library</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Upload and manage study materials</p>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Upload
        </Button>
      </div>

      {/* Search + Filter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents…"
            className="h-9 pl-8 text-xs"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-9 w-36 text-xs">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {DOC_TYPES.map((t) => (
              <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {DOC_TYPES.map((type) => (
          <Card key={type} className="border-border/40">
            <CardContent className="p-3 text-center">
              <p className="text-lg font-bold text-foreground">
                {docs.filter(d => d.doc_type === type).length}
              </p>
              <p className="text-[10px] text-muted-foreground capitalize">{type}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Document list */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      ) : docs.length === 0 ? (
        <Card className="border-dashed border-border/40">
          <CardContent className="py-12 text-center">
            <FileText className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No documents yet</p>
            <Button size="sm" variant="outline" className="mt-3" onClick={() => setOpen(true)}>
              Upload first document
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {docs.map((doc) => (
            <Card key={doc.id} className="border-border/40 hover:border-border/60 transition-colors">
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${TYPE_COLORS[doc.doc_type] ?? "bg-muted text-muted-foreground"}`}>
                    <File className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{doc.title}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <Badge className={`text-[9px] h-4 border-0 ${TYPE_COLORS[doc.doc_type]}`}>
                        {doc.doc_type}
                      </Badge>
                      {doc.subject && (
                        <span className="text-[10px] text-muted-foreground">{doc.subject}</span>
                      )}
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(doc.created_at), "dd MMM yyyy")}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      onClick={() => window.open(doc.file_url, "_blank")}
                    >
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteMutation.mutate(doc.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" /> Upload Document
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Title *</Label>
              <Input className="h-9 mt-1 text-sm" value={form.title} onChange={(e) => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. DS Unit 3 Notes" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Type</Label>
                <Select value={form.doc_type} onValueChange={(v) => setForm(p => ({ ...p, doc_type: v }))}>
                  <SelectTrigger className="h-9 mt-1 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DOC_TYPES.map((t) => (
                      <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Access</Label>
                <Select value={form.access_level} onValueChange={(v) => setForm(p => ({ ...p, access_level: v }))}>
                  <SelectTrigger className="h-9 mt-1 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCESS_LEVELS.map((l) => (
                      <SelectItem key={l} value={l} className="capitalize">{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Subject</Label>
              <Input className="h-9 mt-1 text-sm" value={form.subject} onChange={(e) => setForm(p => ({ ...p, subject: e.target.value }))} placeholder="e.g. Data Structures" />
            </div>
            <div
              className="border-2 border-dashed border-border/40 rounded-xl p-6 text-center cursor-pointer hover:border-primary/40 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <FileText className="h-8 w-8 text-muted-foreground/60 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">Click to select file (PDF, DOC, PPT, etc.)</p>
            </div>
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.png,.jpg,.jpeg"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadDoc(file);
                e.currentTarget.value = "";
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? "Uploading…" : "Select & Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
