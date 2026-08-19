/**
 * PHASE 2 — Upcoming Events Strip
 * Horizontal scrollable cards: upcoming lectures + events.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { BookOpen, Calendar, Clock, MapPin, ChevronRight, Sparkles } from "@/components/icons";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

type EventItem = {
  id: string;
  kind: "lecture" | "event";
  title: string;
  date: string;
  time: string;
  venue?: string;
  status?: string;
};

export default function UpcomingEventsStrip() {
  const q = useQuery({
    queryKey: ["student", "upcoming-events-strip"],
    queryFn: async () => {
      const todayStr = new Date().toISOString().split("T")[0];

      const [{ data: lectures }, { data: events }] = await Promise.all([
        supabase.from("lectures")
          .select("id, topic, lecture_date, start_time, venue, status")
          .gte("lecture_date", todayStr)
          .in("status", ["scheduled", "live"])
          .order("lecture_date").order("start_time")
          .limit(5),
        supabase.from("events")
          .select("id, title, event_date, event_time, venue")
          .gte("event_date", todayStr)
          .order("event_date").order("event_time")
          .limit(3),
      ]);

      const items: EventItem[] = [
        ...(lectures ?? []).map((l: any) => ({
          id: l.id,
          kind: "lecture" as const,
          title: l.topic,
          date: l.lecture_date,
          time: l.start_time,
          venue: l.venue,
          status: l.status,
        })),
        ...(events ?? []).map((e: any) => ({
          id: e.id,
          kind: "event" as const,
          title: e.title,
          date: e.event_date,
          time: e.event_time,
          venue: e.venue ?? undefined,
        })),
      ];

      // Sort by date then time
      items.sort((a, b) => {
        const da = `${a.date}T${a.time}`;
        const db = `${b.date}T${b.time}`;
        return da.localeCompare(db);
      });

      return items.slice(0, 6);
    },
    staleTime: 5 * 60_000,
  });

  const formatDate = (dateStr: string) => {
    const d = new Date(`${dateStr}T00:00:00`);
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    if (dateStr === today.toISOString().split("T")[0]) return "Today";
    if (dateStr === tomorrow.toISOString().split("T")[0]) return "Tomorrow";
    return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
  };

  const formatTime = (timeStr: string) => {
    const [h, m] = timeStr.split(":");
    const hour = parseInt(h);
    const ampm = hour >= 12 ? "PM" : "AM";
    return `${hour % 12 || 12}:${m} ${ampm}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: 0.1 }}
      className="rounded-2xl border border-border-subtle bg-surface-1 overflow-hidden shadow-sm"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <Calendar className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-[14px] font-semibold text-foreground">Upcoming</p>
            <p className="text-[11px] text-muted-foreground">Lectures & events ahead</p>
          </div>
        </div>
        <Button asChild variant="ghost" size="sm" className="h-8 text-[12px] gap-1 text-muted-foreground rounded-lg">
          <Link to="/app/lectures">All <ChevronRight className="h-3 w-3" /></Link>
        </Button>
      </div>

      {/* Horizontal scroll strip */}
      <div className="px-4 py-4">
        {q.isLoading ? (
          <div className="flex gap-3 overflow-hidden">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-[110px] w-[160px] shrink-0 rounded-xl" />)}
          </div>
        ) : !q.data?.length ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <div className="h-10 w-10 rounded-xl bg-surface-3 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-muted-foreground opacity-40" />
            </div>
            <p className="text-[12px] text-muted-foreground">No upcoming lectures or events</p>
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
            {q.data.map((item, i) => (
              <motion.div
                key={`${item.kind}-${item.id}`}
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.06 }}
              >
                <Link
                  to={item.kind === "lecture" ? `/app/lectures/${item.id}` : "/app/events"}
                  className={cn(
                    "block w-[160px] shrink-0 rounded-xl border p-3.5 space-y-2.5",
                    "hover:border-border-strong hover:shadow-xs transition-all duration-150",
                    item.status === "live"
                      ? "border-success/30 bg-success/5"
                      : "border-border-subtle bg-surface-2",
                  )}
                >
                  {/* Kind badge */}
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                      item.kind === "lecture"
                        ? "text-primary bg-primary/8 border-primary/20"
                        : "text-premium bg-premium/10 border-premium/25",
                    )}>
                      {item.kind === "lecture"
                        ? <><BookOpen className="h-2.5 w-2.5" />Lecture</>
                        : <><Calendar className="h-2.5 w-2.5" />Event</>
                      }
                    </span>
                    {item.status === "live" && (
                      <span className="h-2 w-2 rounded-full bg-success live-dot" />
                    )}
                  </div>

                  {/* Title */}
                  <p className="text-[12px] font-semibold text-foreground leading-tight line-clamp-2">
                    {item.title}
                  </p>

                  {/* Date + time */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <Clock className="h-2.5 w-2.5 shrink-0" />
                      <span className="truncate">{formatDate(item.date)} · {formatTime(item.time)}</span>
                    </div>
                    {item.venue && (
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <MapPin className="h-2.5 w-2.5 shrink-0" />
                        <span className="truncate">{item.venue}</span>
                      </div>
                    )}
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
