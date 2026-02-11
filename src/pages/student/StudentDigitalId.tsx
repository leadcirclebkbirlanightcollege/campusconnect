import { useRef, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Share2, ShieldCheck } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import html2canvas from "html2canvas";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Loading your Digital ID…</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Profile not found. Please complete your profile first.</p>
      </div>
    );
  }

  const programmes = programmesQuery.data ?? [];

  return (
    <div className="flex flex-col items-center gap-8 py-6">
      <header className="text-center">
        <h1 className="text-2xl font-bold text-foreground">Digital Student ID</h1>
        <p className="text-sm text-muted-foreground mt-1">Your official Campus Connect identification</p>
      </header>

      {/* Interactive Card */}
      <div ref={cardRef} className="w-full max-w-sm perspective-1000">
        <div
          className={cn(
            "relative rounded-2xl p-[1px] overflow-hidden",
            "bg-gradient-to-br from-primary/60 via-primary/20 to-accent/40",
          )}
        >
          {/* Glass card */}
          <div className="relative rounded-2xl bg-card/80 dark:bg-[hsl(220,40%,12%)]/80 backdrop-blur-xl p-6 space-y-5">
            {/* Subtle animated gradient line */}
            <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary/60 to-transparent animate-pulse" />

            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">Campus Connect</p>
                <p className="text-[10px] text-muted-foreground tracking-wide">Student Identity Card</p>
              </div>
              {profile.is_verified && (
                <Badge className="bg-primary/20 text-primary border border-primary/30 gap-1">
                  <ShieldCheck className="h-3 w-3" />
                  Verified
                </Badge>
              )}
            </div>

            {/* Photo + Info */}
            <div className="flex items-start gap-4">
              <Avatar className="h-20 w-20 rounded-xl border-2 border-primary/30 shadow-lg">
                <AvatarImage src={profile.avatar_url ?? undefined} alt={profile.name} />
                <AvatarFallback className="rounded-xl text-lg bg-primary/10 text-primary">
                  {profile.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 space-y-1">
                <h2 className="text-lg font-semibold text-foreground truncate">{profile.name}</h2>
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
            </div>

            {/* Programme tags */}
            {programmes.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {programmes.map((p) => (
                  <Badge
                    key={p.programme_id}
                    variant="secondary"
                    className="text-xs bg-primary/10 text-primary border border-primary/20"
                  >
                    {p.programmes?.name ?? "Programme"}
                  </Badge>
                ))}
              </div>
            )}

            {/* QR Code */}
            <div className="flex justify-center">
              <div className="rounded-xl bg-background p-3 shadow-inner">
                <QRCodeSVG
                  value={qrPayload}
                  size={140}
                  level="H"
                  includeMargin={false}
                  bgColor="transparent"
                  fgColor="hsl(221, 83%, 53%)"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="text-center border-t border-border/30 pt-3">
              <p className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
                Campus Connect — Verified Student
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Download / Share actions */}
      <div className="flex gap-3 w-full max-w-sm">
        <Button
          onClick={handleDownload}
          disabled={downloading}
          className="flex-1 gap-2"
          variant="outline"
        >
          <Download className="h-4 w-4" />
          {downloading ? "Generating…" : "Download ID"}
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

      {/* Hidden downloadable version with full branding */}
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
          {/* Header branding */}
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#D4AF37", letterSpacing: 2 }}>
              Campus Connect
            </div>
          </div>

          {/* Card replica */}
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
                <div style={{ fontSize: 10, fontWeight: 600, color: "#3B82F6", letterSpacing: 3 }}>
                  CAMPUS CONNECT
                </div>
                <div style={{ fontSize: 9, color: "#6B7280", letterSpacing: 1.5 }}>
                  STUDENT IDENTITY CARD
                </div>
              </div>
              {profile.is_verified && (
                <div
                  style={{
                    fontSize: 10,
                    color: "#3B82F6",
                    border: "1px solid rgba(59,130,246,0.3)",
                    borderRadius: 6,
                    padding: "2px 8px",
                    fontWeight: 600,
                  }}
                >
                  ✓ VERIFIED
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 12,
                  backgroundColor: "rgba(59,130,246,0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 24,
                  fontWeight: 700,
                  color: "#3B82F6",
                  overflow: "hidden",
                }}
              >
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt=""
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    crossOrigin="anonymous"
                  />
                ) : (
                  profile.name.slice(0, 2).toUpperCase()
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 600, color: "#E5E7EB" }}>{profile.name}</div>
                {profile.student_id && (
                  <div style={{ fontSize: 13, color: "#9CA3AF", fontFamily: "monospace", letterSpacing: 1.5, marginTop: 2 }}>
                    {profile.student_id}
                  </div>
                )}
                {profile.department && (
                  <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>{profile.department}</div>
                )}
                {profile.class_name && (
                  <div style={{ fontSize: 11, color: "#6B7280", marginTop: 1 }}>{profile.class_name}</div>
                )}
              </div>
            </div>

            {programmes.length > 0 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {programmes.map((p) => (
                  <span
                    key={p.programme_id}
                    style={{
                      fontSize: 10,
                      color: "#3B82F6",
                      border: "1px solid rgba(59,130,246,0.2)",
                      borderRadius: 6,
                      padding: "2px 8px",
                      backgroundColor: "rgba(59,130,246,0.08)",
                    }}
                  >
                    {p.programmes?.name ?? "Programme"}
                  </span>
                ))}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "center", padding: 8 }}>
              <QRCodeSVG
                value={qrPayload}
                size={120}
                level="H"
                bgColor="transparent"
                fgColor="#3B82F6"
              />
            </div>

            <div
              style={{
                textAlign: "center",
                borderTop: "1px solid rgba(255,255,255,0.08)",
                paddingTop: 12,
                fontSize: 9,
                color: "#6B7280",
                letterSpacing: 2,
                textTransform: "uppercase",
              }}
            >
              Campus Connect — Verified Student
            </div>
          </div>

          {/* Footer branding */}
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 11, color: "#9CA3AF", fontStyle: "italic" }}>
              – An LeadCircle Initiative
            </div>
            <div style={{ fontSize: 9, color: "#6B7280", marginTop: 4 }}>
              © Campus Connect. All Rights Reserved.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
