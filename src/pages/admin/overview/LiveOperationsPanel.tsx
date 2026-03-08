import { useEffect, useState } from "react";
import { useLiveLecture } from "@/hooks/use-live-lecture";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Radio, ArrowRight, Clock, Users, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Props {
  attendanceToday: number;
  totalStudents: number;
  loading: boolean;
  onGoToAttendance: () => void;
}

function useCountdown(endTime: string | undefined, lectureDate: string | undefined) {
  const [remaining, setRemaining] = useState("");
  useEffect(() => {
    if (!endTime || !lectureDate) return;
    const tick = () => {
      const end = new Date(`${lectureDate}T${endTime}`);
      const diff = end.getTime() - Date.now();
      if (diff <= 0) { setRemaining("Ending soon"); return; }
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setRemaining(`${mins}m ${secs}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endTime, lectureDate]);
  return remaining;
}

export default function LiveOperationsPanel({ attendanceToday, totalStudents, loading, onGoToAttendance }: Props) {
  const { data: liveLecture, isLoading: lectureLoading } = useLiveLecture();
  const countdown = useCountdown(liveLecture?.end_time, liveLecture?.lecture_date);
  const pct = totalStudents > 0 ? Math.min(100, Math.round((attendanceToday / totalStudents) * 100)) : 0;
  const isLive = !!liveLecture;

  return (
    <div className={cn(
      "rounded-2xl border bg-surface-1 overflow-hidden dashboard-panel shadow-sm transition-all duration-300",
      isLive ? "border-success/40 ring-1 ring-success/20" : "border-border-subtle"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
        <div className="flex items-center gap-2.5">
          <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", isLive ? "bg-success/10" : "bg-surface-3")}>
            <Radio className={cn("h-4 w-4", isLive ? "text-success" : "text-muted-foreground")} />
          </div>
          <div>
            <p className="text-body font-semibold text-foreground">Live Operations</p>
            <p className="text-[11px] text-muted-foreground">Today's lecture & attendance status</p>
          </div>
        </div>
        {isLive && (
          <motion.div
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ repeat: Infinity, duration: 1.8 }}
            className="flex items-center gap-1.5 bg-success/10 text-success text-[11px] font-semibold px-2.5 py-1 rounded-full border border-success/25"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            LIVE
          </motion.div>
        )}
      </div>

      <div className="p-5 space-y-5">
        {/* Lecture info */}
        {lectureLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        ) : isLive ? (
          <div className="space-y-1">
            <p className="text-body-lg font-semibold text-foreground">{liveLecture.topic}</p>
            <div className="flex items-center gap-4 text-caption text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {liveLecture.venue}
              </span>
              <span className="flex items-center gap-1.5 font-medium text-success">
                <Clock className="h-3.5 w-3.5" />
                {countdown} remaining
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3 p-3 rounded-xl bg-surface-2 border border-border-subtle">
            <div className="h-8 w-8 rounded-full bg-surface-3 flex items-center justify-center shrink-0">
              <Clock className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-body font-medium text-foreground">No lecture live right now</p>
              <p className="text-caption text-muted-foreground mt-0.5">Attendance will appear here when a lecture goes live.</p>
            </div>
          </div>
        )}

        {/* Attendance progress */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-caption text-muted-foreground">Attendance today</span>
            </div>
            <span className="text-body font-semibold text-foreground tabular-nums">
              {loading ? "…" : `${attendanceToday} / ${totalStudents}`}
            </span>
          </div>
          <Progress value={loading ? 0 : pct} className="h-2" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">{loading ? "" : `${pct}% marked`}</span>
            {pct >= 75 && (
              <span className="flex items-center gap-1 text-[11px] text-success font-medium">
                <CheckCircle2 className="h-3 w-3" /> Good attendance
              </span>
            )}
          </div>
        </div>

        <Button className="w-full gap-2" onClick={onGoToAttendance}>
          Go to Attendance Control <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
