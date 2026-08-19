import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Radio, Clock, MapPin, BookOpen, QrCode,
  Calendar, ChevronRight, Wifi, WifiOff,
} from "@/components/icons";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import AttendanceMarkingCard from "./attendance/AttendanceMarkingCard";

type LectureRow = {
  id: string; topic: string; venue: string;
  lecture_date: string; start_time: string; end_time: string;
  status: "scheduled" | "live" | "ended";
};

function formatTime(t: string) {
  try {
    const [h, m] = t.split(":").map(Number);
    const suffix = h >= 12 ? "PM" : "AM";
    const hour = h % 12 || 12;
    return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
  } catch { return t; }
}

function formatDate(d: string) {
  const today = new Date().toISOString().split("T")[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
  if (d === today) return "Today";
  if (d === tomorrow) return "Tomorrow";
  return new Date(`${d}T00:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

/* ── Live Pulse Dot ── */
function LiveDot() {
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger opacity-75" />
      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-danger" />
    </span>
  );
}

export default function StudentScanAttendance() {
  const [selectedLectureId, setSelectedLectureId] = useState<string | null>(null);
  const today = useMemo(() => new Date().toISOString().split("T")[0], []);

  const lecturesQuery = useQuery({
    queryKey: ["student", "scan_attendance", "lectures", today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lectures")
        .select("id,topic,venue,lecture_date,start_time,end_time,status")
        .gte("lecture_date", today)
        .order("lecture_date", { ascending: true })
        .order("start_time", { ascending: true });
      if (error) throw error;
      return (data ?? []) as LectureRow[];
    },
    refetchInterval: 10_000,
  });

  const lectures = lecturesQuery.data ?? [];
  const liveLecture = lectures.find((l) => l.status === "live") ?? null;
  const upcomingLectures = lectures.filter((l) => l.status === "scheduled");
  const selectedLecture = lectures.find((l) => l.id === selectedLectureId) ?? null;

  // Auto-select live lecture
  useMemo(() => {
    if (liveLecture && !selectedLectureId) setSelectedLectureId(liveLecture.id);
  }, [liveLecture?.id]);

  return (
    <div className="space-y-5 max-w-2xl mx-auto pb-28">

      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <QrCode className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-[20px] font-black text-foreground tracking-tight">Mark Attendance</h1>
            <p className="text-[12px] text-muted-foreground">Scan QR or enter OTP to record your presence</p>
          </div>
        </div>
      </motion.div>

      {/* ── Network / loading indicator ── */}
      {lecturesQuery.isLoading && (
        <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="h-3.5 w-3.5 border-2 border-primary border-t-transparent rounded-full" />
          Checking for live lectures…
        </div>
      )}

      {/* ── LIVE Lecture Banner ── */}
      <AnimatePresence>
        {liveLecture && (
          <motion.div
            key="live-banner"
            initial={{ opacity: 0, scale: 0.97, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="rounded-2xl overflow-hidden border border-danger/30 bg-danger/5 shadow-[0_0_24px_hsl(var(--danger)/0.15)]"
          >
            {/* Top accent */}
            <div className="h-1 bg-gradient-to-r from-danger via-red-400 to-danger" />
            <div className="p-5">
              {/* LIVE badge row */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5 bg-danger/10 border border-danger/25 px-3 py-1.5 rounded-full">
                  <LiveDot />
                  <span className="text-[12px] font-black text-danger tracking-widest uppercase">Live Now</span>
                </div>
                <motion.div
                  animate={{ opacity: [1, 0.4, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="text-[11px] font-semibold text-danger"
                >
                  Attendance Open
                </motion.div>
              </div>

              {/* Lecture info */}
              <h2 className="text-[17px] font-black text-foreground mb-3">{liveLecture.topic}</h2>
              <div className="flex flex-wrap gap-3 mb-4">
                <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 text-danger/60" />
                  {liveLecture.venue}
                </div>
                <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                  <Clock className="h-3.5 w-3.5 text-danger/60" />
                  {formatTime(liveLecture.start_time)} – {formatTime(liveLecture.end_time)}
                </div>
              </div>

              {/* Mark Attendance CTA */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => setSelectedLectureId(liveLecture.id)}
                className={cn(
                  "w-full py-3.5 rounded-xl font-bold text-[14px] flex items-center justify-center gap-2 transition-all duration-150",
                  selectedLectureId === liveLecture.id
                    ? "bg-success/15 border border-success/30 text-success"
                    : "bg-action-danger text-action-danger-foreground border border-action-danger hover:bg-action-danger-hover shadow-lg shadow-danger/20",
                )}
              >
                {selectedLectureId === liveLecture.id ? (
                  <>✓ Marking this lecture</>
                ) : (
                  <><QrCode className="h-4 w-4" /> Mark Attendance</>
                )}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── No live lecture state ── */}
      {!lecturesQuery.isLoading && !liveLecture && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
          className="rounded-2xl border border-border-subtle bg-surface-1 p-5 text-center shadow-sm"
        >
          <div className="h-12 w-12 rounded-2xl bg-surface-3 flex items-center justify-center mx-auto mb-3">
            <WifiOff className="h-6 w-6 text-muted-foreground/50" />
          </div>
          <p className="text-[14px] font-semibold text-foreground mb-1">No Live Lecture</p>
          <p className="text-[12px] text-muted-foreground">
            When your professor starts a session, this page will update automatically.
          </p>
        </motion.div>
      )}

      {/* ── Attendance Marking Card ── */}
      <AnimatePresence mode="wait">
        {selectedLecture && (
          <motion.div
            key={selectedLecture.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {/* Lecture context strip */}
            <div className="rounded-xl border border-border-subtle bg-surface-2 px-4 py-3 mb-3 flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <BookOpen className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-foreground truncate">{selectedLecture.topic}</p>
                <p className="text-[11px] text-muted-foreground">
                  {formatDate(selectedLecture.lecture_date)} · {formatTime(selectedLecture.start_time)} · {selectedLecture.venue}
                </p>
              </div>
              {selectedLecture.status === "live" && (
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-danger flex-shrink-0">
                  <LiveDot /> Live
                </div>
              )}
            </div>

            <AttendanceMarkingCard lectureId={selectedLecture.id} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Upcoming Lectures ── */}
      {upcomingLectures.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
          className="rounded-2xl border border-border-subtle bg-surface-1 overflow-hidden shadow-sm"
        >
          <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border-subtle">
            <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <Calendar className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-[14px] font-bold text-foreground">Upcoming Lectures</p>
              <p className="text-[11px] text-muted-foreground">{upcomingLectures.length} scheduled</p>
            </div>
          </div>
          <div className="divide-y divide-border-subtle/50">
            {upcomingLectures.slice(0, 5).map((l, i) => (
              <motion.button
                key={l.id}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.14 + i * 0.04 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => setSelectedLectureId(l.id)}
                className={cn(
                  "w-full px-5 py-4 flex items-center gap-3 text-left transition-colors hover:bg-surface-2",
                  selectedLectureId === l.id && "bg-primary/5 border-l-2 border-l-primary",
                )}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-foreground truncate">{l.topic}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-primary font-medium">{formatDate(l.lecture_date)}</span>
                    <span className="text-[10px] text-muted-foreground">{formatTime(l.start_time)} – {formatTime(l.end_time)}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                    <MapPin className="h-3 w-3" />{l.venue}
                  </p>
                </div>
                <ChevronRight className={cn("h-4 w-4 transition-colors", selectedLectureId === l.id ? "text-primary" : "text-muted-foreground/40")} />
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Scanner tip card ── */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
        className="rounded-2xl border border-primary/15 bg-primary/5 p-4"
      >
        <div className="flex items-start gap-3">
          <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Wifi className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-[12px] font-semibold text-foreground mb-1">Tips for marking attendance</p>
            <ul className="space-y-1 text-[11px] text-muted-foreground">
              <li>→ Ask your professor to show the QR code or OTP</li>
              <li>→ Allow camera access when prompted for QR scanning</li>
              <li>→ OTP auto-submits when all 6 digits are entered</li>
              <li>→ Attendance can only be marked during a live lecture</li>
            </ul>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
