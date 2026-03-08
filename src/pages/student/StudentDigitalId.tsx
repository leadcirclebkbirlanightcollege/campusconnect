import { useRef, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Share2, ShieldCheck } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import html2canvas from "html2canvas";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

type ProfileRow = {
  name: string;
  email: string;
  student_id: string | null;
  department: string | null;
  class_name: string | null;
  avatar_url: string | null;
  is_verified: boolean;
};

type ProgrammeRow = {
  programme_id: string;
  programmes: { name: string; color: string | null } | null;
};

export default function StudentDigitalId() {
  const cardRef = useRef<HTMLDivElement>(null);
  const downloadRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const meQuery = useQuery({
    queryKey: ["student", "me"],
    queryFn: async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      return data.user ?? null;
    },
  });

  const profileQuery = useQuery({
    queryKey: ["student", "id-card-profile", meQuery.data?.id],
    enabled: Boolean(meQuery.data?.id),
    queryFn: async (): Promise<ProfileRow | null> => {
      const uid = meQuery.data!.id;
      const { data, error } = await supabase
        .from("profiles")
        .select("name,email,student_id,department,class_name,avatar_url,is_verified")
        .eq("user_id", uid)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as ProfileRow | null;
    },
  });

  const programmesQuery = useQuery({
    queryKey: ["student", "id-card-programmes", meQuery.data?.id],
    enabled: Boolean(meQuery.data?.id),
    queryFn: async (): Promise<ProgrammeRow[]> => {
      const uid = meQuery.data!.id;
      const { data, error } = await supabase
        .from("student_programme_allotments")
        .select("programme_id, programmes(name, color)")
        .eq("student_user_id", uid);
      if (error) throw error;
      return (data ?? []) as unknown as ProgrammeRow[];
    },
  });

  const profile = profileQuery.data;
  const userId = meQuery.data?.id ?? "";
  const qrPayload = JSON.stringify({ type: "campus_connect_id", uid: userId, ts: Date.now() });

  const handleDownload = useCallback(async () => {
    if (!downloadRef.current) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(downloadRef.current, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const link = document.createElement("a");
      link.download = `CampusConnect-ID-${profile?.student_id || "card"}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast.success("ID Card downloaded");
    } catch {
      toast.error("Failed to download ID card");
    } finally {
      setDownloading(false);
    }
  }, [profile?.student_id]);

  const handleShare = useCallback(async () => {
    if (!downloadRef.current) return;
    try {
      const canvas = await html2canvas(downloadRef.current, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
        logging: false,
      });
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], "CampusConnect-ID.png", { type: "image/png" });
        if (navigator.share && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: "Campus Connect Digital ID" });
        } else {
          handleDownload();
        }
      });
    } catch {
      handleDownload();
    }
  }, [handleDownload]);

  if (profileQuery.isLoading || meQuery.isLoading) {
    return (
      <div className="flex flex-col items-center gap-6 py-8">
        <Skeleton className="h-[420px] w-full max-w-sm rounded-xl" />
        <Skeleton className="h-9 w-48" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-muted-foreground">Profile not found. Please complete your profile first.</p>
      </div>
    );
  }

  const programmes = programmesQuery.data ?? [];
  const primaryProgramme = programmes[0]?.programmes?.name ?? null;

  return (
    <div className="flex flex-col items-center gap-6 py-6">
      {/* Visible card */}
      <div ref={cardRef} className="w-full max-w-sm">
        <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
          {/* Top institution bar */}
          <div className="bg-primary px-5 pt-4 pb-3 text-center">
            <p className="text-[11px] font-bold tracking-[0.25em] text-primary-foreground uppercase">
              Campus Connect
            </p>
            <p className="text-[9px] text-primary-foreground/60 tracking-[0.15em] uppercase mt-0.5">
              Student Identity Card
            </p>
          </div>

          {/* Main content */}
          <div className="flex items-center gap-4 px-5 py-4 flex-1">
            {/* Left: identity info */}
            <div className="flex-1 space-y-1 min-w-0">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Full Name</p>
              <p className="text-base font-semibold text-foreground leading-tight truncate">{profile.name}</p>

              {profile.student_id && (
                <div className="pt-1">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Student ID</p>
                  <p className="text-sm font-mono text-foreground tracking-widest">{profile.student_id}</p>
                </div>
              )}

              {(primaryProgramme || profile.department) && (
                <div className="pt-1">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Programme</p>
                  <p className="text-xs text-foreground">{primaryProgramme ?? profile.department}</p>
                </div>
              )}

              {profile.class_name && (
                <div className="pt-0.5">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Class</p>
                  <p className="text-xs text-foreground">{profile.class_name}</p>
                </div>
              )}

              {profile.is_verified && (
                <div className="pt-1.5">
                  <Badge variant="secondary" className="gap-1 text-[10px] h-5 px-2">
                    <ShieldCheck className="h-2.5 w-2.5" />
                    Verified
                  </Badge>
                </div>
              )}
            </div>

            {/* Right: QR code */}
            <div className="shrink-0">
              <div className="rounded-lg border bg-background p-2">
                <QRCodeSVG
                  value={qrPayload}
                  size={96}
                  level="H"
                  includeMargin={false}
                  bgColor="transparent"
                  fgColor="hsl(220, 65%, 38%)"
                />
              </div>
              <p className="text-[9px] text-muted-foreground text-center mt-1 tracking-wide">Scan to verify</p>
            </div>
          </div>

          {/* Footer strip */}
          <div className="border-t px-5 py-2 text-center bg-muted/30">
            <p className="text-[9px] tracking-[0.2em] text-muted-foreground uppercase">
              Campus Connect — Verified Student
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 w-full max-w-sm">
        <Button
          onClick={handleDownload}
          disabled={downloading}
          className="flex-1 gap-2"
          variant="outline"
          size="sm"
        >
          <Download className="h-3.5 w-3.5" />
          {downloading ? "Generating…" : "Download"}
        </Button>
        <Button
          onClick={handleShare}
          disabled={downloading}
          className="flex-1 gap-2"
          size="sm"
        >
          <Share2 className="h-3.5 w-3.5" />
          Share
        </Button>
      </div>
      <p className="text-xs text-muted-foreground max-w-sm text-center">
        Official Campus Connect Digital ID. Share only when required.
      </p>

      {/* Hidden downloadable version — white institutional card */}
      <div className="fixed -left-[9999px] top-0">
        <div
          ref={downloadRef}
          style={{
            width: 480,
            backgroundColor: "#ffffff",
            fontFamily: "system-ui, -apple-system, sans-serif",
            border: "1px solid #e2e8f0",
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div style={{ backgroundColor: "hsl(220, 65%, 38%)", padding: "14px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#ffffff", letterSpacing: "0.25em", textTransform: "uppercase" }}>
              Campus Connect
            </div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.65)", letterSpacing: "0.15em", textTransform: "uppercase", marginTop: 3 }}>
              Student Identity Card
            </div>
          </div>

          {/* Body */}
          <div style={{ display: "flex", gap: 20, padding: "20px 24px", alignItems: "center" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 2 }}>Full Name</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: "#0f172a" }}>{profile.name}</div>

              {profile.student_id && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 9, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 2 }}>Student ID</div>
                  <div style={{ fontSize: 13, fontFamily: "monospace", color: "#0f172a", letterSpacing: "0.12em" }}>{profile.student_id}</div>
                </div>
              )}

              {(primaryProgramme || profile.department) && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 9, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 2 }}>Programme</div>
                  <div style={{ fontSize: 12, color: "#0f172a" }}>{primaryProgramme ?? profile.department}</div>
                </div>
              )}

              {profile.class_name && (
                <div style={{ marginTop: 6 }}>
                  <div style={{ fontSize: 9, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 2 }}>Class</div>
                  <div style={{ fontSize: 12, color: "#0f172a" }}>{profile.class_name}</div>
                </div>
              )}

              {profile.is_verified && (
                <div style={{ marginTop: 10, display: "inline-flex", alignItems: "center", gap: 4, background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 6, padding: "3px 8px" }}>
                  <span style={{ fontSize: 10, color: "#475569", fontWeight: 600 }}>✓ VERIFIED</span>
                </div>
              )}
            </div>

            <div style={{ flexShrink: 0 }}>
              <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 8, backgroundColor: "#f8fafc" }}>
                <QRCodeSVG value={qrPayload} size={110} level="H" bgColor="transparent" fgColor="hsl(220, 65%, 38%)" />
              </div>
              <div style={{ fontSize: 9, color: "#94a3b8", textAlign: "center", marginTop: 4, letterSpacing: "0.05em" }}>Scan to verify</div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ borderTop: "1px solid #e2e8f0", padding: "8px 24px", textAlign: "center", backgroundColor: "#f8fafc" }}>
            <div style={{ fontSize: 9, color: "#94a3b8", letterSpacing: "0.15em", textTransform: "uppercase" }}>Campus Connect — Verified Student</div>
            <div style={{ fontSize: 8, color: "#cbd5e1", marginTop: 3 }}>– An LeadCircle Initiative · © Campus Connect. All Rights Reserved.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
