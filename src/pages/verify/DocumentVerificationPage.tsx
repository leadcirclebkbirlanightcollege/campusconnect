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
} from "@/components/icons";
import { format } from "date-fns";

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

        // Fire and forget: increment counter
        if ((data as VerifyResult)?.found && (data as VerifyResult)?.status === "active") {
          supabase.rpc("verify_document_touch", { p_reference: reference }).then(() => {});
        }

        // If there is a PDF, get a short-lived signed URL
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
    <div className="min-h-[100dvh] bg-gradient-to-b from-background to-muted/30 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Brand header */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <img src={BRANDING.logo} alt={BRANDING.name} className="h-10 w-10 rounded-lg" />
          <div className="text-left">
            <div className="font-heading font-bold text-lg leading-tight">{BRANDING.name}</div>
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
              Document Verification
            </div>
          </div>
        </div>

        {state === "loading" && (
          <Card className="p-10 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Verifying document…</p>
          </Card>
        )}

        {state === "invalid" && (
          <Card className="p-8 text-center border-destructive/40">
            <div className="h-14 w-14 rounded-2xl bg-destructive/10 border border-destructive/30 flex items-center justify-center mx-auto mb-4">
              <ShieldX className="h-7 w-7 text-destructive" />
            </div>
            <h1 className="font-heading text-2xl font-bold mb-2">Invalid Document</h1>
            <p className="text-sm text-muted-foreground">
              No document was found for reference <span className="font-mono">{reference}</span>.
              The link may be incorrect or the document has been removed.
            </p>
            {error && <p className="text-xs text-muted-foreground mt-3">{error}</p>}
          </Card>
        )}

        {state === "revoked" && result && (
          <Card className="p-8 border-destructive/40">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-12 w-12 rounded-2xl bg-destructive/10 border border-destructive/30 flex items-center justify-center">
                <ShieldAlert className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-widest text-destructive font-semibold">
                  Revoked
                </div>
                <h1 className="font-heading text-xl font-bold">This document has been revoked</h1>
              </div>
            </div>
            {result.revoked_reason && (
              <p className="text-sm text-muted-foreground mb-4">
                <strong>Reason:</strong> {result.revoked_reason}
              </p>
            )}
            <DocumentFacts result={result} />
          </Card>
        )}

        {state === "expired" && result && (
          <Card className="p-8 border-amber-500/40">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-12 w-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                <ShieldAlert className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-widest text-amber-500 font-semibold">
                  Expired
                </div>
                <h1 className="font-heading text-xl font-bold">This document has expired</h1>
              </div>
            </div>
            <DocumentFacts result={result} />
          </Card>
        )}

        {state === "valid" && result && (
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border-b p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-12 w-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                  <ShieldCheck className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-widest text-emerald-600 dark:text-emerald-400 font-semibold">
                    Verified · Authentic
                  </div>
                  <h1 className="font-heading text-xl font-bold">
                    This document is genuine
                  </h1>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Issued by {result.issued_by} on behalf of {result.college ?? BRANDING.name}.
              </p>
            </div>

            <div className="p-6">
              <DocumentFacts result={result} />

              {pdfUrl && (
                <a href={pdfUrl} target="_blank" rel="noreferrer" className="block mt-6">
                  <Button className="w-full" size="lg">
                    <Download className="h-4 w-4 mr-2" />
                    View Official Document (PDF)
                  </Button>
                </a>
              )}

              <div className="mt-6 flex items-center gap-2 text-[11px] text-muted-foreground border-t pt-4">
                <Fingerprint className="h-3.5 w-3.5" />
                <span className="font-mono">
                  Ref: {result.reference} · Token: ••••{result.token_tail}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Verified on {fmtDate(result.verified_at)} at {new Date(result.verified_at ?? Date.now()).toLocaleTimeString()}.
              </p>
            </div>
          </Card>
        )}

        <div className="text-center mt-6">
          <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">
            ← Back to {BRANDING.name}
          </Link>
        </div>
      </div>
    </div>
  );
}

function DocumentFacts({ result }: { result: VerifyResult }) {
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      <Fact icon={<FileText className="h-4 w-4" />} label="Document Type" value={result.document_type} />
      <Fact icon={<UserCircle2 className="h-4 w-4" />} label="Issued To" value={result.student_name} />
      <Fact icon={<Building2 className="h-4 w-4" />} label="Institution" value={result.college} />
      <Fact icon={<Building2 className="h-4 w-4" />} label="Department" value={result.department} />
      {result.role && <Fact icon={<Badge className="h-4 w-4 p-0" />} label="Role / Position" value={result.role} />}
      <Fact icon={<Calendar className="h-4 w-4" />} label="Issue Date" value={fmtDate(result.issue_date)} />
      {result.expiry_date && (
        <Fact icon={<Calendar className="h-4 w-4" />} label="Valid Until" value={fmtDate(result.expiry_date)} />
      )}
    </div>
  );
}

function Fact({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string | null }) {
  return (
    <div className="rounded-xl border bg-card/50 p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
        {icon} {label}
      </div>
      <div className="text-sm font-medium break-words">{value || "—"}</div>
    </div>
  );
}
