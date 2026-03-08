import { CalendarDays, Clock3, MapPin, Radio } from "lucide-react";
import { Link } from "react-router-dom";

import LiveBadge from "@/components/lectures/LiveBadge";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { LectureRecord } from "../types";

type LectureLiveBannerProps = {
  lecture: LectureRecord | null;
  className?: string;
};

function formatLectureDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function LectureLiveBanner({ lecture, className }: LectureLiveBannerProps) {
  if (!lecture) {
    return (
      <GlassCard className={cn("space-y-3", className)} elevation="medium" hover={false}>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Radio className="h-4 w-4" />
          Live lecture status
        </div>
        <p className="text-sm font-medium text-foreground">No live lecture right now.</p>
        <p className="text-xs text-muted-foreground">We’ll highlight the session here as soon as one goes live.</p>
      </GlassCard>
    );
  }

  const isLive = lecture.status === "live";

  return (
    <GlassCard
      className={cn(
        "space-y-4 border-primary/30 shadow-glow",
        isLive && "bg-gradient-to-br from-primary/15 via-surface-1/90 to-surface-3/80",
        className,
      )}
      elevation="high"
      padding="lg"
      hover={false}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <div className="flex items-center gap-2">
            {isLive ? <LiveBadge /> : null}
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {isLive ? "Now Live" : "Up next"}
            </span>
          </div>
          <h3 className="text-lg font-bold leading-tight text-foreground">{lecture.topic}</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-3.5 w-3.5 text-primary" />
          <span>{formatLectureDate(lecture.lecture_date)}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock3 className="h-3.5 w-3.5 text-primary" />
          <span>{lecture.start_time}–{lecture.end_time}</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="h-3.5 w-3.5 text-primary" />
          <span className="truncate">{lecture.venue}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button asChild className="h-12 w-full">
          <Link to={`/app/lectures/${lecture.id}`}>{isLive ? "Mark Attendance" : "View Lecture"}</Link>
        </Button>
        <Button asChild variant="secondary" className="h-12 w-full">
          <Link to={`/app/lectures/${lecture.id}`}>View Details</Link>
        </Button>
      </div>
    </GlassCard>
  );
}
