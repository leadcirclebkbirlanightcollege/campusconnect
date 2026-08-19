import { CalendarDays, Clock3, MapPin } from "@/components/icons";
import { Link } from "react-router-dom";

import { GlassCard } from "@/components/ui/GlassCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";

import type { LectureRecord } from "../types";

type UpcomingLecturesSectionProps = {
  lectures: LectureRecord[];
  isLoading: boolean;
};

function formatLectureDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

export function UpcomingLecturesSection({ lectures, isLoading }: UpcomingLecturesSectionProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, index) => (
          <Skeleton key={index} className="h-36 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  if (lectures.length === 0) {
    return (
      <GlassCard hover={false}>
        <p className="text-sm text-muted-foreground">No upcoming lectures scheduled right now.</p>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-3">
      {lectures.map((lecture) => (
        <Link key={lecture.id} to={`/app/lectures/${lecture.id}`} className="block">
          <GlassCard className="space-y-3" hover>
            <div className="flex items-start justify-between gap-3">
              <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">{lecture.topic}</h3>
              <StatusBadge status={lecture.status === "live" ? "live" : "upcoming"}>
                {lecture.status === "live" ? "Live" : "Upcoming"}
              </StatusBadge>
            </div>
            <div className="space-y-1.5 text-xs text-muted-foreground">
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
          </GlassCard>
        </Link>
      ))}
    </div>
  );
}
