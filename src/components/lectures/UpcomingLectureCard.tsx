import { Link } from "react-router-dom";
import { CalendarDays, Clock, MapPin, ArrowRight } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import LiveBadge from "@/components/lectures/LiveBadge";
import { cn } from "@/lib/utils";

export type UpcomingLectureCardLecture = {
  id: string;
  topic: string;
  lecture_date: string;
  start_time: string;
  end_time?: string | null;
  venue: string;
  flyer_object_path?: string | null;
  status?: "scheduled" | "live" | "ended";
};

function publicFlyerUrl(path: string) {
  const { data } = supabase.storage.from("lecture-flyers").getPublicUrl(path);
  return data.publicUrl;
}

function formatDateChip(dateStr: string) {
  // dateStr is YYYY-MM-DD
  const d = new Date(`${dateStr}T00:00:00`);
  const day = Number.isFinite(d.getTime()) ? String(d.getDate()).padStart(2, "0") : dateStr.slice(-2);
  const month = Number.isFinite(d.getTime())
    ? d.toLocaleString(undefined, { month: "short" }).toUpperCase()
    : "";
  return { day, month };
}

export default function UpcomingLectureCard({
  lecture,
  to,
  showDateChip = true,
  showStatusPill = true,
  className,
}: {
  lecture: UpcomingLectureCardLecture;
  to: string;
  showDateChip?: boolean;
  showStatusPill?: boolean;
  className?: string;
}) {
  const flyerUrl = lecture.flyer_object_path ? publicFlyerUrl(lecture.flyer_object_path) : null;
  const chip = formatDateChip(lecture.lecture_date);

  return (
    <article
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-border/50 bg-card/40 backdrop-blur-sm",
        "transition-shadow hover:shadow-premium",
        className,
      )}
    >
      {/* Cover */}
      <div className="relative">
        {flyerUrl ? (
          <img
            src={flyerUrl}
            alt={`Lecture flyer for ${lecture.topic}`}
            className="h-44 w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="h-44 w-full bg-gradient-to-br from-primary/20 via-background to-accent/15" />
        )}

        {/* Overlay for readability */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/95 via-background/35 to-transparent" />

        {/* Pills */}
        <div className="absolute left-3 top-3 flex items-center gap-2">
          {showStatusPill ? (
            <Badge variant="secondary" className="bg-background/70 backdrop-blur">
              {lecture.status === "live" ? "Live" : "Upcoming"}
            </Badge>
          ) : null}
          {lecture.status === "live" ? <LiveBadge className="bg-destructive/90" /> : null}
        </div>

        {showDateChip ? (
          <div className="absolute right-3 top-3 rounded-2xl border border-border/60 bg-background/80 px-3 py-2 text-center backdrop-blur">
            <div className="text-xl font-bold leading-none text-foreground">{chip.day}</div>
            <div className="mt-0.5 text-[10px] font-semibold tracking-wide text-muted-foreground">{chip.month}</div>
          </div>
        ) : null}

        {/* Title */}
        <div className="absolute inset-x-0 bottom-0 p-4">
          <h3 className="text-2xl font-semibold leading-tight text-foreground line-clamp-2">
            {lecture.topic}
          </h3>
        </div>
      </div>

      {/* Details */}
      <div className="p-4 pt-3">
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-muted/30">
              <Clock className="h-4 w-4" />
            </span>
            <span>
              {lecture.start_time}
              {lecture.end_time ? `–${lecture.end_time}` : ""}
            </span>
          </li>
          <li className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-muted/30">
              <MapPin className="h-4 w-4" />
            </span>
            <span className="line-clamp-1">{lecture.venue}</span>
          </li>
          {showDateChip ? null : (
            <li className="flex items-center gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-muted/30">
                <CalendarDays className="h-4 w-4" />
              </span>
              <span>{lecture.lecture_date}</span>
            </li>
          )}
        </ul>

        <div className="mt-4">
          <Button asChild className="w-full gap-2" variant="secondary">
            <Link to={to} aria-label={`See details for ${lecture.topic}`}>
              See details
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}
