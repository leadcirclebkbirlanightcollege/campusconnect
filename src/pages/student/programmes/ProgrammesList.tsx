import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { EmptyStateCard } from "@/components/ui/empty-state";
import { FadeIn } from "@/components/ui/motion";
import { cn } from "@/lib/utils";
import { BookOpen, ChevronRight, Tag } from "lucide-react";

type Programme = {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
};

export default function ProgrammesList() {
  const programmesQuery = useQuery({
    queryKey: ["student", "my-programmes-full"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: allotments, error: allotError } = await supabase
        .from("student_programme_allotments")
        .select("programme_id")
        .eq("student_user_id", user.id);

      if (allotError) throw allotError;
      if (!allotments || allotments.length === 0) return [];

      const programmeIds = allotments.map((a: { programme_id: string }) => a.programme_id);

      const { data: programmes, error: progError } = await supabase
        .from("programmes")
        .select("id, name, description, color")
        .in("id", programmeIds)
        .eq("is_active", true)
        .order("name");

      if (progError) throw progError;
      return programmes as Programme[];
    },
  });

  const lectureCountsQuery = useQuery({
    queryKey: ["student", "programme-lecture-counts"],
    enabled: (programmesQuery.data?.length ?? 0) > 0,
    queryFn: async () => {
      const programmeIds = programmesQuery.data?.map((p) => p.id) || [];
      const { data, error } = await supabase
        .from("lecture_programme_tags")
        .select("programme_id")
        .in("programme_id", programmeIds);
      if (error) throw error;
      const counts: Record<string, number> = {};
      data?.forEach((t: { programme_id: string }) => {
        counts[t.programme_id] = (counts[t.programme_id] || 0) + 1;
      });
      return counts;
    },
  });

  if (programmesQuery.isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
      </div>
    );
  }

  const programmes = programmesQuery.data ?? [];

  return (
    <div className="space-y-5 page-enter">
      {/* Header */}
      <FadeIn>
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-muted-foreground" />
          <h1 className="text-heading text-foreground">Learning Circles</h1>
        </div>
      </FadeIn>

      {programmes.length === 0 ? (
        <EmptyStateCard
          emoji="📖"
          title="No programmes assigned"
          description="You haven't been enrolled in any learning circles yet. Contact your administrator to get assigned."
        />
      ) : (
        <div className="space-y-2">
          {programmes.map((p, i) => {
            const lectureCount = lectureCountsQuery.data?.[p.id] ?? 0;
            const color = p.color ?? "#6366f1";

            return (
              <FadeIn key={p.id} delay={i * 25}>
                <Link
                  to={`/app/programmes/${p.id}`}
                  className={cn(
                    "group flex items-center gap-4 rounded-xl border border-border-subtle px-5 py-4",
                    "bg-surface-1 shadow-xs hover:shadow-sm hover:border-border-strong",
                    "transition-fast",
                  )}
                >
                  {/* Color dot */}
                  <div
                    className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${color}18`, border: `1px solid ${color}30` }}
                  >
                    <Tag className="h-4 w-4" style={{ color }} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <p className="text-[14px] font-semibold text-foreground truncate">{p.name}</p>
                    {p.description && (
                      <p className="text-[12px] text-muted-foreground line-clamp-1">{p.description}</p>
                    )}
                    <p className="text-[11px] text-muted-foreground">
                      {lectureCount} lecture{lectureCount !== 1 ? "s" : ""}
                    </p>
                  </div>

                  {/* Arrow */}
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 transition-fast" />
                </Link>
              </FadeIn>
            );
          })}
        </div>
      )}
    </div>
  );
}
