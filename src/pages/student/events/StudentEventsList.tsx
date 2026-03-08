import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { EmptyStateCard } from "@/components/ui/empty-state";
import { FadeIn } from "@/components/ui/motion";
import { cn } from "@/lib/utils";
import { format, isPast, isToday } from "date-fns";
import { Calendar, MapPin, Clock, PartyPopper } from "lucide-react";

export default function StudentEventsList() {
  const query = useQuery({
    queryKey: ["student", "events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id,title,description,event_date,event_time,venue,poster_url")
        .order("event_date", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  if (query.isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    );
  }

  const events = query.data ?? [];

  return (
    <div className="space-y-5 page-enter">
      {/* Header */}
      <FadeIn>
        <div className="flex items-center gap-2">
          <PartyPopper className="h-4 w-4 text-muted-foreground" />
          <h1 className="text-heading text-foreground">Events</h1>
        </div>
      </FadeIn>

      {events.length === 0 ? (
        <EmptyStateCard
          emoji="🎉"
          title="No events scheduled"
          description="Campus events and activities will show up here once created by your admin."
        />
      ) : (
        <div className="space-y-2">
          {events.map((e: any, i: number) => {
            const eventDay = new Date(e.event_date + "T00:00:00");
            const past = isPast(eventDay) && !isToday(eventDay);
            const today = isToday(eventDay);

            return (
              <FadeIn key={e.id} delay={i * 20}>
                <div
                  className={cn(
                    "rounded-xl border bg-surface-1 shadow-xs transition-fast hover:shadow-sm",
                    today
                      ? "border-success/25 bg-success/3"
                      : past
                      ? "border-border-subtle opacity-70"
                      : "border-border-subtle hover:border-border-strong",
                  )}
                >
                  <div className="flex gap-4 px-5 py-4">
                    {/* Date block */}
                    <div className="flex-shrink-0 w-12 text-center">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {format(eventDay, "EEE")}
                      </p>
                      <p className="text-[22px] font-bold text-foreground leading-tight tabular-nums">
                        {format(eventDay, "d")}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {format(eventDay, "MMM")}
                      </p>
                    </div>

                    {/* Divider */}
                    <div className={cn(
                      "w-px self-stretch rounded-full",
                      today ? "bg-success/30" : "bg-border-subtle",
                    )} />

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-[14px] font-semibold text-foreground leading-snug">{e.title}</h3>
                        {today && <Badge className="text-[9px] bg-success text-success-foreground shrink-0">Today</Badge>}
                        {!today && !past && <Badge variant="outline" className="text-[9px] shrink-0">Upcoming</Badge>}
                        {past && <Badge variant="secondary" className="text-[9px] shrink-0">Past</Badge>}
                      </div>

                      {e.description && (
                        <p className="text-[12px] text-muted-foreground leading-relaxed line-clamp-2">{e.description}</p>
                      )}

                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {e.event_time}
                        </span>
                        {e.venue && (
                          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {e.venue}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </FadeIn>
            );
          })}
        </div>
      )}
    </div>
  );
}
