import { useEffect, useMemo, useState, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { QRCodeCanvas } from "qrcode.react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarClock, CheckCircle2, QrCode, RefreshCw, ShieldCheck,
  Timer, Printer, Users, UserCheck, Radio, Clock, BarChart3,
  AlertTriangle, TrendingUp, Zap, ArrowRight,
} from "@/components/icons";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AdminAttendanceLiveView from "@/pages/admin/attendance/AdminAttendanceLiveView";
import AdminManualAttendanceDialog from "@/pages/admin/attendance/AdminManualAttendanceDialog";
import { cn } from "@/lib/utils";

const generateSchema = z.object({ lectureId: z.string().uuid() });

type LectureRow = {
  id: string; topic: string; lecture_date: string;
  start_time: string; end_time: string; venue: string; status: string;
};
type TokenRow = {
  id: string; lecture_id: string; token: string;
  expires_at: string; is_active: boolean; used_count: number;
};
type GenerateResponse = {
  otp: string; token: string; expiresAt: string;
  debugId?: string; error?: string; success?: boolean; message?: string;
};

function buildQrPayload(lectureId: string, token: string) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/lectures/${lectureId}?token=${encodeURIComponent(token)}`;
}

function msUntil(iso: string) { return new Date(iso).getTime() - Date.now(); }

function humanCountdown(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

function useCountdownState(expiresAt: string | undefined) {
  const [ms, setMs] = useState<number>(0);
  useEffect(() => {
    if (!expiresAt) { setMs(0); return; }
    const tick = () => setMs(msUntil(expiresAt));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);
  return ms;
}

// ── Weekly attendance trend for the selected lecture's college ────────────────
function useWeeklyTrend() {
  return useQuery({
    queryKey: ["admin", "attendance", "weekly-trend"],
    queryFn: async () => {
      const days: { label: string; pct: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().slice(0, 10);
        const label = d.toLocaleDateString("en-US", { weekday: "short" });

        const [{ count: presented }, { count: total }] = await Promise.all([
          supabase.from("attendance").select("id", { count: "exact", head: true })
            .gte("marked_at", dateStr + "T00:00:00Z")
            .lte("marked_at", dateStr + "T23:59:59Z")
            .eq("status", "present"),
          supabase.from("lectures").select("id", { count: "exact", head: true })
            .eq("lecture_date", dateStr),
        ]);
        days.push({ label, pct: total ? Math.min(100, Math.round(((presented ?? 0) / Math.max(1, total ?? 1)) * 100)) : 0 });
      }
      return days;
    },
    staleTime: 120_000,
  });
}

// ── Lecture status badge ──────────────────────────────────────────────────────
function LectureStatusDot({ status }: { status: string }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full border",
      status === "live" ? "bg-success/10 text-success border-success/20" :
      status === "scheduled" ? "bg-primary/10 text-primary border-primary/20" :
      "bg-muted text-muted-foreground border-border-subtle"
    )}>
      <span className={cn("w-1.5 h-1.5 rounded-full", status === "live" ? "bg-success animate-pulse" : status === "scheduled" ? "bg-primary" : "bg-muted-foreground")} />
      {status === "live" ? "LIVE" : status === "scheduled" ? "Scheduled" : "Ended"}
    </span>
  );
}

// ── Trend bar ─────────────────────────────────────────────────────────────────
function TrendBar({ pct, label }: { pct: number; label: string }) {
  return (
    <div className="flex items-center gap-2 group">
      <span className="text-[10px] text-muted-foreground w-7 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-surface-3 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="h-full rounded-full bg-primary/70"
        />
      </div>
      <span className="text-[10px] text-muted-foreground w-7 text-right tabular-nums shrink-0">{pct}%</span>
    </div>
  );
}

export default function AdminAttendanceControlTab({ defaultLectureId }: { defaultLectureId?: string }) {
  const qc = useQueryClient();
  const [lectureId, setLectureId] = useState<string>(defaultLectureId ?? "");
  const [posterOpen, setPosterOpen] = useState(false);
  const [lastGenerateError, setLastGenerateError] = useState<null | { debugId?: string; raw: unknown }>(null);

  const lecturesQuery = useQuery({
    queryKey: ["admin", "lectures", "for-attendance"],
    queryFn: async (): Promise<LectureRow[]> => {
      const today = new Date().toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("lectures")
        .select("id,topic,lecture_date,start_time,end_time,venue,status")
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

  const summaryQuery = useQuery({
    queryKey: ["admin", "attendance", "summary", lectureId],
    enabled: Boolean(lectureId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_lecture_attendance_summary", { p_lecture_id: lectureId });
      if (error) throw error;
      return data as { present_count: number; total_students: number; attendance_percentage: number };
    },
    refetchInterval: 5_000,
  });

  const weeklyTrendQ = useWeeklyTrend();

  const generateMutation = useMutation({
    mutationFn: async () => {
      const parsed = generateSchema.safeParse({ lectureId });
      if (!parsed.success) throw new Error("Select a lecture first");
      const { data, error } = await supabase.functions.invoke<GenerateResponse>("admin-generate-attendance", {
        body: { lectureId: parsed.data.lectureId },
      });
      if (error) {
        const anyErr = error as any;
        const bodyText: string | undefined = anyErr?.context?.body;
        if (typeof bodyText === "string") {
          try {
            const parsedBody = JSON.parse(bodyText);
            setLastGenerateError({ debugId: parsedBody?.debugId, raw: parsedBody });
            throw new Error(JSON.stringify(parsedBody));
          } catch { setLastGenerateError({ raw: bodyText }); throw new Error(bodyText); }
        }
        setLastGenerateError({ raw: { message: error.message } });
        throw new Error(error.message);
      }
      if (data?.error) { setLastGenerateError({ debugId: data.debugId, raw: data }); throw new Error(JSON.stringify(data)); }
      if (!data?.otp || !data?.token) throw new Error("Failed to generate OTP/token");
      setLastGenerateError(null);
      return data;
    },
    onSuccess: async (data) => {
      toast.success("OTP/QR generated — session active");
      if (data?.debugId) { try { localStorage.setItem("cc:lastDebugId", data.debugId); } catch {} }
      await qc.invalidateQueries({ queryKey: ["admin", "attendance", "active-token", lectureId] });
      setPosterOpen(true);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to generate"),
  });

  const finalizeMutation = useMutation({
    mutationFn: async () => {
      if (!lectureId) throw new Error("Select a lecture first");
      const { data, error } = await supabase.functions.invoke<{ message?: string }>("finalize-attendance", { body: { lectureId } });
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: async () => {
      toast.success("Attendance session finalized");
      await qc.invalidateQueries({ queryKey: ["admin", "attendance", "active-token", lectureId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to finalize"),
  });

  const selectedLecture = useMemo(() => (lecturesQuery.data ?? []).find((l) => l.id === lectureId) ?? null, [lecturesQuery.data, lectureId]);
  const remainingMs = useCountdownState(activeTokenQuery.data?.expires_at);
  const totalMs = 10 * 60 * 1000; // 10 min default
  const timerPct = activeTokenQuery.data ? Math.max(0, Math.min(100, (remainingMs / totalMs) * 100)) : 0;
  const qrValue = useMemo(() => {
    const t = activeTokenQuery.data;
    return t ? buildQrPayload(t.lecture_id, t.token) : null;
  }, [activeTokenQuery.data]);

  const busy = generateMutation.isPending || finalizeMutation.isPending;
  const summary = summaryQuery.data;
  const hasToken = Boolean(activeTokenQuery.data);
  const isLive = selectedLecture?.status === "live";

  return (
    <div className="space-y-5">
      {/* ── Header row ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-base font-semibold text-foreground">Attendance Control</h2>
          <p className="text-xs text-muted-foreground">Generate OTP/QR, monitor live check-ins, finalize sessions</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs"
            onClick={() => qc.invalidateQueries({ queryKey: ["admin", "attendance", "active-token", lectureId] })}
            disabled={!lectureId || busy}>
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
          <AdminManualAttendanceDialog defaultLectureId={lectureId}
            trigger={<Button variant="outline" size="sm" className="gap-1.5 text-xs" disabled={!lectureId}><UserCheck className="h-3.5 w-3.5" /> Manual Override</Button>}
          />
          <Button size="sm" onClick={() => generateMutation.mutate()} disabled={!lectureId || busy} className="gap-1.5 text-xs">
            <QrCode className="h-3.5 w-3.5" /> Generate OTP/QR
          </Button>
          <Button variant="outline" size="sm" onClick={() => finalizeMutation.mutate()} disabled={!lectureId || busy} className="gap-1.5 text-xs">
            <CheckCircle2 className="h-3.5 w-3.5" /> Finalize
          </Button>
        </div>
      </div>

      {/* ── Lecture selector ── */}
      <div className="rounded-2xl border border-border-subtle bg-surface-1 p-4 shadow-xs">
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold mb-2">Select Lecture</p>
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <Select value={lectureId} onValueChange={setLectureId}>
            <SelectTrigger className="flex-1 max-w-xl bg-surface-2 border-border-subtle">
              <SelectValue placeholder="Choose a lecture to manage attendance…" />
            </SelectTrigger>
            <SelectContent className="bg-surface-1 border-border-subtle">
              {(lecturesQuery.data ?? []).map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  <div className="flex items-center gap-2">
                    <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", l.status === "live" ? "bg-success" : l.status === "scheduled" ? "bg-primary" : "bg-muted-foreground")} />
                    {l.lecture_date} • {l.start_time}–{l.end_time} • {l.topic}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedLecture && <LectureStatusDot status={selectedLecture.status} />}
        </div>
      </div>

      {/* ── Error panel ── */}
      {lastGenerateError && (
        <div className="rounded-xl border border-danger/30 bg-danger/5 p-4">
          <p className="text-sm font-medium text-danger">Token generation failed</p>
          {lastGenerateError.debugId && (
            <p className="text-xs text-muted-foreground mt-1">Debug ID: <span className="font-mono">{lastGenerateError.debugId}</span></p>
          )}
          <pre className="mt-3 max-h-48 overflow-auto rounded-lg bg-background p-3 text-xs">{JSON.stringify(lastGenerateError.raw, null, 2)}</pre>
        </div>
      )}

      {/* ── Main grid: Live session + Trend ── */}
      {lectureId && (
        <div className="grid gap-5 lg:grid-cols-3">
          {/* Live session card */}
          <div className={cn(
            "lg:col-span-2 rounded-2xl border overflow-hidden dashboard-panel shadow-sm bg-surface-1",
            isLive ? "border-success/30 ring-1 ring-success/10" : "border-border-subtle"
          )}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
              <div className="flex items-center gap-2.5">
                <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", isLive ? "bg-success/10" : "bg-surface-3")}>
                  <Radio className={cn("h-4 w-4", isLive ? "text-success" : "text-muted-foreground")} />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-foreground">Live Session</p>
                  <p className="text-[11px] text-muted-foreground">{selectedLecture ? `${selectedLecture.topic} • ${selectedLecture.venue}` : "No lecture selected"}</p>
                </div>
              </div>
              {hasToken && (
                <motion.div animate={{ opacity: [1, 0.5, 1] }} transition={{ repeat: Infinity, duration: 1.8 }}
                  className="flex items-center gap-1.5 bg-success/10 text-success text-[11px] font-semibold px-2.5 py-1 rounded-full border border-success/25">
                  <span className="w-1.5 h-1.5 rounded-full bg-success" />SESSION ACTIVE
                </motion.div>
              )}
            </div>

            <div className="p-5 space-y-5">
              {/* Attendance stats */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Expected", value: summaryQuery.isLoading ? "…" : String(summary?.total_students ?? 0), icon: Users, color: "text-primary", bg: "bg-primary/10" },
                  { label: "Present", value: summaryQuery.isLoading ? "…" : String(summary?.present_count ?? 0), icon: CheckCircle2, color: "text-success", bg: "bg-success/10" },
                  { label: "Rate", value: summaryQuery.isLoading ? "…" : `${summary?.attendance_percentage ?? 0}%`, icon: BarChart3, color: "text-warning", bg: "bg-warning/10" },
                ].map(({ label, value, icon: Icon, color, bg }) => (
                  <div key={label} className="rounded-xl border border-border-subtle bg-surface-2 p-3 text-center">
                    <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center mx-auto mb-1.5", bg)}>
                      <Icon className={cn("h-3.5 w-3.5", color)} />
                    </div>
                    <p className="text-[18px] font-bold text-foreground tabular-nums">{value}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{label}</p>
                  </div>
                ))}
              </div>

              {/* Attendance progress bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Attendance Progress</span>
                  <span className="tabular-nums font-medium text-foreground">{summary?.present_count ?? 0} / {summary?.total_students ?? 0}</span>
                </div>
                <Progress value={summaryQuery.isLoading ? 0 : summary?.attendance_percentage ?? 0} className="h-2" />
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-muted-foreground">{summary?.attendance_percentage ?? 0}% attendance rate</span>
                  {(summary?.attendance_percentage ?? 0) >= 75 && (
                    <span className="flex items-center gap-1 text-success font-medium">
                      <CheckCircle2 className="h-3 w-3" /> Good attendance
                    </span>
                  )}
                  {(summary?.attendance_percentage ?? 0) > 0 && (summary?.attendance_percentage ?? 0) < 60 && (
                    <span className="flex items-center gap-1 text-warning font-medium">
                      <AlertTriangle className="h-3 w-3" /> Below threshold
                    </span>
                  )}
                </div>
              </div>

              {/* Active token panel */}
              {activeTokenQuery.isLoading ? (
                <Skeleton className="h-20 w-full rounded-xl" />
              ) : activeTokenQuery.data ? (
                <div className="space-y-3">
                  {/* Countdown timer */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-surface-2 border border-border-subtle">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-lg bg-warning/10 flex items-center justify-center">
                        <Clock className="h-3.5 w-3.5 text-warning" />
                      </div>
                      <div>
                        <p className="text-[11px] text-muted-foreground">Session expires in</p>
                        <p className={cn("text-base font-bold tabular-nums", remainingMs < 60000 ? "text-danger" : "text-foreground")}>
                          {remainingMs <= 0 ? "Expired" : humanCountdown(remainingMs)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-muted-foreground">Scanned</p>
                      <p className="text-base font-bold text-foreground tabular-nums">{activeTokenQuery.data.used_count}</p>
                    </div>
                  </div>
                  {/* Timer bar */}
                  <div className="space-y-1">
                    <Progress value={timerPct} className={cn("h-1.5", remainingMs < 60000 ? "[&>div]:bg-danger" : remainingMs < 120000 ? "[&>div]:bg-warning" : "")} />
                    <p className="text-[10px] text-muted-foreground">{timerPct > 0 ? "Session active" : "Session expired"}</p>
                  </div>
                  {/* OTP display */}
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] text-muted-foreground">OTP (last generated)</p>
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setPosterOpen(true)} disabled={!qrValue}>
                      <Printer className="h-3.5 w-3.5" /> Print QR Poster
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-surface-2 border border-border-subtle border-dashed">
                  <div className="h-9 w-9 rounded-full bg-surface-3 flex items-center justify-center shrink-0">
                    <QrCode className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-foreground">No active token</p>
                    <p className="text-[11px] text-muted-foreground">Generate OTP/QR to open an attendance session.</p>
                  </div>
                  <Button size="sm" className="ml-auto gap-1.5 text-xs shrink-0" onClick={() => generateMutation.mutate()} disabled={!lectureId || busy}>
                    <Zap className="h-3.5 w-3.5" /> Start
                  </Button>
                </div>
              )}

              {/* QR Preview */}
              {qrValue && (
                <div className="flex items-center gap-4 p-3 rounded-xl bg-surface-2 border border-border-subtle">
                  <div className="rounded-lg border border-border-subtle bg-white p-1.5 shrink-0">
                    <QRCodeCanvas value={qrValue} size={80} includeMargin={false} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium text-foreground">QR Code active</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Students scan this or enter OTP to mark attendance</p>
                    <Button variant="outline" size="sm" className="mt-2 gap-1.5 text-xs" onClick={() => setPosterOpen(true)}>
                      View Full QR <ArrowRight className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 7-day trend */}
          <div className="rounded-2xl border border-border-subtle bg-surface-1 overflow-hidden dashboard-panel shadow-sm">
            <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border-subtle">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-foreground">7-Day Attendance Trend</p>
                <p className="text-[11px] text-muted-foreground">Attendance events per day</p>
              </div>
            </div>
            <div className="p-5 space-y-2.5">
              {weeklyTrendQ.isLoading ? (
                <div className="space-y-2">
                  {[...Array(7)].map((_, i) => <Skeleton key={i} className="h-4 w-full rounded" />)}
                </div>
              ) : (
                (weeklyTrendQ.data ?? []).map((d) => <TrendBar key={d.label} label={d.label} pct={d.pct} />)
              )}
              <div className="pt-2 border-t border-border-subtle">
                <p className="text-[10px] text-muted-foreground">Avg: {weeklyTrendQ.data ? Math.round((weeklyTrendQ.data ?? []).reduce((s, d) => s + d.pct, 0) / 7) : 0}% this week</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Live View ── */}
      {lectureId && <AdminAttendanceLiveView lectureId={lectureId} />}

      {/* ── Print QR Poster Dialog ── */}
      <Dialog open={posterOpen} onOpenChange={setPosterOpen}>
        <DialogContent className="max-w-2xl bg-surface-1 border-border-subtle">
          <DialogHeader>
            <DialogTitle>Printable QR Poster</DialogTitle>
            <DialogDescription>Print and display at the lecture venue.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div id="print-area" className="rounded-xl border border-border-subtle p-6">
              <div className="text-center space-y-2">
                <p className="text-xl font-bold text-foreground">Campus Connect</p>
                <p className="text-[13px] text-muted-foreground">Attendance QR Code</p>
                {selectedLecture && (
                  <div className="text-sm">
                    <p className="font-semibold text-foreground">{selectedLecture.topic}</p>
                    <p className="text-muted-foreground text-xs">{selectedLecture.lecture_date} • {selectedLecture.start_time}–{selectedLecture.end_time} • {selectedLecture.venue}</p>
                  </div>
                )}
              </div>
              <div className="mt-6 grid place-items-center">
                {qrValue ? <QRCodeCanvas value={qrValue} size={300} includeMargin /> : null}
              </div>
              <div className="mt-6 text-center">
                <p className="text-xs text-muted-foreground">Or enter OTP code</p>
                <p className="text-4xl font-bold tracking-[0.4em] mt-1 text-foreground">{generateMutation.data?.otp ?? "———"}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Expires: {activeTokenQuery.data?.expires_at ? new Date(activeTokenQuery.data.expires_at).toLocaleString() : "—"}
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPosterOpen(false)}>Close</Button>
              <Button className="gap-2" onClick={() => window.print()} disabled={!qrValue}>
                <Printer className="h-4 w-4" /> Print
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
