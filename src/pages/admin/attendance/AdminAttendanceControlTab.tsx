import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { QRCodeCanvas } from "qrcode.react";
import {
  CalendarClock,
  CheckCircle2,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Timer,
  Printer,
  Users,
  Download,
} from "lucide-react";


import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import AdminAttendanceLiveView from "@/pages/admin/attendance/AdminAttendanceLiveView";

const generateSchema = z.object({
  lectureId: z.string().uuid(),
});

type LectureRow = {
  id: string;
  topic: string;
  lecture_date: string;
  start_time: string;
  end_time: string;
  venue: string;
};

type TokenRow = {
  id: string;
  lecture_id: string;
  token: string;
  expires_at: string;
  is_active: boolean;
  used_count: number;
};

type GenerateResponse = {
  otp: string;
  token: string;
  expiresAt: string;
  message?: string;
};

type Props = {
  defaultLectureId?: string;
};

function formatLectureLabel(l: LectureRow) {
  return `${l.lecture_date} • ${l.start_time}-${l.end_time} • ${l.topic}`;
}

function buildQrPayload(lectureId: string, token: string) {
  // Deep-link QR: lets students open the exact lecture detail page and auto-fill token.
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/lectures/${lectureId}?token=${encodeURIComponent(token)}`;
}

function msUntil(iso: string) {
  const t = new Date(iso).getTime();
  return t - Date.now();
}

function humanCountdown(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

export default function AdminAttendanceControlTab({ defaultLectureId }: Props) {
  const qc = useQueryClient();
  const [lectureId, setLectureId] = useState<string>(defaultLectureId ?? "");
  const [posterOpen, setPosterOpen] = useState(false);

  const lecturesQuery = useQuery({
    queryKey: ["admin", "lectures", "for-attendance"],
    queryFn: async (): Promise<LectureRow[]> => {
      const today = new Date().toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("lectures")
        .select("id,topic,lecture_date,start_time,end_time,venue")
        .gte("lecture_date", today)
        .order("lecture_date", { ascending: true })
        .order("start_time", { ascending: true })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as LectureRow[];
    },
  });

  const activeTokenQuery = useQuery({
    queryKey: ["admin", "attendance", "active-token", lectureId],
    enabled: Boolean(lectureId),
    queryFn: async (): Promise<TokenRow | null> => {
      if (!lectureId) return null;
      const { data, error } = await supabase
        .from("attendance_tokens")
        .select("id,lecture_id,token,expires_at,is_active,used_count")
        .eq("lecture_id", lectureId)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as TokenRow | null;
    },
    refetchInterval: 5_000,
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const parsed = generateSchema.safeParse({ lectureId });
      if (!parsed.success) throw new Error("Select a lecture first");

      const { data, error } = await supabase.functions.invoke<GenerateResponse>("admin-generate-attendance", {
        body: { lectureId: parsed.data.lectureId },
      });
      if (error) throw new Error(error.message);
      if (!data?.otp || !data?.token) throw new Error("Failed to generate OTP/token");
      return data;
    },
    onSuccess: async () => {
      toast.success("OTP/QR generated");
      await qc.invalidateQueries({ queryKey: ["admin", "attendance", "active-token", lectureId] });
      setPosterOpen(true);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to generate"),
  });

  const finalizeMutation = useMutation({
    mutationFn: async () => {
      if (!lectureId) throw new Error("Select a lecture first");
      const { data, error } = await supabase.functions.invoke<{ message?: string }>("finalize-attendance", {
        body: { lectureId },
      });
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: async () => {
      toast.success("Attendance finalized");
      await qc.invalidateQueries({ queryKey: ["admin", "attendance", "active-token", lectureId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to finalize"),
  });

  const selectedLecture = useMemo(
    () => (lecturesQuery.data ?? []).find((l) => l.id === lectureId) ?? null,
    [lecturesQuery.data, lectureId],
  );

  const countdown = useMemo(() => {
    const t = activeTokenQuery.data;
    if (!t?.expires_at) return null;
    return humanCountdown(msUntil(t.expires_at));
  }, [activeTokenQuery.data?.expires_at]);

  const qrValue = useMemo(() => {
    const t = activeTokenQuery.data;
    if (!t) return null;
    return buildQrPayload(t.lecture_id, t.token);
  }, [activeTokenQuery.data]);

  const busy = generateMutation.isPending || finalizeMutation.isPending;

  return (
    <div className="space-y-6">
      <Card className="border-primary/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Attendance Control
          </CardTitle>
          <CardDescription>
            Generate a 10-minute OTP + QR token per lecture, track live scans, and finalize attendance.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="w-full max-w-xl">
              <Select value={lectureId} onValueChange={setLectureId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a lecture" />
                </SelectTrigger>
                <SelectContent>
                  {(lecturesQuery.data ?? []).map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {formatLectureLabel(l)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => qc.invalidateQueries({ queryKey: ["admin", "attendance", "active-token", lectureId] })}
                disabled={!lectureId || busy}
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
              <Button onClick={() => generateMutation.mutate()} disabled={!lectureId || busy} className="gap-2">
                <QrCode className="h-4 w-4" />
                Generate OTP/QR
              </Button>
              <Button
                variant="outline"
                onClick={() => finalizeMutation.mutate()}
                disabled={!lectureId || busy}
                className="gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                Finalize
              </Button>
            </div>
          </div>

          <Separator />

          {lectureId ? <AdminAttendanceLiveView lectureId={lectureId} /> : null}

          <Separator />

          {!lectureId ? (
            <div className="text-sm text-muted-foreground">Select a lecture to begin.</div>
          ) : activeTokenQuery.isLoading ? (
            <div className="text-sm text-muted-foreground">Loading active token…</div>
          ) : !activeTokenQuery.data ? (
            <div className="rounded-lg border border-border/60 p-4">
              <div className="font-medium">No active token</div>
              <p className="text-sm text-muted-foreground mt-1">
                Generate an OTP/QR to allow students to mark attendance.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="border-primary/10">
                <CardHeader>
                  <CardTitle className="text-base">Live Session</CardTitle>
                  <CardDescription>Active token status and scan count.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="bg-success text-success-foreground">Active</Badge>
                    {countdown ? (
                      <Badge variant="secondary" className="gap-2">
                        <Timer className="h-4 w-4" />
                        Expires in {countdown}
                      </Badge>
                    ) : null}
                    <Badge variant="secondary" className="gap-2">
                      <CalendarClock className="h-4 w-4" />
                      Used {activeTokenQuery.data.used_count}
                    </Badge>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    Token expires at: {new Date(activeTokenQuery.data.expires_at).toLocaleString()}
                  </div>

                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => setPosterOpen(true)}
                    disabled={!qrValue}
                  >
                    <Printer className="h-4 w-4" />
                    Print QR Poster
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-primary/10">
                <CardHeader>
                  <CardTitle className="text-base">QR Preview</CardTitle>
                  <CardDescription>Students can scan this code to mark attendance.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid place-items-center rounded-lg border border-border/60 bg-muted/20 p-6">
                    {qrValue ? (
                      <QRCodeCanvas value={qrValue} size={220} includeMargin />
                    ) : (
                      <div className="text-sm text-muted-foreground">Generate a token to preview QR.</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={posterOpen} onOpenChange={setPosterOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Printable QR Poster</DialogTitle>
            <DialogDescription>Print and display at the lecture venue. OTP is shown once here.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div id="print-area" className="rounded-lg border border-border/60 p-6">
              <div className="text-center space-y-2">
                <div className="text-2xl font-bold">Campus Connect</div>
                <div className="text-muted-foreground">Attendance QR</div>
                {selectedLecture ? (
                  <div className="text-sm">
                    <div className="font-medium">{selectedLecture.topic}</div>
                    <div className="text-muted-foreground">
                      {selectedLecture.lecture_date} • {selectedLecture.start_time}-{selectedLecture.end_time} • {selectedLecture.venue}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="mt-6 grid place-items-center">
                {qrValue ? <QRCodeCanvas value={qrValue} size={320} includeMargin /> : null}
              </div>

              <div className="mt-6 text-center">
                <div className="text-sm text-muted-foreground">Alternatively, enter OTP</div>
                <div className="text-4xl font-bold tracking-[0.4em]">
                  {generateMutation.data?.otp ?? "———"}
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Expires: {activeTokenQuery.data?.expires_at ? new Date(activeTokenQuery.data.expires_at).toLocaleString() : "—"}
                </div>
              </div>

              <div className="mt-6 text-center text-xs text-muted-foreground">
                Open the lecture page and scan the QR, or type OTP in the attendance prompt.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" onClick={() => setPosterOpen(false)}>
                Close
              </Button>
              <Button
                className="gap-2"
                onClick={() => {
                  // basic print: prints whole page; we keep poster centered.
                  window.print();
                }}
                disabled={!qrValue}
              >
                <Printer className="h-4 w-4" />
                Print
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
