import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Clock, MapPin, CalendarRange, Radio, ArrowRight, FlaskConical, BookOpen, Laptop } from "lucide-react";
import { getDay } from "date-fns";
import { PageContainer } from "@/layout/PageContainer";
import { ModuleHero, HeroOverlap } from "@/layout/ModuleHero";
import { PremiumEmpty } from "@/components/ui/premium-empty";
import { Skeleton } from "@/components/ui/skeleton";
import { FadeIn } from "@/components/ui/motion";
import { cn } from "@/lib/utils";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const WORK_DAYS = [1, 2, 3, 4, 5, 6];

type Slot = {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  subject: string;
  venue: string | null;
  faculty_name: string | null;
};

/** Derive a visual kind from the subject/venue text — presentation only. */
type Kind = "lab" | "practical" | "online" | "theory";

function kindOf(slot: Slot): Kind {
  const t = `${slot.subject} ${slot.venue ?? ""}`.toLowerCase();
  if (t.includes("lab")) return "lab";
  if (t.includes("practical")) return "practical";
  if (t.includes("online") || t.includes("zoom") || t.includes("meet")) return "online";
  return "theory";
}

const KIND_META: Record<Kind, { label: string; icon: typeof BookOpen; chip: string; bar: string }> = {
  lab: { label: "Lab", icon: FlaskConical, chip: "bg-premium/12 text-premium border-premium/25", bar: "bg-premium" },
  practical: { label: "Practical", icon: FlaskConical, chip: "bg-success/12 text-success border-success/25", bar: "bg-success" },
  online: { label: "Online", icon: Laptop, chip: "bg-warning/12 text-warning border-warning/25", bar: "bg-warning" },
  theory: { label: "Theory", icon: BookOpen, chip: "bg-primary/10 text-primary border-primary/20", bar: "bg-primary" },
};

const toMinutes = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
};
const hhmm = (t: string) => t.slice(0, 5);

export default function StudentTimetable() {
  const todayDay = getDay(new Date());
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();

  const { data: collegeId } = useQuery({
    queryKey: ["my_college_id"],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_my_college_id");
      return data as string | null;
    },
    staleTime: 120_000,
  });

  const { data: slots = [], isLoading } = useQuery<Slot[]>({
    queryKey: ["student", "timetable", collegeId],
    enabled: !!collegeId,
    queryFn: async () => {
      const { data } = await supabase
        .from("timetable_slots")
        .select("id,day_of_week,start_time,end_time,subject,venue,faculty_name")
        .eq("college_id", collegeId!)
        .eq("is_active", true)
        .order("day_of_week")
        .order("start_time");
      return (data ?? []) as Slot[];
    },
    staleTime: 60_000,
  });

  const slotsByDay = useMemo(
    () =>
      WORK_DAYS.reduce<Record<number, Slot[]>>((acc, d) => {
        acc[d] = slots.filter((s) => s.day_of_week === d);
        return acc;
      }, {}),
    [slots],
  );

  const todaySlots = slotsByDay[todayDay] ?? [];

  const { current, next, remaining, done } = useMemo(() => {
    const current = todaySlots.find(
      (s) => toMinutes(s.start_time) <= nowMin && nowMin < toMinutes(s.end_time),
    );
    const upcoming = todaySlots.filter((s) => toMinutes(s.start_time) > nowMin);
    const done = todaySlots.filter((s) => toMinutes(s.end_time) <= nowMin).length;
    return { current, next: upcoming[0], remaining: upcoming.slice(1), done };
  }, [todaySlots, nowMin]);

  const weeklyTotal = slots.length;

  return (
    <PageContainer className="space-y-5" noPadding>
      <ModuleHero
        tone="academics"
        eyebrow="Weekly schedule"
        title="Timetable"
        subtitle={`${DAYS[todayDay]} · ${todaySlots.length} ${todaySlots.length === 1 ? "class" : "classes"} today`}
        icon={CalendarRange}
        stats={[
          { label: "Today", value: todaySlots.length },
          { label: "Done", value: done },
          { label: "This week", value: weeklyTotal },
        ]}
      >
        {/* Weekly day strip */}
        <div className="flex gap-1.5">
          {WORK_DAYS.map((d) => {
            const active = d === todayDay;
            const n = (slotsByDay[d] ?? []).length;
            return (
              <div
                key={d}
                className={cn(
                  "flex flex-1 flex-col items-center rounded-xl border py-1.5 transition",
                  active
                    ? "border-white/40 bg-white/22"
                    : "border-white/12 bg-white/8",
                )}
              >
                <span className="text-[9.5px] font-bold uppercase tracking-wide text-white/75">
                  {DAYS[d].slice(0, 1)}
                </span>
                <span className="font-heading text-[13px] font-bold tabular-nums">{n}</span>
              </div>
            );
          })}
        </div>
      </ModuleHero>

      <HeroOverlap className="space-y-5">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-28 rounded-[22px]" />
            <Skeleton className="h-20 rounded-2xl" />
            <Skeleton className="h-20 rounded-2xl" />
          </div>
        ) : slots.length === 0 ? (
          <PremiumEmpty
            art="timetable"
            tone="primary"
            title="Your timetable isn't published yet"
            description="Once your department uploads the weekly schedule, every lecture, lab and practical shows up right here."
            hint="You'll be notified the moment it's live"
          />
        ) : (
          <>
            {/* Now / Next */}
            <div className="space-y-3">
              {current ? (
                <FadeIn>
                  <NowCard slot={current} nowMin={nowMin} />
                </FadeIn>
              ) : null}

              {next ? (
                <FadeIn delay={40}>
                  <div className="flex items-center gap-3 rounded-[20px] border border-border-subtle bg-surface-1 p-4 shadow-card">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <ArrowRight className="h-4.5 w-4.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                        Up next
                      </p>
                      <p className="truncate text-[14px] font-bold text-foreground">{next.subject}</p>
                      <p className="text-[11.5px] text-muted-foreground">
                        {hhmm(next.start_time)}–{hhmm(next.end_time)}
                        {next.venue ? ` · ${next.venue}` : ""}
                      </p>
                    </div>
                  </div>
                </FadeIn>
              ) : !current ? (
                <div className="rounded-[20px] border border-dashed border-border-subtle bg-surface-2/60 px-4 py-5 text-center">
                  <p className="text-[13px] font-semibold text-foreground">
                    {todaySlots.length === 0 ? "No classes today 🎉" : "You're done for today 🎉"}
                  </p>
                  <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                    Scroll down to see the rest of your week.
                  </p>
                </div>
              ) : null}
            </div>

            {/* Remaining today */}
            {remaining.length > 0 && (
              <section className="space-y-2.5">
                <SectionTitle title="Later today" count={remaining.length} />
                {remaining.map((s, i) => (
                  <FadeIn key={s.id} delay={i * 20}>
                    <SlotRow slot={s} />
                  </FadeIn>
                ))}
              </section>
            )}

            {/* Rest of week — free days collapse into a thin line */}
            <section className="space-y-3">
              <SectionTitle title="Full week" count={weeklyTotal} />
              {WORK_DAYS.map((day) => {
                const daySlots = slotsByDay[day] ?? [];
                const isCurrentDay = day === todayDay;

                if (daySlots.length === 0) {
                  return (
                    <div
                      key={day}
                      className="flex items-center gap-2 rounded-xl border border-dashed border-border-subtle px-3 py-2"
                    >
                      <span className="text-[11.5px] font-semibold text-muted-foreground">
                        {DAYS[day]}
                      </span>
                      <div className="h-px flex-1 bg-border-subtle" />
                      <span className="text-[11px] text-muted-foreground/70">Free day</span>
                    </div>
                  );
                }

                return (
                  <div
                    key={day}
                    className={cn(
                      "overflow-hidden rounded-[20px] border bg-surface-1 shadow-card",
                      isCurrentDay ? "border-primary/30" : "border-border-subtle",
                    )}
                  >
                    <div
                      className={cn(
                        "flex items-center gap-2 border-b px-4 py-2.5",
                        isCurrentDay
                          ? "border-primary/15 bg-primary/6"
                          : "border-border-subtle bg-surface-2/60",
                      )}
                    >
                      <span
                        className={cn(
                          "text-[12.5px] font-bold",
                          isCurrentDay ? "text-primary" : "text-foreground",
                        )}
                      >
                        {DAYS[day]}
                      </span>
                      {isCurrentDay && (
                        <span className="rounded-full bg-primary px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-primary-foreground">
                          Today
                        </span>
                      )}
                      <span className="ml-auto text-[11px] tabular-nums text-muted-foreground">
                        {daySlots.length} {daySlots.length === 1 ? "class" : "classes"}
                      </span>
                    </div>
                    <div className="divide-y divide-border-subtle/70">
                      {daySlots.map((slot) => (
                        <SlotRow key={slot.id} slot={slot} flat />
                      ))}
                    </div>
                  </div>
                );
              })}
            </section>
          </>
        )}
      </HeroOverlap>
    </PageContainer>
  );
}

function SectionTitle({ title, count }: { title: string; count?: number }) {
  return (
    <div className="flex items-center gap-2">
      <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{title}</h2>
      <div className="h-px flex-1 bg-border-subtle" />
      {count != null && (
        <span className="text-[11px] tabular-nums text-muted-foreground/70">{count}</span>
      )}
    </div>
  );
}

function NowCard({ slot, nowMin }: { slot: Slot; nowMin: number }) {
  const start = toMinutes(slot.start_time);
  const end = toMinutes(slot.end_time);
  const pct = Math.min(100, Math.max(0, ((nowMin - start) / Math.max(1, end - start)) * 100));
  const meta = KIND_META[kindOf(slot)];

  return (
    <div className="relative overflow-hidden rounded-[22px] border border-primary/25 bg-surface-1 p-4 shadow-elevated">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-primary/16 to-transparent"
      />
      <div className="relative space-y-2.5">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-danger/12 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-danger">
            <Radio className="h-2.5 w-2.5 animate-pulse" /> In progress
          </span>
          <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold", meta.chip)}>
            {meta.label}
          </span>
        </div>

        <div>
          <h3 className="font-heading text-[18px] font-bold leading-tight tracking-tight text-foreground">
            {slot.subject}
          </h3>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            {slot.faculty_name ?? "Faculty TBA"}
            {slot.venue ? ` · ${slot.venue}` : ""}
          </p>
        </div>

        <div className="space-y-1">
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex justify-between text-[10.5px] tabular-nums text-muted-foreground">
            <span>{hhmm(slot.start_time)}</span>
            <span>{Math.max(0, end - nowMin)} min left</span>
            <span>{hhmm(slot.end_time)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function SlotRow({ slot, flat = false }: { slot: Slot; flat?: boolean }) {
  const meta = KIND_META[kindOf(slot)];
  const Icon = meta.icon;
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-3",
        !flat && "rounded-[18px] border border-border-subtle bg-surface-1 shadow-card",
      )}
    >
      <span className={cn("h-9 w-1 shrink-0 rounded-full", meta.bar)} />
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-foreground">{slot.subject}</p>
        <p className="truncate text-[11px] text-muted-foreground">
          {slot.faculty_name ?? "Faculty TBA"}
        </p>
      </div>
      <div className="shrink-0 space-y-0.5 text-right">
        <p className="text-[11.5px] font-semibold tabular-nums text-foreground">
          <Clock className="mr-0.5 inline h-3 w-3" />
          {hhmm(slot.start_time)}–{hhmm(slot.end_time)}
        </p>
        {slot.venue && (
          <p className="text-[10.5px] text-muted-foreground">
            <MapPin className="mr-0.5 inline h-2.5 w-2.5" />
            {slot.venue}
          </p>
        )}
      </div>
    </div>
  );
}
