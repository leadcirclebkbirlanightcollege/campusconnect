import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { EmptyStateCard } from "@/components/ui/empty-state";
import { FadeIn } from "@/components/ui/motion";
import { cn } from "@/lib/utils";
import { format, isPast } from "date-fns";
import { Megaphone, Pin, Clock } from "lucide-react";

const PRIORITY_STYLE: Record<string, string> = {
  critical: "bg-danger-soft text-danger border-danger/20",
  high:     "bg-warning-soft text-warning border-warning/20",
  normal:   "bg-surface-3 text-muted-foreground border-border-subtle",
  low:      "bg-surface-3 text-muted-foreground border-border-subtle",
};

export default function StudentAnnouncementsFeed() {
  const query = useQuery({
    queryKey: ["student", "announcements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select("id,title,description,priority,is_pinned,target,created_at,expires_at")
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(20);
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

  const items = query.data ?? [];

  return (
    <div className="space-y-5 page-enter">
      {/* Header */}
      <FadeIn>
        <div className="flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-muted-foreground" />
          <h1 className="text-heading text-foreground">Announcements</h1>
        </div>
      </FadeIn>

      {items.length === 0 ? (
        <EmptyStateCard
          emoji="📢"
          title="No announcements yet"
          description="Important notices from your college admin will appear here."
        />
      ) : (
        <div className="space-y-2">
          {items.map((a: any, i: number) => {
            const expired = a.expires_at && isPast(new Date(a.expires_at));
            return (
              <FadeIn key={a.id} delay={i * 20}>
                <div
                  className={cn(
                    "rounded-xl border bg-surface-1 px-5 py-4 space-y-2 shadow-xs transition-fast hover:shadow-sm",
                    a.is_pinned ? "border-l-[3px] border-l-primary border-border-subtle" : "border-border-subtle",
                    expired && "opacity-60",
                  )}
                >
                  <div className="flex items-start gap-2 flex-wrap">
                    {a.is_pinned && (
                      <span className="flex items-center gap-1 text-[10px] font-semibold text-primary bg-primary/8 border border-primary/20 rounded-full px-2 py-0.5">
                        <Pin className="h-2.5 w-2.5" /> Pinned
                      </span>
                    )}
                    <span className={cn(
                      "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                      PRIORITY_STYLE[a.priority] ?? PRIORITY_STYLE.normal,
                    )}>
                      {a.priority}
                    </span>
                    {expired && (
                      <span className="text-[10px] text-muted-foreground border border-border-subtle rounded-full px-2 py-0.5">Expired</span>
                    )}
                  </div>

                  <h3 className="text-[14px] font-semibold text-foreground leading-snug">{a.title}</h3>
                  <p className="text-[13px] text-muted-foreground leading-relaxed">{a.description}</p>

                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/60">
                    <Clock className="h-3 w-3" />
                    {format(new Date(a.created_at), "dd MMM yyyy, h:mm a")}
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
