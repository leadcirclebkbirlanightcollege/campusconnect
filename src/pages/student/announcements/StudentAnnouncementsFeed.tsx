import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { PremiumEmpty } from "@/components/ui/premium-empty";
import { FadeIn } from "@/components/ui/motion";
import { PageContainer } from "@/layout/PageContainer";
import { ModuleHero, HeroOverlap } from "@/layout/ModuleHero";
import { cn } from "@/lib/utils";
import { format, isPast, isToday, isYesterday, formatDistanceToNow } from "date-fns";
import { Pin, Clock, AlertCircle, Search, ArrowUpDown, Megaphone, Building2, Check } from "@/components/icons";

type Filter = "all" | "pinned" | "critical";

const PRIORITY_STYLE: Record<string, string> = {
  critical: "bg-danger/12 text-danger border-danger/30",
  high: "bg-warning/12 text-warning border-warning/30",
  normal: "bg-surface-3 text-muted-foreground border-border-subtle",
  low: "bg-surface-3 text-muted-foreground border-border-subtle",
};

const CHIPS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pinned", label: "Pinned" },
  { value: "critical", label: "Urgent" },
];

function groupLabel(d: Date) {
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "dd MMM yyyy");
}

export default function StudentAnnouncementsFeed() {
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [newestFirst, setNewestFirst] = useState(true);

  const query = useQuery({
    queryKey: ["student", "announcements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select("id,title,description,priority,is_pinned,target,created_at,expires_at")
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const items = (query.data ?? []) as any[];

  const counts = useMemo(
    () => ({
      all: items.length,
      pinned: items.filter((a) => a.is_pinned).length,
      critical: items.filter((a) => a.priority === "critical").length,
    }),
    [items],
  );

  const featured = useMemo(
    () => items.find((a) => a.is_pinned) ?? items.find((a) => a.priority === "critical") ?? null,
    [items],
  );

  const filtered = useMemo(() => {
    let list = items;
    if (filter === "pinned") list = list.filter((a) => a.is_pinned);
    if (filter === "critical") list = list.filter((a) => a.priority === "critical");
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (a) =>
          a.title?.toLowerCase().includes(q) || a.description?.toLowerCase().includes(q),
      );
    }
    return [...list].sort((a, b) => {
      const diff = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      return newestFirst ? diff : -diff;
    });
  }, [items, filter, search, newestFirst]);

  const grouped = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const a of filtered) {
      const key = groupLabel(new Date(a.created_at));
      map.set(key, [...(map.get(key) ?? []), a]);
    }
    return [...map.entries()];
  }, [filtered]);

  const unread = counts.critical + counts.pinned;

  return (
    <PageContainer className="space-y-5" noPadding>
      <ModuleHero
        tone="community"
        eyebrow="Campus notice board"
        title="Announcements"
        subtitle="Everything your college wants you to know"
        icon={Megaphone}
        stats={[
          { label: "Total", value: counts.all },
          { label: "Pinned", value: counts.pinned },
          { label: "Urgent", value: counts.critical },
        ]}
      />

      <HeroOverlap className="space-y-4">
        {/* Search + sort */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notices…"
              className="h-11 w-full rounded-2xl border border-border-subtle bg-surface-1 pl-9 pr-3 text-[13px] shadow-card outline-none transition focus:border-primary/40"
            />
          </div>
          <button
            type="button"
            onClick={() => setNewestFirst((v) => !v)}
            aria-label="Toggle sort order"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-border-subtle bg-surface-1 text-muted-foreground shadow-card transition active:scale-95"
          >
            <ArrowUpDown className="h-4 w-4" />
          </button>
        </div>

        {/* Category chips */}
        <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
          {CHIPS.map((c) => {
            const active = filter === c.value;
            return (
              <button
                key={c.value}
                onClick={() => setFilter(c.value)}
                className={cn(
                  "shrink-0 rounded-full border px-3.5 py-1.5 text-[12px] font-semibold transition-[background,color,transform] duration-150 active:scale-95",
                  active
                    ? "border-transparent bg-foreground text-background shadow-card"
                    : "border-border-subtle bg-surface-1 text-muted-foreground",
                )}
              >
                {c.label}
                <span className={cn("ml-1.5 tabular-nums", active ? "opacity-70" : "opacity-50")}>
                  {counts[c.value]}
                </span>
              </button>
            );
          })}
        </div>

        {query.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-32 rounded-[22px]" />
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 rounded-2xl" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <PremiumEmpty
            art="announcements"
            tone="success"
            title="The notice board is quiet"
            description="When your college posts exam schedules, holidays or urgent notices, they land here first."
            hint="You'll get a push notification instantly"
          />
        ) : (
          <>
            {/* Featured */}
            {featured && filter === "all" && !search && (
              <FadeIn>
                <article className="relative overflow-hidden rounded-[22px] border border-primary/25 bg-surface-1 p-5 shadow-elevated">
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-primary/14 to-transparent"
                  />
                  <div className="relative space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-primary-foreground">
                        <Pin className="h-2.5 w-2.5" /> Featured
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {formatDistanceToNow(new Date(featured.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <h2 className="font-heading text-[17px] font-bold leading-snug tracking-tight text-foreground">
                      {featured.title}
                    </h2>
                    <p className="text-[13px] leading-relaxed text-muted-foreground line-clamp-3">
                      {featured.description}
                    </p>
                    <div className="flex items-center gap-2 pt-1 text-[11px] text-muted-foreground/80">
                      <Building2 className="h-3 w-3" />
                      <span className="capitalize">{featured.target ?? "All students"}</span>
                    </div>
                  </div>
                </article>
              </FadeIn>
            )}

            {filtered.length === 0 ? (
              <PremiumEmpty
                art="announcements"
                tone="success"
                compact
                title="No matching notices"
                description="Try a different keyword or switch back to All."
              />
            ) : (
              <div className="space-y-5">
                {grouped.map(([day, list]) => (
                  <section key={day} className="space-y-2.5">
                    <div className="flex items-center gap-2">
                      <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                        {day}
                      </h3>
                      <div className="h-px flex-1 bg-border-subtle" />
                      <span className="text-[11px] tabular-nums text-muted-foreground/70">
                        {list.length}
                      </span>
                    </div>

                    {list.map((a: any, i: number) => {
                      const expired = a.expires_at && isPast(new Date(a.expires_at));
                      const isCritical = a.priority === "critical";
                      return (
                        <FadeIn key={a.id} delay={i * 20}>
                          <article
                            className={cn(
                              "group relative overflow-hidden rounded-2xl border bg-surface-1 p-4 shadow-card transition-[transform,box-shadow] duration-180 active:scale-[0.99] hover:-translate-y-0.5 hover:shadow-elevated",
                              a.is_pinned && "border-l-[3px] border-l-primary",
                              isCritical ? "border-danger/30" : "border-border-subtle",
                              expired && "opacity-60",
                            )}
                          >
                            {isCritical && (
                              <div
                                aria-hidden
                                className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-danger/10 to-transparent"
                              />
                            )}
                            <div className="relative flex items-start gap-3">
                              <div
                                className={cn(
                                  "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                                  isCritical ? "bg-danger/12 text-danger" : "bg-primary/10 text-primary",
                                )}
                              >
                                {isCritical ? <AlertCircle className="h-4 w-4" /> : <Megaphone className="h-4 w-4" />}
                              </div>

                              <div className="min-w-0 flex-1 space-y-1.5">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  {a.is_pinned && (
                                    <span className="inline-flex items-center gap-1 rounded-full border border-primary/25 bg-primary/8 px-2 py-0.5 text-[10px] font-semibold text-primary">
                                      <Pin className="h-2.5 w-2.5" /> Pinned
                                    </span>
                                  )}
                                  <span
                                    className={cn(
                                      "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                                      PRIORITY_STYLE[a.priority] ?? PRIORITY_STYLE.normal,
                                    )}
                                  >
                                    {a.priority}
                                  </span>
                                  {expired && (
                                    <span className="rounded-full border border-border-subtle px-2 py-0.5 text-[10px] text-muted-foreground">
                                      Expired
                                    </span>
                                  )}
                                </div>

                                <h3 className="text-[14px] font-semibold leading-snug text-foreground">
                                  {a.title}
                                </h3>
                                <p className="text-[12.5px] leading-relaxed text-muted-foreground line-clamp-3">
                                  {a.description}
                                </p>

                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-[11px] text-muted-foreground/75">
                                  <span className="inline-flex items-center gap-1">
                                    <Building2 className="h-3 w-3" />
                                    <span className="capitalize">{a.target ?? "All students"}</span>
                                  </span>
                                  <span className="inline-flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {format(new Date(a.created_at), "h:mm a")}
                                  </span>
                                  {!expired && (
                                    <span className="inline-flex items-center gap-1 text-success">
                                      <Check className="h-3 w-3" /> Active
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </article>
                        </FadeIn>
                      );
                    })}
                  </section>
                ))}
              </div>
            )}
          </>
        )}
      </HeroOverlap>
    </PageContainer>
  );
}
