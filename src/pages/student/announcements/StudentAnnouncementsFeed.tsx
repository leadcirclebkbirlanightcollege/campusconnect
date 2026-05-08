import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyStateCard } from "@/components/ui/empty-state";
import { FadeIn } from "@/components/ui/motion";
import { PageContainer } from "@/layout/PageContainer";
import { PageHeader } from "@/layout/PageHeader";
import { SegmentedFilter } from "@/components/ui/SegmentedFilter";
import { cn } from "@/lib/utils";
import { format, isPast } from "date-fns";
import { Pin, Clock, AlertCircle } from "lucide-react";

type Filter = "all" | "pinned" | "critical";

const PRIORITY_STYLE: Record<string, string> = {
  critical: "bg-danger-soft text-danger border-danger/30",
  high: "bg-warning-soft text-warning border-warning/30",
  normal: "bg-surface-3 text-muted-foreground border-border-subtle",
  low: "bg-surface-3 text-muted-foreground border-border-subtle",
};

export default function StudentAnnouncementsFeed() {
  const [filter, setFilter] = useState<Filter>("all");

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

  const items = query.data ?? [];
  const counts = useMemo(
    () => ({
      all: items.length,
      pinned: items.filter((a: any) => a.is_pinned).length,
      critical: items.filter((a: any) => a.priority === "critical").length,
    }),
    [items],
  );

  const filtered = useMemo(() => {
    if (filter === "pinned") return items.filter((a: any) => a.is_pinned);
    if (filter === "critical") return items.filter((a: any) => a.priority === "critical");
    return items;
  }, [items, filter]);

  return (
    <PageContainer className="space-y-4">
      <PageHeader title="Announcements" subtitle="Notices and updates from your college" gradient />

      <SegmentedFilter
        value={filter}
        onChange={setFilter}
        options={[
          { value: "all", label: "All", count: counts.all },
          { value: "pinned", label: "Pinned", count: counts.pinned },
          { value: "critical", label: "Urgent", count: counts.critical },
        ]}
      />

      {query.isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyStateCard
          emoji="📢"
          title={filter === "all" ? "No announcements yet" : "Nothing here"}
          description="Important notices from your college admin will appear here."
        />
      ) : (
        <div className="space-y-2.5">
          {filtered.map((a: any, i: number) => {
            const expired = a.expires_at && isPast(new Date(a.expires_at));
            const isCritical = a.priority === "critical";
            return (
              <FadeIn key={a.id} delay={i * 20}>
                <article
                  className={cn(
                    "group relative rounded-2xl border bg-surface-1 p-4 shadow-card transition-[transform,box-shadow] duration-180 hover:-translate-y-0.5 hover:shadow-elevated",
                    a.is_pinned && "border-l-[3px] border-l-primary",
                    isCritical ? "border-danger/30" : "border-border-subtle",
                    expired && "opacity-60",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                        isCritical ? "bg-danger/12 text-danger" : "bg-primary/10 text-primary",
                      )}
                    >
                      {isCritical ? <AlertCircle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
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

                      <h3 className="text-[14px] font-semibold leading-snug text-foreground">{a.title}</h3>
                      <p className="text-[13px] leading-relaxed text-muted-foreground">{a.description}</p>

                      <div className="flex items-center gap-1.5 pt-1 text-[11px] text-muted-foreground/70">
                        <Clock className="h-3 w-3" />
                        {format(new Date(a.created_at), "dd MMM yyyy, h:mm a")}
                      </div>
                    </div>
                  </div>
                </article>
              </FadeIn>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}
