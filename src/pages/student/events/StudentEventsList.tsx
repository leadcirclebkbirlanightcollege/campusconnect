import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { EmptyStateCard } from "@/components/ui/empty-state";
import { FadeIn } from "@/components/ui/motion";
import { PageContainer } from "@/layout/PageContainer";
import { PageHeader } from "@/layout/PageHeader";
import { SegmentedFilter } from "@/components/ui/SegmentedFilter";
import { cn } from "@/lib/utils";
import { format, isPast, isToday } from "date-fns";
import { MapPin, Clock, PartyPopper, Sparkles, Store } from "lucide-react";
import StallRegistrationDialog from "./StallRegistrationDialog";

type EventRow = {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  event_time: string;
  venue: string | null;
  poster_url: string | null;
  flyer_url: string | null;
  is_featured: boolean | null;
  max_stalls: number | null;
};

export default function StudentEventsList() {
type Tab = "upcoming" | "today" | "past";

export default function StudentEventsList() {
  const [tab, setTab] = useState<Tab>("upcoming");

  const query = useQuery({
    queryKey: ["student", "events", "v2"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id,title,description,event_date,event_time,venue,poster_url,flyer_url,is_featured,max_stalls")
        .order("event_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as EventRow[];
    },
  });

  const { featured, upcoming, todayList, past } = useMemo(() => {
    const all = query.data ?? [];
    const upcoming: EventRow[] = [];
    const past: EventRow[] = [];
    const todayList: EventRow[] = [];
    for (const e of all) {
      const day = new Date(e.event_date + "T00:00:00");
      if (isToday(day)) todayList.push(e);
      if (isPast(day) && !isToday(day)) past.push(e);
      else upcoming.push(e);
    }
    return {
      featured: upcoming.filter((e) => e.is_featured),
      upcoming,
      todayList,
      past,
    };
  }, [query.data]);

  if (query.isLoading) {
    return (
      <PageContainer className="space-y-3">
        <PageHeader title="Events" subtitle="What's happening on campus" gradient />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </PageContainer>
    );
  }

  const events = tab === "today" ? todayList : tab === "past" ? past : upcoming;

  return (
    <PageContainer className="space-y-4">
      <PageHeader title="Events" subtitle="What's happening on campus" gradient />

      <SegmentedFilter<Tab>
        value={tab}
        onChange={setTab}
        options={[
          { value: "upcoming", label: "Upcoming", count: upcoming.length },
          { value: "today", label: "Today", count: todayList.length },
          { value: "past", label: "Past", count: past.length },
        ]}
      />

      {/* Featured carousel */}
      {featured.length > 0 && (
        <FadeIn>
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-warning" />
              <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Featured</p>
            </div>
            <div className="flex gap-3 overflow-x-auto -mx-4 px-4 pb-1 snap-x snap-mandatory scrollbar-hide">
              {featured.map((e) => {
                const flyer = e.flyer_url || e.poster_url;
                return (
                  <div
                    key={e.id}
                    className="snap-start shrink-0 w-[78%] rounded-xl border border-warning/30 bg-surface-1 overflow-hidden shadow-sm"
                  >
                    {flyer ? (
                      <img src={flyer} alt={e.title} className="w-full h-32 object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-32 bg-gradient-to-br from-warning/20 to-primary/20 flex items-center justify-center">
                        <PartyPopper className="h-8 w-8 text-warning/60" />
                      </div>
                    )}
                    <div className="p-3 space-y-1">
                      <p className="text-[13px] font-semibold text-foreground line-clamp-1">{e.title}</p>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span>{format(new Date(e.event_date + "T00:00:00"), "PP")}</span>
                        <span>•</span>
                        <span>{e.event_time}</span>
                      </div>
                      {e.max_stalls != null && (
                        <StallRegistrationDialog
                          eventId={e.id}
                          eventTitle={e.title}
                          trigger={
                            <button className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-warning hover:underline">
                              <Store className="h-3 w-3" /> Register Stall
                            </button>
                          }
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </FadeIn>
      )}

      {events.length === 0 ? (
        <EmptyStateCard
          emoji="🎉"
          title="No events scheduled"
          description="Campus events and activities will show up here once created by your admin."
        />
      ) : (
        <div className="space-y-2">
          {events.map((e, i) => {
            const eventDay = new Date(e.event_date + "T00:00:00");
            const past = isPast(eventDay) && !isToday(eventDay);
            const today = isToday(eventDay);
            const flyer = e.flyer_url || e.poster_url;

            return (
              <FadeIn key={e.id} delay={i * 20}>
                <div
                  className={cn(
                    "rounded-xl border bg-surface-1 shadow-xs transition-fast hover:shadow-sm overflow-hidden",
                    today
                      ? "border-success/25 bg-success/3"
                      : past
                      ? "border-border-subtle opacity-70"
                      : "border-border-subtle hover:border-border-strong",
                  )}
                >
                  {flyer && (
                    <img src={flyer} alt={e.title} className="w-full h-32 object-cover" loading="lazy" />
                  )}
                  <div className="flex gap-4 px-5 py-4">
                    <div className="flex-shrink-0 w-12 text-center">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {format(eventDay, "EEE")}
                      </p>
                      <p className="text-[22px] font-bold text-foreground leading-tight tabular-nums">
                        {format(eventDay, "d")}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{format(eventDay, "MMM")}</p>
                    </div>

                    <div className={cn("w-px self-stretch rounded-full", today ? "bg-success/30" : "bg-border-subtle")} />

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

                      {!past && e.max_stalls != null && (
                        <div className="pt-1">
                          <StallRegistrationDialog eventId={e.id} eventTitle={e.title} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </FadeIn>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}
