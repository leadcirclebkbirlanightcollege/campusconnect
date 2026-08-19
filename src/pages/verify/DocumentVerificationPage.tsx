import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BRANDING } from "@/config/branding";
import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Loader2,
  FileText,
  Download,
  Calendar,
  Building2,
  UserCircle2,
  Fingerprint,
  CheckCircle2,
  ArrowRight,
  GraduationCap
} from "@/components/icons";
import { format } from "date-fns";
import { motion } from "framer-motion";

type VerifyResult = {
  found: boolean;
  reference?: string;
  document_type?: string;
  student_name?: string;
  college?: string;
  department?: string;
  role?: string;
  issued_by?: string;
  issue_date?: string;
  expiry_date?: string | null;
  status?: "active" | "revoked" | "expired";
  revoked_reason?: string | null;
  revoked_at?: string | null;
  token_tail?: string;
  pdf_path?: string | null;
  verified_at?: string;
};

function fmtDate(d?: string | null) {
  if (!d) return "—";
  try {
    return format(new Date(d), "dd MMM yyyy");
  } catch {
    return d;
  }
}

export default function DocumentVerificationPage() {
  const { reference } = useParams<{ reference: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("t") ?? "";

  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase.rpc("verify_document_public", {
          p_reference: reference,
          p_token: token,
        });
        if (error) throw error;
        if (!alive) return;
        setResult(data as VerifyResult);

        if ((data as VerifyResult)?.found && (data as VerifyResult)?.status === "active") {
          supabase.rpc("verify_document_touch", { p_reference: reference }).then(() => {});
        }

        const pdfPath = (data as VerifyResult)?.pdf_path;
        if (pdfPath) {
          const { data: signed } = await supabase.storage
            .from("verify-documents")
            .createSignedUrl(pdfPath, 60 * 10);
          if (alive && signed?.signedUrl) setPdfUrl(signed.signedUrl);
        }
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message ?? "Verification failed");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [reference, token]);

  const state = useMemo<"loading" | "valid" | "revoked" | "invalid" | "expired">(() => {
    if (loading) return "loading";
    if (!result || !result.found) return "invalid";
    if (result.status === "revoked") return "revoked";
    if (result.status === "expired") return "expired";
    if (result.expiry_date && new Date(result.expiry_date) < new Date()) return "expired";
    return "valid";
  }, [loading, result]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between py-12 px-4 relative overflow-hidden selection:bg-primary/20 selection:text-primary">
      {/* Ambient background glow */}
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,hsl(var(--primary)/0.15),transparent_70%)]" />

      <div className="max-w-2xl mx-auto w-full space-y-6">
        {/* Brand header */}
        <Link to="/" className="flex items-center justify-center gap-3 group">
          <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/25 flex items-center justify-center shadow-sm transition-transform group-hover:scale-105">
            <GraduationCap className="h-5 w-5 text-primary" />
          </div>
          <div className="text-left">
            <div className="font-heading font-black text-lg leading-tight tracking-tight text-foreground">{BRANDING.name}</div>
            <div className="text-[10px] uppercase font-bold tracking-[0.2em] text-primary">
              Cryptographic Document Verification
            </div>
          </div>
        </Link>

        {state === "loading" && (
          <Card className="p-12 text-center rounded-3xl border-border-subtle bg-surface-1 shadow-lg space-y-3">
            <Loader2 className="h-9 w-9 animate-spin text-primary mx-auto" />
            <p className="font-heading text-base font-bold text-foreground">Verifying Cryptographic Reference...</p>
            <p className="text-xs text-muted-foreground">Checking institutional verification database and signature</p>
          </Card>
        )}

        {state === "invalid" && (
          <Card className="p-10 text-center rounded-3xl border-danger/30 bg-surface-1 shadow-lg space-y-4">
            <div className="h-16 w-16 rounded-2xl bg-danger/10 border border-danger/25 flex items-center justify-center mx-auto text-danger">
              <ShieldX className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <h1 className="font-heading text-2xl font-black text-foreground">Invalid Document Reference</h1>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                No matching academic record was found for reference <span className="font-mono font-bold text-foreground">{reference}</span>.
              </p>
            </div>
            {error && <p className="text-xs text-danger font-medium bg-danger/10 py-1.5 px-3 rounded-lg max-w-sm mx-auto">{error}</p>}
          </Card>
        )}

        {state === "revoked" && result && (
          <Card className="p-8 rounded-3xl border-danger/30 bg-surface-1 shadow-lg space-y-5">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-danger/10 border border-danger/25 flex items-center justify-center shrink-0">
                <ShieldAlert className="h-6 w-6 text-danger" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-black tracking-widest text-danger">Document Revoked</span>
                <h1 className="font-heading text-xl font-black text-foreground">This document has been officially revoked</h1>
              </div>
            </div>
            {result.revoked_reason && (
              <div className="p-3.5 rounded-xl bg-danger/8 border border-danger/20 text-xs text-danger leading-relaxed">
                <strong>Reason:</strong> {result.revoked_reason}
              </div>
            )}
            <DocumentFacts result={result} />
          </Card>
        )}

        {state === "expired" && result && (
          <Card className="p-8 rounded-3xl border-warning/30 bg-surface-1 shadow-lg space-y-5">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-warning/10 border border-warning/25 flex items-center justify-center shrink-0">
                <ShieldAlert className="h-6 w-6 text-warning" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-black tracking-widest text-warning">Validity Expired</span>
                <h1 className="font-heading text-xl font-black text-foreground">This document validity period has ended</h1>
              </div>
            </div>
            <DocumentFacts result={result} />
          </Card>
        )}

        {state === "valid" && result && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            <Card className="overflow-hidden rounded-3xl border-border-subtle bg-surface-1 shadow-2xl">
              {/* Genuine Header Banner */}
              <div className="bg-gradient-to-br from-success/15 via-success/8 to-transparent border-b border-border-subtle p-6 sm:p-8">
                <div className="flex items-center gap-4 mb-3">
                  <div className="h-14 w-14 rounded-2xl bg-success/20 border border-success/35 flex items-center justify-center shrink-0 text-success shadow-md shadow-success/10">
                    <ShieldCheck className="h-7 w-7" />
                  </div>
                  <div>
                    <span className="inline-flex items-center gap-1 text-[11px] uppercase font-black tracking-widest text-success bg-success/15 border border-success/25 px-2.5 py-0.5 rounded-full mb-1">
                      <CheckCircle2 className="h-3 w-3" /> Genuine & Verified
                    </span>
                    <h1 className="font-heading text-2xl font-black text-foreground tracking-tight">
                      Official Institutional Document
                    </h1>
                  </div>
                </div>
                <p className="text-[13px] text-muted-foreground leading-relaxed">
                  Issued by <strong className="text-foreground">{result.issued_by}</strong> on behalf of <strong className="text-foreground">{result.college ?? BRANDING.name}</strong>.
                </p>
              </div>

              {/* Verified Metadata Grid */}
              <div className="p-6 sm:p-8 space-y-6">
                <DocumentFacts result={result} />

                {pdfUrl && (
                  <a href={pdfUrl} target="_blank" rel="noreferrer" className="block pt-2">
                    <Button className="w-full h-12 rounded-xl font-bold shadow-md shadow-primary/25 text-sm gap-2" size="lg">
                      <Download className="h-4 w-4" />
                      Download Official Signed PDF
                    </Button>
                  </a>
                )}

                {/* Cryptographic Seal Footer */}
                <div className="rounded-2xl border border-border-subtle bg-surface-2/60 p-4 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs text-foreground font-semibold">
                    <Fingerprint className="h-4 w-4 text-primary" />
                    <span>Cryptographic Verification Reference</span>
                  </div>
                  <p className="font-mono text-[11px] text-muted-foreground break-all">
                    Ref: {result.reference} · Signature Token: ••••{result.token_tail}
                  </p>
                  <p className="text-[10px] text-muted-foreground/80 pt-1">
                    Verified on {fmtDate(result.verified_at)} at {new Date(result.verified_at ?? Date.now()).toLocaleTimeString()}.
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        <div className="text-center pt-2">
          <Link to="/" className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors">
            ← Return to {BRANDING.name} Homepage
          </Link>
        </div>
      </div>

      <div className="text-center text-[11px] text-muted-foreground/60 pt-6">
        © {new Date().getFullYear()} {BRANDING.name} · Digital Credential Authority
      </div>
    </div>
  );
}

function DocumentFacts({ result }: { result: VerifyResult }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <Fact icon={<FileText className="h-4 w-4 text-primary" />} label="Document Type" value={result.document_type} />
      <Fact icon={<UserCircle2 className="h-4 w-4 text-primary" />} label="Student Name" value={result.student_name} />
      <Fact icon={<Building2 className="h-4 w-4 text-primary" />} label="Institution" value={result.college} />
      <Fact icon={<Building2 className="h-4 w-4 text-primary" />} label="Department" value={result.department} />
      {result.role && <Fact icon={<Badge className="h-4 w-4 p-0" />} label="Role / Designation" value={result.role} />}
      <Fact icon={<Calendar className="h-4 w-4 text-primary" />} label="Issue Date" value={fmtDate(result.issue_date)} />
      {result.expiry_date && (
        <Fact icon={<Calendar className="h-4 w-4 text-primary" />} label="Valid Through" value={fmtDate(result.expiry_date)} />
      )}
    </div>
  );
}

function Fact({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string | null }) {
  return (
    <div className="rounded-2xl border border-border-subtle bg-surface-2/60 p-3.5 space-y-1">
      <div className="flex items-center gap-1.5 text-[10.5px] uppercase font-bold tracking-wider text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-[13.5px] font-bold text-foreground break-words">{value || "—"}</div>
    </div>
  );
}
