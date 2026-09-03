import React from "react";
import { Link } from "react-router-dom";
import { format, isPast, isToday } from "date-fns";
import { CalendarDays, Clock, MapPin, Store, Sparkles, ArrowRight, Flame } from "@/components/icons";
import StallRegistrationDialog from "@/pages/student/events/StallRegistrationDialog";
import { cn } from "@/lib/utils";

export interface ECellEventItem {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  event_time: string | null;
  venue: string | null;
  poster_url: string | null;
  flyer_url: string | null;
  is_featured?: boolean | null;
  is_ecell_event?: boolean | null;
  max_stalls?: number | null;
}

interface ECellEventCardProps {
  event: ECellEventItem;
  className?: string;
}

export function ECellEventCard({ event, className }: ECellEventCardProps) {
  const eventDateObj = new Date(event.event_date);
  const isPastEvent = isPast(eventDateObj) && !isToday(eventDateObj);
  const isTodayEvent = isToday(eventDateObj);
  const imageUrl = event.flyer_url || event.poster_url;
  const hasStallOption = event.max_stalls != null && event.max_stalls > 0;

  return (
    <div
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border border-[#E8D98A]/60 dark:border-[#3D3523] bg-card",
        "transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:border-[#C08634]",
        isPastEvent && "opacity-80 hover:opacity-100",
        className
      )}
      style={{
        boxShadow: "0 4px 20px -6px rgba(192, 134, 52, 0.12)",
      }}
    >
      {/* Top Banner / Flyer Image */}
      <div className="relative h-40 sm:h-44 w-full overflow-hidden bg-[#FAF9F7] dark:bg-[#191713] border-b border-[#E8D98A]/30">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={event.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center p-6 text-center bg-gradient-to-br from-[#FAF9F7] via-white to-[#FCE541]/10 dark:from-[#151410] dark:via-[#191713] dark:to-[#221F18]">
            <div className="space-y-1">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-[#FCE541]/25 text-[#C08634] border border-[#E8D98A]/50">
                <Sparkles className="h-5 w-5" />
              </div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#593018] dark:text-[#D8C7A5]">
                E-Cell Initiative
              </p>
            </div>
          </div>
        )}

        {/* Badges on Image */}
        <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5 z-10">
          {isTodayEvent ? (
            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider bg-[#FCE541] text-[#000000] shadow-md border border-[#C08634]">
              <Flame className="h-3 w-3 text-red-600" /> Today
            </span>
          ) : isPastEvent ? (
            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-black/60 text-white backdrop-blur-sm">
              Concluded
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#FCE541] text-[#000000] shadow-sm border border-[#E8D98A]">
              Upcoming
            </span>
          )}

          {hasStallOption && !isPastEvent && (
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#C08634] text-white shadow-sm">
              <Store className="h-2.5 w-2.5" /> Stalls Open
            </span>
          )}
        </div>

        {/* Date Stamp Pill on bottom right of image */}
        <div className="absolute bottom-2.5 right-2.5 z-10">
          <div className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 bg-white/95 dark:bg-[#1D1B17]/95 backdrop-blur-sm border border-[#E8D98A] text-[#000000] dark:text-white shadow-sm">
            <CalendarDays className="h-3 w-3 text-[#C08634]" />
            <span className="text-[11px] font-bold leading-none tabular-nums">
              {format(eventDateObj, "dd MMM yyyy")}
            </span>
          </div>
        </div>
      </div>

      {/* Event Details Content */}
      <div className="flex flex-1 flex-col justify-between p-4 sm:p-5 space-y-3">
        <div className="space-y-2">
          <h3 className="text-[16px] sm:text-[17px] font-bold text-foreground tracking-tight leading-snug line-clamp-2 group-hover:text-[#C08634] transition-colors">
            {event.title}
          </h3>

          {event.description && (
            <p className="text-[12.5px] text-[#593018]/85 dark:text-muted-foreground line-clamp-2 leading-relaxed">
              {event.description}
            </p>
          )}

          {/* Time & Venue Meta */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-muted-foreground pt-1">
            {event.event_time && (
              <span className="flex items-center gap-1 text-[#593018] dark:text-[#D8C7A5]">
                <Clock className="h-3.5 w-3.5 text-[#C08634]" />
                {event.event_time.slice(0, 5)}
              </span>
            )}
            <span className="flex items-center gap-1 truncate max-w-[200px]">
              <MapPin className="h-3.5 w-3.5 text-[#C08634]" />
              {event.venue || "Campus Main Hall"}
            </span>
            {hasStallOption && (
              <span className="flex items-center gap-1 text-[#C08634] font-semibold">
                <Store className="h-3.5 w-3.5" />
                Max {event.max_stalls} stalls
              </span>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="pt-2 border-t border-[#E8D98A]/30 flex items-center justify-between gap-2">
          {hasStallOption && !isPastEvent ? (
            <StallRegistrationDialog
              eventId={event.id}
              eventTitle={event.title}
              trigger={
                <button
                  type="button"
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold text-[#000000]",
                    "bg-[#FCE541] hover:bg-[#FAD943] active:bg-[#C08634] active:text-white",
                    "border border-[#C08634]/50 shadow-sm transition-all active:scale-95"
                  )}
                >
                  <Store className="h-3.5 w-3.5" /> Apply for Stall
                </button>
              }
            />
          ) : (
            <span className="text-[11px] font-medium text-muted-foreground">
              {isPastEvent ? "Event Completed" : "Open for All"}
            </span>
          )}

          <Link
            to="/app/events"
            className="inline-flex items-center gap-1 text-[12px] font-bold text-[#C08634] hover:text-[#593018] dark:hover:text-[#FCE541] transition-colors ml-auto group/link"
          >
            Details
            <ArrowRight className="h-3.5 w-3.5 group-hover/link:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
}
