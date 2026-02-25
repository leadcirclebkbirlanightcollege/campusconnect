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
        backgroundColor: "#0B1220",
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
        backgroundColor: "#0B1220",
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
        <Skeleton className="h-80 w-full max-w-sm rounded-xl" />
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

  return (
    <div className="flex flex-col items-center gap-6 py-6">
      {/* Institutional ID Card */}
      <div ref={cardRef} className="w-full max-w-sm">
        <div className="rounded-xl border bg-card overflow-hidden">
          {/* Header bar */}
          <div className="bg-primary px-5 py-3 text-center">
            <p className="text-[11px] font-semibold tracking-[0.2em] text-primary-foreground uppercase">
              Campus Connect
            </p>
            <p className="text-[10px] text-primary-foreground/70 tracking-wide">
              Student Identity Card
            </p>
          </div>

          {/* Body */}
          <div className="px-5 py-5 space-y-4">
            {/* Name and details */}
            <div className="space-y-1 text-center">
              <h2 className="text-lg font-semibold text-foreground">{profile.name}</h2>
              {profile.student_id && (
                <p className="text-sm font-mono tracking-wider text-muted-foreground">{profile.student_id}</p>
              )}
              {profile.department && (
                <p className="text-xs text-muted-foreground">{profile.department}</p>
              )}
              {profile.class_name && (
                <p className="text-xs text-muted-foreground">{profile.class_name}</p>
              )}
            </div>

            {/* Verified badge */}
            {profile.is_verified && (
              <div className="flex justify-center">
                <Badge variant="secondary" className="gap-1 text-xs">
                  <ShieldCheck className="h-3 w-3" />
                  Verified
                </Badge>
              </div>
            )}

            {/* Programme tags */}
            {programmes.length > 0 && (
              <div className="flex flex-wrap justify-center gap-1.5">
                {programmes.map((p) => (
                  <Badge key={p.programme_id} variant="outline" className="text-xs">
                    {p.programmes?.name ?? "Programme"}
                  </Badge>
                ))}
              </div>
            )}

            {/* QR Code */}
            <div className="flex justify-center pt-2">
              <div className="rounded-lg bg-background p-3 border">
                <QRCodeSVG
                  value={qrPayload}
                  size={130}
                  level="H"
                  includeMargin={false}
                  bgColor="transparent"
                  fgColor="hsl(220, 60%, 40%)"
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t px-5 py-2.5 text-center">
            <p className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
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
        >
          <Download className="h-4 w-4" />
          {downloading ? "Generating…" : "Download"}
        </Button>
        <Button
          onClick={handleShare}
          disabled={downloading}
          className="flex-1 gap-2"
        >
          <Share2 className="h-4 w-4" />
          Share
        </Button>
      </div>
      <p className="text-xs text-muted-foreground max-w-sm text-center">
        This is your official Campus Connect Digital ID. Share only when required.
      </p>

      {/* Hidden downloadable version */}
      <div className="fixed -left-[9999px] top-0">
        <div
          ref={downloadRef}
          style={{
            width: 400,
            padding: 32,
            backgroundColor: "#0B1220",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 24,
            fontFamily: "Inter, system-ui, sans-serif",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#D4AF37", letterSpacing: 2 }}>
              Campus Connect
            </div>
          </div>
          <div
            style={{
              width: "100%",
              borderRadius: 16,
              border: "1px solid rgba(59,130,246,0.3)",
              background: "rgba(17,24,39,0.9)",
              padding: 24,
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, color: "#3B82F6", letterSpacing: 3 }}>CAMPUS CONNECT</div>
                <div style={{ fontSize: 9, color: "#6B7280", letterSpacing: 1.5 }}>STUDENT IDENTITY CARD</div>
              </div>
              {profile.is_verified && (
                <div style={{ fontSize: 10, color: "#3B82F6", border: "1px solid rgba(59,130,246,0.3)", borderRadius: 6, padding: "2px 8px", fontWeight: 600 }}>
                  ✓ VERIFIED
                </div>
              )}
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: "#E5E7EB" }}>{profile.name}</div>
              {profile.student_id && (
                <div style={{ fontSize: 13, color: "#9CA3AF", fontFamily: "monospace", letterSpacing: 1.5, marginTop: 2 }}>{profile.student_id}</div>
              )}
              {profile.department && <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>{profile.department}</div>}
              {profile.class_name && <div style={{ fontSize: 11, color: "#6B7280", marginTop: 1 }}>{profile.class_name}</div>}
            </div>
            {programmes.length > 0 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
                {programmes.map((p) => (
                  <span key={p.programme_id} style={{ fontSize: 10, color: "#3B82F6", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 6, padding: "2px 8px", backgroundColor: "rgba(59,130,246,0.08)" }}>
                    {p.programmes?.name ?? "Programme"}
                  </span>
                ))}
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "center", padding: 8 }}>
              <QRCodeSVG value={qrPayload} size={120} level="H" bgColor="transparent" fgColor="#3B82F6" />
            </div>
            <div style={{ textAlign: "center", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 12, fontSize: 9, color: "#6B7280", letterSpacing: 2, textTransform: "uppercase" }}>
              Campus Connect — Verified Student
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 11, color: "#9CA3AF", fontStyle: "italic" }}>– An LeadCircle Initiative</div>
            <div style={{ fontSize: 9, color: "#6B7280", marginTop: 4 }}>© Campus Connect. All Rights Reserved.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
