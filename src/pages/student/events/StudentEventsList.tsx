import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { PremiumEmpty } from "@/components/ui/premium-empty";
import { FadeIn } from "@/components/ui/motion";
import { PageContainer } from "@/layout/PageContainer";
import { ModuleHero, HeroOverlap } from "@/layout/ModuleHero";
import { cn } from "@/lib/utils";
import { format, isPast, isToday, addDays, isSameDay } from "date-fns";
import { MapPin, Clock, PartyPopper, Sparkles, Store, Rocket, CalendarDays, Users } from "@/components/icons";
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
  is_ecell_event: boolean | null;
  max_stalls: number | null;
};

type Tab = "upcoming" | "today" | "past";

const TABS: { value: Tab; label: string }[] = [
  { value: "upcoming", label: "Upcoming" },
  { value: "today", label: "Today" },
  { value: "past", label: "Past" },
];

export default function StudentEventsList() {
  const [tab, setTab] = useState<Tab>("upcoming");
  const [activeDay, setActiveDay] = useState<Date | null>(null);

  const query = useQuery({
    queryKey: ["student", "events", "v3"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id,title,description,event_date,event_time,venue,poster_url,flyer_url,is_featured,is_ecell_event,max_stalls")
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
    return { featured: upcoming.filter((e) => e.is_featured), upcoming, todayList, past };
  }, [query.data]);

  // 14-day calendar strip
  const strip = useMemo(() => {
    const start = new Date();
    return Array.from({ length: 14 }, (_, i) => {
      const d = addDays(start, i);
      const count = (query.data ?? []).filter((e) =>
        isSameDay(new Date(e.event_date + "T00:00:00"), d),
      ).length;
      return { date: d, count };
    });
  }, [query.data]);

  const baseList = tab === "today" ? todayList : tab === "past" ? past : upcoming;
  const events = activeDay
    ? baseList.filter((e) => isSameDay(new Date(e.event_date + "T00:00:00"), activeDay))
    : baseList;

  const monthLabel = format(new Date(), "MMMM yyyy");

  if (query.isLoading) {
    return (
      <PageContainer className="space-y-4" noPadding>
        <ModuleHero tone="community" eyebrow={monthLabel} title="Events" icon={CalendarDays} />
        <HeroOverlap className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </HeroOverlap>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="space-y-5" noPadding>
      <ModuleHero
        tone="community"
        eyebrow={monthLabel}
        title="Campus Events"
        subtitle="Fests, workshops, competitions and everything in between"
        icon={CalendarDays}
        stats={[
          { label: "Upcoming", value: upcoming.length },
          { label: "Today", value: todayList.length },
          { label: "Featured", value: featured.length },
        ]}
      />

      <HeroOverlap className="space-y-5">
        {/* Calendar strip */}
        <div className="rounded-[22px] border border-border-subtle bg-surface-1 p-3 shadow-card">
          <div className="mb-2 flex items-center justify-between px-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Next 2 weeks
            </p>
            {activeDay && (
              <button
                onClick={() => setActiveDay(null)}
                className="text-[11px] font-semibold text-primary"
              >
                Clear
              </button>
            )}
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
            {strip.map(({ date, count }) => {
              const active = activeDay ? isSameDay(activeDay, date) : false;
              const today = isToday(date);
              return (
                <button
                  key={date.toISOString()}
                  onClick={() => setActiveDay(active ? null : date)}
                  className={cn(
                    "relative flex h-[54px] w-[42px] shrink-0 flex-col items-center justify-center rounded-xl border transition-[background,transform] duration-150 active:scale-95",
                    active
                      ? "border-transparent bg-foreground text-background"
                      : today
                      ? "border-primary/40 bg-primary/8 text-foreground"
                      : "border-border-subtle bg-surface-2 text-muted-foreground",
                  )}
                >
                  <span className="text-[9.5px] font-semibold uppercase tracking-wide opacity-70">
                    {format(date, "EEE")}
                  </span>
                  <span className="font-heading text-[15px] font-bold tabular-nums leading-tight">
                    {format(date, "d")}
                  </span>
                  {count > 0 && (
                    <span
                      className={cn(
                        "absolute bottom-1 h-1 w-1 rounded-full",
                        active ? "bg-background" : "bg-primary",
                      )}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Category chips */}
        <div className="flex gap-2">
          {TABS.map((t) => {
            const active = tab === t.value;
            const n = t.value === "today" ? todayList.length : t.value === "past" ? past.length : upcoming.length;
            return (
              <button
                key={t.value}
                onClick={() => setTab(t.value)}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-[12px] font-semibold transition-[background,color,transform] duration-150 active:scale-95",
                  active
                    ? "border-transparent bg-foreground text-background shadow-card"
                    : "border-border-subtle bg-surface-1 text-muted-foreground",
                )}
              >
                {t.label}
                <span className={cn("ml-1.5 tabular-nums", active ? "opacity-70" : "opacity-50")}>{n}</span>
              </button>
            );
          })}
        </div>

        {/* Featured carousel */}
        {featured.length > 0 && tab === "upcoming" && !activeDay && (
          <FadeIn>
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-premium" />
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  Featured
                </p>
              </div>
              <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 scrollbar-hide">
                {featured.map((e) => {
                  const flyer = e.flyer_url || e.poster_url;
                  return (
                    <div
                      key={e.id}
                      className="w-[80%] shrink-0 snap-start overflow-hidden rounded-[22px] border border-premium/25 bg-surface-1 shadow-elevated"
                    >
                      {flyer ? (
                        <img src={flyer} alt={e.title} className="h-36 w-full object-cover" loading="lazy" />
                      ) : (
                        <div className="flex h-36 w-full items-center justify-center bg-gradient-to-br from-primary/25 via-primary/10 to-premium/20">
                          <PartyPopper className="h-9 w-9 text-primary/70" />
                        </div>
                      )}
                      <div className="space-y-1.5 p-4">
                        <p className="line-clamp-1 text-[14px] font-bold text-foreground">{e.title}</p>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          <span>{format(new Date(e.event_date + "T00:00:00"), "d MMM")}</span>
                          <span className="h-1 w-1 rounded-full bg-border-strong" />
                          <span>{e.event_time}</span>
                          {e.venue && (
                            <>
                              <span className="h-1 w-1 rounded-full bg-border-strong" />
                              <span className="truncate">{e.venue}</span>
                            </>
                          )}
                        </div>
                        {e.max_stalls != null && (
                          <StallRegistrationDialog
                            eventId={e.id}
                            eventTitle={e.title}
                            trigger={
                              <button className="mt-1 inline-flex items-center gap-1 rounded-lg bg-premium/12 px-2.5 py-1 text-[11px] font-bold text-premium">
                                <Store className="h-3 w-3" /> Register stall
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
          <PremiumEmpty
            art="events"
            tone="primary"
            title={
              tab === "past"
                ? "No past events yet"
                : activeDay
                ? "Nothing on this day"
                : "No events scheduled"
            }
            description={
              tab === "past"
                ? "Once campus events wrap up, they'll be archived here for you to look back on."
                : "Your college hasn't published anything yet. Fests, workshops and competitions will appear here the moment they do."
            }
            hint={activeDay ? "Pick another date from the strip" : "Check back soon — new events drop weekly"}
          />
        ) : (
          <div className="space-y-2.5">
            {events.map((e, i) => {
              const eventDay = new Date(e.event_date + "T00:00:00");
              const isPastEvent = isPast(eventDay) && !isToday(eventDay);
              const today = isToday(eventDay);
              const flyer = e.flyer_url || e.poster_url;

              return (
                <FadeIn key={e.id} delay={i * 20}>
                  <div
                    className={cn(
                      "overflow-hidden rounded-[20px] border bg-surface-1 shadow-card transition-[transform,box-shadow] duration-180 active:scale-[0.99] hover:-translate-y-0.5 hover:shadow-elevated",
                      today
                        ? "border-success/30"
                        : isPastEvent
                        ? "border-border-subtle opacity-70"
                        : "border-border-subtle",
                    )}
                  >
                    {flyer && <img src={flyer} alt={e.title} className="h-32 w-full object-cover" loading="lazy" />}
                    <div className="flex gap-4 px-4 py-4">
                      <div
                        className={cn(
                          "flex h-[62px] w-[52px] shrink-0 flex-col items-center justify-center rounded-2xl border",
                          today
                            ? "border-success/30 bg-success/10 text-success"
                            : "border-border-subtle bg-surface-2 text-foreground",
                        )}
                      >
                        <span className="text-[9.5px] font-semibold uppercase tracking-wide opacity-70">
                          {format(eventDay, "EEE")}
                        </span>
                        <span className="font-heading text-[21px] font-black leading-none tabular-nums">
                          {format(eventDay, "d")}
                        </span>
                        <span className="text-[9.5px] font-medium uppercase opacity-70">
                          {format(eventDay, "MMM")}
                        </span>
                      </div>

                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="flex flex-wrap items-center gap-1.5 text-[14.5px] font-bold leading-snug text-foreground">
                            {e.title}
                            {e.is_ecell_event && (
                              <Badge className="shrink-0 gap-1 bg-[hsl(var(--module-ecell))] text-[9px] text-white hover:bg-[hsl(var(--module-ecell))]">
                                <Rocket className="h-2.5 w-2.5" /> E-Cell
                              </Badge>
                            )}
                          </h3>
                          {today && (
                            <Badge className="shrink-0 bg-success text-[9px] text-success-foreground">Today</Badge>
                          )}
                          {!today && !isPastEvent && (
                            <Badge variant="outline" className="shrink-0 text-[9px]">Upcoming</Badge>
                          )}
                          {isPastEvent && (
                            <Badge variant="secondary" className="shrink-0 text-[9px]">Past</Badge>
                          )}
                        </div>

                        {e.description && (
                          <p className="line-clamp-2 text-[12px] leading-relaxed text-muted-foreground">
                            {e.description}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
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
                          {e.max_stalls != null && (
                            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                              <Users className="h-3 w-3" />
                              {e.max_stalls} stalls
                            </span>
                          )}
                        </div>

                        {!isPastEvent && e.max_stalls != null && (
                          <div className="pt-1.5">
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
      </HeroOverlap>
    </PageContainer>
  );
}
