import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyStateCard } from "@/components/ui/empty-state";
import { FadeIn } from "@/components/ui/motion";
import { cn } from "@/lib/utils";
import { Sparkles, Image as ImageIcon, Quote } from "lucide-react";

const TYPE_META: Record<string, { label: string; icon: React.ReactNode; bg: string; color: string }> = {
  meme:    { label: "Meme of the Day", icon: <ImageIcon className="h-4 w-4" />, bg: "bg-warning/10", color: "text-warning" },
  suvichar:{ label: "Daily Suvichar",  icon: <Quote className="h-4 w-4" />,     bg: "bg-primary/10", color: "text-primary" },
};

export default function StudentDailyContent() {
  const today = new Date().toISOString().split("T")[0];

  const query = useQuery({
    queryKey: ["student", "daily_content", today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_content")
        .select("id,title,body,content_type,publish_date,image_url")
        .eq("is_active", true)
        .order("publish_date", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
  });

  if (query.isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
      </div>
    );
  }

  const items = query.data ?? [];

  return (
    <div className="space-y-5 page-enter">
      {/* Header */}
      <FadeIn>
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-muted-foreground" />
          <h1 className="text-heading text-foreground">Daily Content</h1>
        </div>
      </FadeIn>

      {items.length === 0 ? (
        <EmptyStateCard
          emoji="✨"
          title="Nothing published today"
          description="Check back later — your daily dose of inspiration and content will appear here."
        />
      ) : (
        <div className="space-y-3">
          {items.map((c: any, i: number) => {
            const meta = TYPE_META[c.content_type] ?? TYPE_META.suvichar;
            return (
              <FadeIn key={c.id} delay={i * 40}>
                <div className="rounded-xl border border-border-subtle bg-surface-1 shadow-xs overflow-hidden">
                  {/* Image */}
                  {c.image_url && (
                    <img
                      src={c.image_url}
                      alt={c.title ?? "Daily content"}
                      className="w-full max-h-64 object-cover"
                      loading="lazy"
                    />
                  )}

                  <div className="px-5 py-5 space-y-3">
                    {/* Header row */}
                    <div className="flex items-center justify-between gap-2">
                      <div className={cn(
                        "flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold border",
                        meta.bg,
                        meta.color,
                        "border-transparent",
                      )}>
                        {meta.icon}
                        {meta.label}
                      </div>
                      {c.publish_date && (
                        <span className="text-[11px] text-muted-foreground">{c.publish_date}</span>
                      )}
                    </div>

                    {/* Content */}
                    {c.title && (
                      <h3 className="text-[15px] font-semibold text-foreground leading-snug">{c.title}</h3>
                    )}
                    {c.body && (
                      <p className={cn(
                        "text-[13px] text-foreground/80 leading-relaxed",
                        c.content_type === "suvichar" && "italic border-l-2 border-primary/30 pl-3",
                      )}>
                        {c.content_type === "suvichar" ? `"${c.body}"` : c.body}
                      </p>
                    )}
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
