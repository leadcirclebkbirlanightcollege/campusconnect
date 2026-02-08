import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, CheckCircle2, Clock, Radio, Timer } from "lucide-react";
import { cn } from "@/lib/utils";

type AttendanceState = "not_started" | "live" | "closed" | "marked";

type Props = {
  state: AttendanceState;
  startTime?: string; // ISO or HH:MM
  endTime?: string;
  lectureDate?: string;
  expiresAt?: string; // ISO timestamp for countdown
  className?: string;
};

function parseTimeToToday(time: string, date?: string): Date {
  const [h, m] = time.split(":").map(Number);
  const d = date ? new Date(date) : new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "0:00";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function useCountdown(targetIso: string | undefined) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!targetIso) {
      setRemaining(null);
      return;
    }

    const target = new Date(targetIso).getTime();
    const update = () => {
      const diff = target - Date.now();
      setRemaining(diff > 0 ? diff : 0);
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [targetIso]);

  return remaining;
}

export default function AttendanceStatusBanner({
  state,
  startTime,
  endTime,
  lectureDate,
  expiresAt,
  className,
}: Props) {
  const countdown = useCountdown(expiresAt);

  const startsAt = useMemo(() => {
    if (!startTime) return null;
    return parseTimeToToday(startTime, lectureDate);
  }, [startTime, lectureDate]);

  const timeUntilStart = useMemo(() => {
    if (!startsAt) return null;
    const diff = startsAt.getTime() - Date.now();
    return diff > 0 ? diff : null;
  }, [startsAt]);

  const content = useMemo(() => {
    switch (state) {
      case "marked":
        return {
          icon: CheckCircle2,
          title: "Attendance recorded",
          subtitle: "You're all set for this lecture",
          variant: "success" as const,
        };
      case "live":
        return {
          icon: Radio,
          title: "Attendance is LIVE",
          subtitle: countdown !== null
            ? `Expires in ${formatCountdown(countdown)}`
            : "Scan QR or enter OTP now",
          variant: "live" as const,
        };
      case "closed":
        return {
          icon: Timer,
          title: "Attendance closed",
          subtitle: "The attendance window has ended",
          variant: "closed" as const,
        };
      case "not_started":
      default:
        return {
          icon: Clock,
          title: "Attendance not started",
          subtitle: startTime
            ? `Opens at ${startTime}${lectureDate ? ` on ${lectureDate}` : ""}`
            : "Waiting for lecturer to start",
          variant: "waiting" as const,
        };
    }
  }, [state, countdown, startTime, lectureDate]);

  const Icon = content.icon;

  const variantStyles = {
    success: "bg-success/10 border-success/30 text-success",
    live: "bg-destructive/10 border-destructive/30 text-destructive animate-pulse",
    closed: "bg-muted border-muted-foreground/20 text-muted-foreground",
    waiting: "bg-primary/5 border-primary/20 text-primary",
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={state}
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.2 }}
        className={cn(
          "rounded-xl border p-4",
          variantStyles[content.variant],
          className
        )}
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5">
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold">{content.title}</div>
            <div className="text-sm opacity-80 mt-0.5">{content.subtitle}</div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
