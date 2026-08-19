import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { QRCodeCanvas } from "qrcode.react";
import { format } from "date-fns";
import {
  Plus,
  ShieldCheck,
  ShieldX,
  QrCode,
  Copy,
  Trash2,
  Loader2,
  Upload,
  ExternalLink,
  FileText,
  Search,
} from "@/components/icons";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/layout/PageHeader";
import { PageContainer } from "@/layout/PageContainer";

type VerifyDoc = {
  id: string;
  reference: string;
  verification_token: string;
  document_type: string;
  student_name: string;
  email: string | null;
  phone: string | null;
  college: string | null;
  department: string | null;
  role: string | null;
  issued_by: string;
  issue_date: string;
  expiry_date: string | null;
  status: "active" | "revoked" | "expired";
  pdf_path: string | null;
  revoked_reason: string | null;
  verified_count: number;
  last_verified_at: string | null;
  created_at: string;
};

function generateReference() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `CC-${y}${m}-${rand}`;
}

function generateToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function buildVerifyUrl(reference: string, token: string) {
  return `${window.location.origin}/verify/${reference}?t=${token}`;
}

export default function AdminVerifyDocumentsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [qrDoc, setQrDoc] = useState<VerifyDoc | null>(null);

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["verify_documents", "list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("verify_documents")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as VerifyDoc[];
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return docs;
    return docs.filter(
      (d) =>
        d.reference.toLowerCase().includes(q) ||
        d.student_name.toLowerCase().includes(q) ||
        d.document_type.toLowerCase().includes(q) ||
        (d.email ?? "").toLowerCase().includes(q),
    );
  }, [docs, search]);

  async function revokeDoc(doc: VerifyDoc) {
    const reason = window.prompt("Reason for revoking this document?");
    if (reason === null) return;
    const { error } = await supabase
      .from("verify_documents")
      .update({ status: "revoked", revoked_reason: reason, revoked_at: new Date().toISOString() })
      .eq("id", doc.id);
    if (error) return toast.error(error.message);
    toast.success("Document revoked");
    qc.invalidateQueries({ queryKey: ["verify_documents", "list"] });
  }

  async function reactivateDoc(doc: VerifyDoc) {
    const { error } = await supabase
      .from("verify_documents")
      .update({ status: "active", revoked_reason: null, revoked_at: null })
      .eq("id", doc.id);
    if (error) return toast.error(error.message);
    toast.success("Document reactivated");
    qc.invalidateQueries({ queryKey: ["verify_documents", "list"] });
  }

  async function deleteDoc(doc: VerifyDoc) {
    if (!confirm(`Permanently delete "${doc.reference}"? This cannot be undone.`)) return;
    if (doc.pdf_path) {
      await supabase.storage.from("verify-documents").remove([doc.pdf_path]);
    }
    const { error } = await supabase.from("verify_documents").delete().eq("id", doc.id);
    if (error) return toast.error(error.message);
    toast.success("Document deleted");
    qc.invalidateQueries({ queryKey: ["verify_documents", "list"] });
  }

  return (
    <PageContainer>
      <PageHeader
        title="Document Verification"
        subtitle="Issue and manage tamper-proof documents with QR verification"
        action={
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" /> Issue Document
              </Button>
            </DialogTrigger>
            <CreateDocumentDialog onClose={() => setCreateOpen(false)} onCreated={() => {
              qc.invalidateQueries({ queryKey: ["verify_documents", "list"] });
              setCreateOpen(false);
            }} />
          </Dialog>
        }
      />

      <div className="mt-4 flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by reference, name, type or email…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="text-xs text-muted-foreground ml-auto">
          {filtered.length} of {docs.length} documents
        </div>
      </div>

      <Card className="mt-4 overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            No documents issued yet. Click <strong>Issue Document</strong> to create one.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Issued To</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Issued</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Verifies</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-mono text-xs">{d.reference}</TableCell>
                  <TableCell>
                    <div className="font-medium">{d.student_name}</div>
                    {d.email && <div className="text-xs text-muted-foreground">{d.email}</div>}
                  </TableCell>
                  <TableCell>{d.document_type}</TableCell>
                  <TableCell className="text-xs">
                    {format(new Date(d.issue_date), "dd MMM yyyy")}
                  </TableCell>
                  <TableCell>
                    {d.status === "active" ? (
                      <Badge className="bg-success/15 text-success border-success/30">
                        Active
                      </Badge>
                    ) : d.status === "revoked" ? (
                      <Badge variant="destructive">Revoked</Badge>
                    ) : (
                      <Badge variant="secondary">Expired</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">{d.verified_count}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="sm" variant="ghost" onClick={() => setQrDoc(d)} title="Show QR">
                      <QrCode className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        navigator.clipboard.writeText(
                          buildVerifyUrl(d.reference, d.verification_token),
                        );
                        toast.success("Verify link copied");
                      }}
                      title="Copy verify link"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <a
                      href={buildVerifyUrl(d.reference, d.verification_token)}
                      target="_blank"
                      rel="noreferrer"
                      title="Open verify page"
                    >
                      <Button size="sm" variant="ghost">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </a>
                    {d.status === "active" ? (
                      <Button size="sm" variant="ghost" onClick={() => revokeDoc(d)} title="Revoke">
                        <ShieldX className="h-4 w-4 text-destructive" />
                      </Button>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => reactivateDoc(d)} title="Reactivate">
                        <ShieldCheck className="h-4 w-4 text-success" />
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => deleteDoc(d)} title="Delete">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* QR Dialog */}
      <Dialog open={!!qrDoc} onOpenChange={(o) => !o && setQrDoc(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Verify QR Code</DialogTitle>
          </DialogHeader>
          {qrDoc && (
            <div className="flex flex-col items-center gap-3 py-3">
              <div className="bg-white p-4 rounded-xl">
                <QRCodeCanvas
                  value={buildVerifyUrl(qrDoc.reference, qrDoc.verification_token)}
                  size={220}
                  level="H"
                  includeMargin={false}
                />
              </div>
              <div className="text-center">
                <div className="font-mono text-xs">{qrDoc.reference}</div>
                <div className="text-sm font-medium mt-1">{qrDoc.student_name}</div>
                <div className="text-xs text-muted-foreground">{qrDoc.document_type}</div>
              </div>
              <div className="text-[10px] font-mono break-all text-muted-foreground text-center px-4">
                {buildVerifyUrl(qrDoc.reference, qrDoc.verification_token)}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(
                    buildVerifyUrl(qrDoc.reference, qrDoc.verification_token),
                  );
                  toast.success("Verify link copied");
                }}
              >
                <Copy className="h-4 w-4 mr-2" /> Copy Link
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}

function CreateDocumentDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    document_type: "Offer Letter",
    student_name: "",
    email: "",
    phone: "",
    college: "B.K. Birla College, Kalyan",
    department: "",
    role: "",
    issued_by: "Atharv Amol Jadhav",
    issue_date: new Date().toISOString().slice(0, 10),
    expiry_date: "",
  });
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  function upd<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit() {
    if (!form.student_name.trim() || !form.document_type.trim()) {
      return toast.error("Student name and document type are required");
    }
    setBusy(true);
    try {
      const reference = generateReference();
      const verification_token = generateToken();
      let pdf_path: string | null = null;

      if (pdfFile) {
        const path = `${reference}/${pdfFile.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const { error: upErr } = await supabase.storage
          .from("verify-documents")
          .upload(path, pdfFile, { upsert: false, contentType: pdfFile.type });
        if (upErr) throw upErr;
        pdf_path = path;
      }

      const { error } = await supabase.from("verify_documents").insert({
        reference,
        verification_token,
        document_type: form.document_type.trim(),
        student_name: form.student_name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        college: form.college.trim() || null,
        department: form.department.trim() || null,
        role: form.role.trim() || null,
        issued_by: form.issued_by.trim() || "Campus Connect",
        issue_date: form.issue_date,
        expiry_date: form.expiry_date || null,
        pdf_path,
      });
      if (error) throw error;

      toast.success("Document issued", {
        description: `Reference ${reference}`,
      });
      onCreated();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to issue document");
    } finally {
      setBusy(false);
    }
  }

  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" /> Issue New Document
        </DialogTitle>
      </DialogHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
        <Field label="Document Type *" v={form.document_type} onChange={(v) => upd("document_type", v)} placeholder="Offer Letter, Certificate, ID Card…" />
        <Field label="Issued To (Name) *" v={form.student_name} onChange={(v) => upd("student_name", v)} placeholder="Full name" />
        <Field label="Email" v={form.email} onChange={(v) => upd("email", v)} type="email" />
        <Field label="Phone" v={form.phone} onChange={(v) => upd("phone", v)} />
        <Field label="College / Institution" v={form.college} onChange={(v) => upd("college", v)} />
        <Field label="Department" v={form.department} onChange={(v) => upd("department", v)} />
        <Field label="Role / Position" v={form.role} onChange={(v) => upd("role", v)} placeholder="e.g. Founder, Head of E-Cell" />
        <Field label="Issued By" v={form.issued_by} onChange={(v) => upd("issued_by", v)} />
        <Field label="Issue Date" v={form.issue_date} onChange={(v) => upd("issue_date", v)} type="date" />
        <Field label="Expiry Date (optional)" v={form.expiry_date} onChange={(v) => upd("expiry_date", v)} type="date" />

        <div className="sm:col-span-2">
          <Label className="text-xs uppercase tracking-widest text-muted-foreground">
            Official PDF (optional)
          </Label>
          <div className="mt-1.5 flex items-center gap-2">
            <Input
              type="file"
              accept="application/pdf"
              onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
            />
            {pdfFile && (
              <Badge variant="secondary" className="whitespace-nowrap">
                {(pdfFile.size / 1024).toFixed(0)} KB
              </Badge>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            <Upload className="h-3 w-3 inline mr-1" />
            Stored privately; served via short-lived signed URL on the verify page.
          </p>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button onClick={submit} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
          Issue Document
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function Field({
  label,
  v,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  v: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <Label className="text-xs uppercase tracking-widest text-muted-foreground">{label}</Label>
      <Input
        type={type}
        value={v}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1.5"
      />
    </div>
  );
}
