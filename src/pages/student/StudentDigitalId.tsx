import { useRef, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Share2, ShieldCheck, QrCode, Sparkles } from "@/components/icons";
import { QRCodeSVG } from "qrcode.react";
import html2canvas from "html2canvas";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageContainer } from "@/layout/PageContainer";
import { PageHeader } from "@/layout/PageHeader";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useFestivalTheme } from "@/contexts/FestivalThemeContext";
import { FestiveBadge } from "@/components/festive/FestiveDecorations";

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
      toast.success("Official ID Card downloaded");
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
      <PageContainer className="flex flex-col items-center gap-6 py-8">
        <Skeleton className="h-[440px] w-full max-w-sm rounded-3xl" />
        <Skeleton className="h-10 w-48 rounded-xl" />
      </PageContainer>
    );
  }

  if (!profile) {
    return (
      <PageContainer className="flex items-center justify-center py-20">
        <p className="text-sm text-muted-foreground">Profile not found. Please complete your registration.</p>
      </PageContainer>
    );
  }

  const programmes = programmesQuery.data ?? [];
  const primaryProgramme = programmes[0]?.programmes?.name ?? null;
  const { isFestive, config } = useFestivalTheme();

  return (
    <PageContainer className="flex flex-col items-center gap-6 py-4 pb-24" withBottomNav>
      <div className="w-full max-w-sm text-center">
        {isFestive && (
          <div className="mb-2 flex justify-center">
            <FestiveBadge label={`${config.name} • Verified Student`} />
          </div>
        )}
        <PageHeader
          title="Digital Identity Card"
          subtitle="Official institutional credential with cryptographic verification"
        />
      </div>

      {/* Visible Interactive ID Card */}
      <div ref={cardRef} className="w-full max-w-sm">
        <div className="relative overflow-hidden rounded-[28px] border border-border-subtle bg-surface-1 shadow-xl shadow-primary/5">
          {/* Institutional Top Bar */}
          <div className="bg-gradient-to-r from-primary to-accent px-6 pt-5 pb-4 text-center text-white">
            <p className="text-[11px] font-black tracking-[0.25em] uppercase">
              Campus Connect
            </p>
            <p className="text-[9px] text-white/80 tracking-[0.15em] uppercase mt-0.5 font-bold">
              Official Student Credential
            </p>
          </div>

          {/* Student Profile & QR Body */}
          <div className="p-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <Avatar className="h-16 w-16 rounded-2xl ring-2 ring-primary/20 border border-border-subtle">
                <AvatarImage src={profile.avatar_url ?? undefined} />
                <AvatarFallback className="bg-primary/10 text-primary font-black text-xl">
                  {profile.name[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="shrink-0 bg-white p-2 rounded-2xl border border-border-subtle shadow-sm">
                <QRCodeSVG
                  value={qrPayload}
                  size={84}
                  level="H"
                  includeMargin={false}
                  bgColor="transparent"
                  fgColor="#0f172a"
                />
              </div>
            </div>

            <div className="space-y-1 pt-1 border-t border-border-subtle">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Student Name</p>
              <h2 className="text-base font-black text-foreground truncate">{profile.name}</h2>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              {profile.student_id && (
                <div>
                  <p className="text-[9.5px] font-bold uppercase tracking-wider text-muted-foreground">Roll / ID Number</p>
                  <p className="font-mono font-bold text-foreground mt-0.5 tracking-wider">{profile.student_id}</p>
                </div>
              )}

              {(primaryProgramme || profile.department) && (
                <div>
                  <p className="text-[9.5px] font-bold uppercase tracking-wider text-muted-foreground">Programme</p>
                  <p className="font-bold text-foreground mt-0.5 truncate">{primaryProgramme ?? profile.department}</p>
                </div>
              )}

              {profile.class_name && (
                <div>
                  <p className="text-[9.5px] font-bold uppercase tracking-wider text-muted-foreground">Class / Division</p>
                  <p className="font-bold text-foreground mt-0.5">{profile.class_name}</p>
                </div>
              )}

              <div>
                <p className="text-[9.5px] font-bold uppercase tracking-wider text-muted-foreground">Status</p>
                <div className="flex items-center gap-1 text-success font-bold mt-0.5">
                  <ShieldCheck className="h-3.5 w-3.5" /> Verified
                </div>
              </div>
            </div>
          </div>

          {/* Hologram Bottom Security Strip */}
          <div className="border-t border-border-subtle px-6 py-3 text-center bg-surface-2/80">
            <p className="text-[9.5px] tracking-[0.2em] text-muted-foreground font-bold uppercase">
              Secure Institutional Verification
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 w-full max-w-sm">
        <Button
          onClick={handleDownload}
          disabled={downloading}
          className="flex-1 h-11 rounded-2xl gap-2 text-xs font-bold border-border-subtle hover:bg-surface-2"
          variant="outline"
        >
          <Download className="h-4 w-4" />
          {downloading ? "Exporting…" : "Download PNG"}
        </Button>
        <Button
          onClick={handleShare}
          disabled={downloading}
          className="flex-1 h-11 rounded-2xl gap-2 text-xs font-bold shadow-md shadow-primary/20"
        >
          <Share2 className="h-4 w-4" />
          Share ID
        </Button>
      </div>

      {/* Hidden high-res canvas rendering container */}
      <div className="fixed -left-[9999px] top-0">
        <div
          ref={downloadRef}
          style={{
            width: 480,
            backgroundColor: "#ffffff",
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            color: "#0f172a",
            padding: "28px",
            borderRadius: "24px",
            border: "1px solid #e2e8f0",
          }}
        >
          <div style={{ backgroundColor: "#1e3a8a", color: "#ffffff", padding: "16px", borderRadius: "16px", textAlign: "center" }}>
            <p style={{ fontSize: "14px", fontWeight: "900", letterSpacing: "0.25em", textTransform: "uppercase", margin: 0 }}>
              Campus Connect
            </p>
            <p style={{ fontSize: "10px", opacity: 0.8, letterSpacing: "0.15em", textTransform: "uppercase", margin: "4px 0 0" }}>
              Official Student Credential
            </p>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "24px" }}>
            <div>
              <p style={{ fontSize: "11px", color: "#64748b", fontWeight: "700", textTransform: "uppercase", margin: 0 }}>Student Name</p>
              <h2 style={{ fontSize: "18px", fontWeight: "900", color: "#0f172a", margin: "2px 0 0" }}>{profile.name}</h2>
            </div>
            <div style={{ padding: "8px", border: "1px solid #cbd5e1", borderRadius: "12px" }}>
              <QRCodeSVG value={qrPayload} size={80} level="H" bgColor="#ffffff" fgColor="#0f172a" />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginTop: "20px", borderTop: "1px solid #e2e8f0", paddingTop: "16px" }}>
            <div>
              <p style={{ fontSize: "10px", color: "#64748b", fontWeight: "700", textTransform: "uppercase", margin: 0 }}>Student ID</p>
              <p style={{ fontSize: "13px", fontWeight: "800", color: "#0f172a", margin: "2px 0 0" }}>{profile.student_id ?? "N/A"}</p>
            </div>
            <div>
              <p style={{ fontSize: "10px", color: "#64748b", fontWeight: "700", textTransform: "uppercase", margin: 0 }}>Programme</p>
              <p style={{ fontSize: "13px", fontWeight: "800", color: "#0f172a", margin: "2px 0 0" }}>{primaryProgramme ?? profile.department ?? "General"}</p>
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
