import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, CalendarDays, List, Trash2, Radio, Clock, MapPin,
  Pencil, Play, StopCircle, ChevronDown, Search, Filter,
} from "@/components/icons";

import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/providers/TenantProvider";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import LectureFormDialog from "./LectureFormDialog";
import LectureFlyerUploader from "./LectureFlyerUploader";

export type LectureRow = {
  id: string;
  topic: string;
  lecture_date: string;
  start_time: string;
  end_time: string;
  venue: string;
  flyer_object_path: string | null;
  status: "scheduled" | "live" | "ended";
  college_id?: string | null;
  created_at: string;
  updated_at: string;
};

function toDateOnlyIso(d: Date) {
  return d.toISOString().slice(0, 10);
}

/* ─── Countdown hook ──────────────────────────────────── */
function useCountdown(lecture: LectureRow | null) {
  const [label, setLabel] = useState("");
  useEffect(() => {
    if (!lecture || lecture.status !== "live") { setLabel(""); return; }
    const tick = () => {
      const end = new Date(`${lecture.lecture_date}T${lecture.end_time}`);
      const diff = end.getTime() - Date.now();
      if (diff <= 0) { setLabel("Ending"); return; }
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setLabel(`${m}m ${s}s left`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lecture]);
  return label;
}

/* ─── Status chip ─────────────────────────────────────── */
function StatusChip({ status }: { status: LectureRow["status"] }) {
  if (status === "live") return (
    <motion.span
      animate={{ opacity: [1, 0.55, 1] }}
      transition={{ repeat: Infinity, duration: 1.6 }}
      className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-danger/15 text-danger border border-danger/25"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-danger" /> LIVE
    </motion.span>
  );
  if (status === "ended") return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface-3 text-muted-foreground border border-border-subtle">
      Ended
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
      Scheduled
    </span>
  );
}

/* ─── Lecture card ────────────────────────────────────── */
function LectureCard({
  lecture, onEdit, onGo, onEnd, onDelete, isPending,
}: {
  lecture: LectureRow;
  onEdit: () => void;
  onGo: () => void;
  onEnd: () => void;
  onDelete: () => void;
  isPending: boolean;
}) {
  const countdown = useCountdown(lecture.status === "live" ? lecture : null);
  const isLive = lecture.status === "live";
  const isEnded = lecture.status === "ended";
  const canGoLive = lecture.status === "scheduled" && (() => {
    const start = new Date(`${lecture.lecture_date}T${lecture.start_time}:00Z`);
    return !Number.isNaN(start.getTime()) && start.getTime() <= Date.now();
  })();

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      className={cn(
        "rounded-2xl border p-4 transition-all duration-150 hover:shadow-sm bg-surface-1",
        isLive ? "border-danger/30 ring-1 ring-danger/10" : "border-border-subtle",
        isEnded && "opacity-70",
      )}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <StatusChip status={lecture.status} />
          {isLive && countdown && (
            <span className="text-[10px] font-semibold text-danger">{countdown}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {!isEnded && (
            <button onClick={onEdit} className="h-7 w-7 rounded-lg bg-surface-2 hover:bg-surface-3 border border-border-subtle flex items-center justify-center transition-colors">
              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
          <button onClick={onDelete} disabled={isPending} className="h-7 w-7 rounded-lg bg-danger/5 hover:bg-danger/10 border border-danger/20 flex items-center justify-center transition-colors">
            <Trash2 className="h-3.5 w-3.5 text-danger" />
          </button>
        </div>
      </div>

      {/* Content */}
      <h3 className="text-[15px] font-bold text-foreground leading-tight mb-2 truncate">{lecture.topic}</h3>
      <div className="flex items-center gap-3 text-[12px] text-muted-foreground flex-wrap mb-4">
        <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{lecture.lecture_date}</span>
        <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{lecture.start_time} – {lecture.end_time}</span>
        <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{lecture.venue}</span>
      </div>

      {/* Flyer */}
      <div className="mb-3">
        <LectureFlyerUploader lecture={lecture} compact />
      </div>

      {/* CTA row */}
      <div className="flex items-center gap-2">
        {lecture.status === "scheduled" && (
          <Button
            size="sm"
            className="flex-1 gap-1.5 h-8 text-[12px]"
            onClick={onGo}
            disabled={isPending || !canGoLive}
            title={!canGoLive ? "Lecture start time not reached" : undefined}
          >
            <Play className="h-3.5 w-3.5" /> Go Live
          </Button>
        )}
        {isLive && (
          <Button
            size="sm"
            variant="destructive"
            className="flex-1 gap-1.5 h-8 text-[12px]"
            onClick={onEnd}
            disabled={isPending}
          >
            <StopCircle className="h-3.5 w-3.5" /> End Lecture
          </Button>
        )}
        {isEnded && (
          <span className="text-[11px] text-muted-foreground italic">Lecture ended</span>
        )}
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════ */
export default function LectureManagementTab() {
  const { collegeId } = useTenant();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editLecture, setEditLecture] = useState<LectureRow | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date | undefined>(new Date());
  const [endConfirmOpen, setEndConfirmOpen] = useState(false);
  const [lectureToEnd, setLectureToEnd] = useState<LectureRow | null>(null);
  const [view, setView] = useState<"cards" | "calendar">("cards");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "scheduled" | "live" | "ended">("all");

  const lecturesQuery = useQuery({
    queryKey: ["admin", "lectures", collegeId],
    queryFn: async (): Promise<LectureRow[]> => {
      let q = supabase
        .from("lectures")
        .select("id,topic,lecture_date,start_time,end_time,venue,flyer_object_path,status,college_id,created_at,updated_at");

      if (collegeId) {
        q = q.eq("college_id", collegeId);
      }

      const { data, error } = await q
        .order("lecture_date", { ascending: false })
        .order("start_time", { ascending: true })
        .limit(500);

      if (error) throw error;
      return (data ?? []) as LectureRow[];
    },
  });

  const setLectureStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: LectureRow["status"] }) => {
      const nowIso = new Date().toISOString();
      const patch: Record<string, unknown> = { status };
      if (status === "live") { patch.live_started_at = nowIso; patch.ended_at = null; }
      if (status === "ended") patch.ended_at = nowIso;
      const { error } = await supabase.from("lectures").update(patch as any).eq("id", id);
      if (error) throw error;
      if (status === "live" || status === "ended") {
        const { error: ne } = await supabase.functions.invoke("lecture-status-notify", { body: { lecture_id: id, status } });
        if (ne) { console.error("lecture-status-notify failed", ne); toast.error("Lecture updated, but notification failed."); }
      }
    },
    onSuccess: async () => { toast.success("Lecture updated"); await qc.invalidateQueries({ queryKey: ["admin", "lectures"] }); },
    onError: (e: any) => toast.error(e?.message || "Failed to update lecture"),
  });

  const deleteLecture = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lectures").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: async () => { toast.success("Lecture deleted"); await qc.invalidateQueries({ queryKey: ["admin", "lectures"] }); },
    onError: (e: any) => toast.error(e?.message || "Failed to delete"),
  });

  /* ── Derived data ── */
  const allLectures = lecturesQuery.data ?? [];
  const liveCount      = allLectures.filter((l) => l.status === "live").length;
  const scheduledCount = allLectures.filter((l) => l.status === "scheduled").length;
  const endedCount     = allLectures.filter((l) => l.status === "ended").length;

  const filtered = useMemo(() => {
    let rows = allLectures;
    if (statusFilter !== "all") rows = rows.filter((l) => l.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter((l) => l.topic.toLowerCase().includes(q) || l.venue.toLowerCase().includes(q));
    }
    return rows;
  }, [allLectures, statusFilter, search]);

  const calendarIndex = useMemo(() => {
    const byDay: Record<string, LectureRow[]> = {};
    for (const r of allLectures) (byDay[r.lecture_date] ??= []).push(r);
    return byDay;
  }, [allLectures]);

  const selectedDayLectures = useMemo(() => {
    if (!selectedDay) return [];
    return calendarIndex[toDateOnlyIso(selectedDay)] ?? [];
  }, [calendarIndex, selectedDay]);

  const lectureDates = useMemo(
    () => Object.keys(calendarIndex).map((d) => new Date(`${d}T00:00:00`)),
    [calendarIndex],
  );

  return (
    <div className="space-y-5">

      {/* ── HEADER ── */}
      <div className="rounded-2xl border border-border-subtle bg-surface-1 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h2 className="text-[18px] font-black text-foreground">Lecture Control Center</h2>
            <p className="text-[12px] text-muted-foreground mt-0.5">Create, manage, and monitor lectures in real time</p>
          </div>
          <Button onClick={() => { setEditLecture(null); setOpen(true); }} className="gap-2 shrink-0">
            <Plus className="h-4 w-4" /> New Lecture
          </Button>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total",     value: allLectures.length, color: "text-foreground",       bg: "bg-surface-2" },
            { label: "Scheduled", value: scheduledCount,     color: "text-primary",           bg: "bg-primary/8" },
            { label: "Live Now",  value: liveCount,          color: liveCount > 0 ? "text-danger" : "text-muted-foreground", bg: liveCount > 0 ? "bg-danger/8" : "bg-surface-2" },
          ].map((s) => (
            <div key={s.label} className={cn("rounded-xl p-3 text-center", s.bg)}>
              <p className={cn("text-[22px] font-black tabular-nums leading-none", s.color)}>{s.value}</p>
              <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-widest font-semibold">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── VIEW TOGGLE + FILTERS ── */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* View toggle */}
        <div className="flex rounded-xl border border-border-subtle bg-surface-1 p-1">
          {(["cards", "calendar"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all",
                view === v ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {v === "cards" ? <List className="h-3.5 w-3.5" /> : <CalendarDays className="h-3.5 w-3.5" />}
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <div className="flex rounded-xl border border-border-subtle bg-surface-1 p-1 gap-1">
          {(["all", "scheduled", "live", "ended"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[11px] font-semibold capitalize transition-all",
                statusFilter === s ? "bg-surface-3 text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[140px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search topic or venue…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 text-[13px] rounded-xl"
          />
        </div>
      </div>

      {/* ── CARDS VIEW ── */}
      {view === "cards" && (
        <div>
          {lecturesQuery.isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="rounded-2xl border border-border-subtle bg-surface-1 h-52 animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border-subtle bg-surface-1 py-16 text-center">
              <Radio className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-[14px] font-semibold text-muted-foreground">No lectures found</p>
              <p className="text-[12px] text-muted-foreground/60 mt-1">Create a lecture or adjust your filters</p>
            </div>
          ) : (
            <AnimatePresence>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filtered.map((l) => (
                  <LectureCard
                    key={l.id}
                    lecture={l}
                    onEdit={() => { setEditLecture(l); setOpen(true); }}
                    onGo={() => setLectureStatus.mutate({ id: l.id, status: "live" })}
                    onEnd={() => { setLectureToEnd(l); setEndConfirmOpen(true); }}
                    onDelete={() => deleteLecture.mutate(l.id)}
                    isPending={setLectureStatus.isPending || deleteLecture.isPending}
                  />
                ))}
              </div>
            </AnimatePresence>
          )}
        </div>
      )}

      {/* ── CALENDAR VIEW ── */}
      {view === "calendar" && (
        <div className="grid gap-4 lg:grid-cols-[360px,1fr]">
          <div className="rounded-2xl border border-border-subtle bg-surface-1 p-4 shadow-xs">
            <p className="text-[13px] font-bold text-foreground mb-3">Schedule Calendar</p>
            <Calendar
              mode="single"
              selected={selectedDay}
              onSelect={setSelectedDay}
              modifiers={{ hasLecture: lectureDates }}
              modifiersClassNames={{ hasLecture: "bg-primary/10 text-primary font-bold rounded-full" }}
              className="pointer-events-auto"
            />
          </div>

          <div className="rounded-2xl border border-border-subtle bg-surface-1 p-4 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[13px] font-bold text-foreground">
                  {selectedDay ? selectedDay.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }) : "Select a date"}
                </p>
                <p className="text-[11px] text-muted-foreground">{selectedDayLectures.length} lecture{selectedDayLectures.length !== 1 ? "s" : ""}</p>
              </div>
            </div>
            {selectedDayLectures.length === 0 ? (
              <div className="py-10 text-center rounded-xl border border-dashed border-border-subtle bg-surface-2">
                <CalendarDays className="h-7 w-7 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-[13px] text-muted-foreground">No lectures on this day</p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedDayLectures.map((l) => (
                  <div key={l.id} className={cn("rounded-xl border p-4", l.status === "live" ? "border-danger/25 bg-danger/5" : "border-border-subtle bg-surface-2")}>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <StatusChip status={l.status} />
                      <button onClick={() => { setEditLecture(l); setOpen(true); }} className="text-[11px] text-primary font-semibold hover:underline flex items-center gap-1">
                        <Pencil className="h-3 w-3" /> Edit
                      </button>
                    </div>
                    <p className="text-[14px] font-bold text-foreground">{l.topic}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">{l.start_time} – {l.end_time} · {l.venue}</p>
                    <div className="mt-3">
                      <LectureFlyerUploader lecture={l} compact />
                    </div>
                    <div className="flex gap-2 mt-3">
                      {l.status === "scheduled" && (
                        <Button size="sm" className="h-7 text-xs gap-1" onClick={() => setLectureStatus.mutate({ id: l.id, status: "live" })} disabled={setLectureStatus.isPending}>
                          <Play className="h-3 w-3" /> Go Live
                        </Button>
                      )}
                      {l.status === "live" && (
                        <Button size="sm" variant="destructive" className="h-7 text-xs gap-1" onClick={() => { setLectureToEnd(l); setEndConfirmOpen(true); }} disabled={setLectureStatus.isPending}>
                          <StopCircle className="h-3 w-3" /> End
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── DIALOGS ── */}
      <LectureFormDialog
        open={open}
        onOpenChange={setOpen}
        lecture={editLecture}
        onSaved={async () => { await qc.invalidateQueries({ queryKey: ["admin", "lectures"] }); }}
      />

      <AlertDialog open={endConfirmOpen} onOpenChange={setEndConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End lecture "{lectureToEnd?.topic}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This marks the lecture as ended for all students and sends a notification. This cannot be undone from here.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setLectureToEnd(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (!lectureToEnd) return;
              setLectureStatus.mutate({ id: lectureToEnd.id, status: "ended" });
              setEndConfirmOpen(false);
              setLectureToEnd(null);
            }}>
              End Lecture
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
