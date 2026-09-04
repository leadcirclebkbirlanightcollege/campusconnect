import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock, MapPin, BookOpen, QrCode,
  Calendar, ChevronRight, Wifi, WifiOff, CheckCircle2
} from "@/components/icons";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import AttendanceMarkingCard from "./attendance/AttendanceMarkingCard";
import { useFestivalTheme } from "@/contexts/FestivalThemeContext";
import { FestiveBadge } from "@/components/festive/FestiveDecorations";

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
  const { isFestive } = useFestivalTheme();
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
    <div className="space-y-6 max-w-2xl mx-auto pb-28">
      {/* ── Native Page Header ── */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-sm">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-foreground tracking-tight">Mark Lecture Attendance</h1>
                {isFestive && <FestiveBadge />}
              </div>
              <p className="text-xs text-muted-foreground">Scan dynamic QR code or enter the session OTP</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Network Loading Indicator ── */}
      {lecturesQuery.isLoading && (
        <div className="flex items-center gap-2.5 text-xs text-muted-foreground bg-surface-1 border border-border-subtle p-3.5 rounded-2xl">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
          <span>Connecting to live campus attendance engine…</span>
        </div>
      )}

      {/* ── LIVE Lecture Banner ── */}
      <AnimatePresence>
        {liveLecture && (
          <motion.div
            key="live-banner"
            initial={{ opacity: 0, scale: 0.98, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="rounded-3xl overflow-hidden border border-danger/30 bg-surface-1 shadow-lg shadow-danger/10"
          >
            <div className="h-1.5 bg-gradient-to-r from-danger via-red-400 to-danger" />
            <div className="p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 bg-danger/10 border border-danger/20 px-3 py-1 rounded-full">
                  <LiveDot />
                  <span className="text-[11px] font-black text-danger tracking-widest uppercase">Live Class</span>
                </div>
                <span className="text-xs font-mono font-bold text-danger">Attendance Open</span>
              </div>

              <div>
                <h2 className="text-lg font-black text-foreground">{liveLecture.topic}</h2>
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-1.5">
                  <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-danger" /> {liveLecture.venue}</span>
                  <span>·</span>
                  <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-danger" /> {formatTime(liveLecture.start_time)} – {formatTime(liveLecture.end_time)}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedLectureId(liveLecture.id)}
                className={cn(
                  "w-full h-12 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]",
                  selectedLectureId === liveLecture.id
                    ? "bg-success/15 border border-success/30 text-success"
                    : "bg-danger text-white shadow-md shadow-danger/25 hover:bg-danger/90",
                )}
              >
                {selectedLectureId === liveLecture.id ? (
                  <><CheckCircle2 className="h-4 w-4" /> Ready to mark attendance</>
                ) : (
                  <><QrCode className="h-4 w-4" /> Select this lecture</>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── No Live Lecture State ── */}
      {!lecturesQuery.isLoading && !liveLecture && (
        <div className="rounded-3xl border border-border-subtle bg-surface-1 p-8 text-center space-y-2">
          <div className="h-12 w-12 rounded-2xl bg-surface-2 flex items-center justify-center mx-auto text-muted-foreground">
            <WifiOff className="h-6 w-6 opacity-60" />
          </div>
          <h3 className="text-sm font-bold text-foreground">No Live Session Right Now</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            When your professor starts a lecture, this screen will update automatically with the QR scanner.
          </p>
        </div>
      )}

      {/* ── Active Marking Card Viewport ── */}
      <AnimatePresence mode="wait">
        {selectedLecture && (
          <motion.div
            key={selectedLecture.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-3"
          >
            <div className="rounded-2xl border border-border-subtle bg-surface-2/70 px-4 py-3 flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <BookOpen className="h-4.5 w-4.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-foreground truncate">{selectedLecture.topic}</p>
                <p className="text-[11px] text-muted-foreground">
                  {formatDate(selectedLecture.lecture_date)} · {formatTime(selectedLecture.start_time)} · {selectedLecture.venue}
                </p>
              </div>
              {selectedLecture.status === "live" && (
                <span className="text-[10px] font-black uppercase text-danger bg-danger/10 px-2 py-0.5 rounded-full shrink-0">
                  Live
                </span>
              )}
            </div>

            <AttendanceMarkingCard lectureId={selectedLecture.id} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Upcoming Schedule Ahead ── */}
      {upcomingLectures.length > 0 && (
        <div className="rounded-3xl border border-border-subtle bg-surface-1 overflow-hidden shadow-sm">
          <div className="px-5 py-3.5 border-b border-border-subtle flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Upcoming Today / This Week</h3>
            <span className="text-xs font-semibold text-primary">{upcomingLectures.length} scheduled</span>
          </div>
          <div className="divide-y divide-border-subtle">
            {upcomingLectures.map((l) => (
              <div
                key={l.id}
                onClick={() => setSelectedLectureId(l.id)}
                className="cursor-pointer flex items-center justify-between p-4 hover:bg-surface-2/60 transition-colors"
              >
                <div className="space-y-0.5 min-w-0">
                  <p className="text-[13px] font-bold text-foreground truncate">{l.topic}</p>
                  <p className="text-[11px] text-muted-foreground">{formatDate(l.lecture_date)} · {formatTime(l.start_time)} · {l.venue}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/60 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
