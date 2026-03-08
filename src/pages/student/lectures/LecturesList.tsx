import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { BookOpen, ChevronRight, MapPin, Clock } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { FadeIn } from "@/components/ui/motion";
import { StatusChip, LiveIndicator } from "@/components/ui/design-system";
import { EmptyStateCard } from "@/components/ui/empty-state";

type LectureRow = {
  id: string;
  topic: string;
  lecture_date: string;
  start_time: string;
  end_time: string;
  venue: string;
  flyer_object_path: string | null;
  status?: "scheduled" | "live" | "ended";
};

export default function LecturesList() {
  const qc = useQueryClient();
  const [view, setView] = useState<"upcoming" | "past">("upcoming");

  const lecturesQuery = useQuery({
    queryKey: ["student", "lectures", view],
    queryFn: async (): Promise<LectureRow[]> => {
      const today = new Date().toISOString().slice(0, 10);
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      let allottedProgrammeIds: string[] = [];
      if (userId) {
        const { data: allotments } = await supabase
          .from("student_programme_allotments")
          .select("programme_id")
          .eq("student_user_id", userId);
        allottedProgrammeIds = (allotments ?? []).map((a) => a.programme_id);
      }

      const { data: tags } = await supabase
        .from("lecture_programme_tags")
        .select("lecture_id, programme_id");

      const tagMap = new Map<string, string>();
      (tags ?? []).forEach((t) => tagMap.set(t.lecture_id, t.programme_id));

      let q = supabase
        .from("lectures")
        .select("id,topic,lecture_date,start_time,end_time,venue,flyer_object_path,status");

      if (view === "upcoming") {
        q = q.gte("lecture_date", today).order("lecture_date", { ascending: true });
      } else {
        q = q.lt("lecture_date", today).order("lecture_date", { ascending: false });
      }

      q = q.order("start_time", { ascending: true }).limit(200);

      const { data, error } = await q;
      if (error) throw error;

      return ((data ?? []) as LectureRow[]).filter((l) => {
        const taggedProgramme = tagMap.get(l.id);
        if (!taggedProgramme) return true;
        return allottedProgrammeIds.includes(taggedProgramme);
      });
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel("student_lectures_list")
      .on("postgres_changes", { event: "*", schema: "public", table: "lectures" }, async () => {
        await qc.invalidateQueries({ queryKey: ["student", "lectures"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);

  const lectures = lecturesQuery.data ?? [];

  return (
    <div className="space-y-5 page-enter">

      {/* ── Header ── */}
      <FadeIn>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            <h1 className="text-heading text-foreground">Lectures</h1>
          </div>

          {/* Toggle */}
          <div className="flex rounded-lg border border-border-subtle bg-surface-2 p-0.5">
            <button
              onClick={() => setView("upcoming")}
              className={cn(
                "px-3 py-1 rounded-md text-caption font-medium transition-fast",
                view === "upcoming"
                  ? "bg-surface-1 text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Upcoming
            </button>
            <button
              onClick={() => setView("past")}
              className={cn(
                "px-3 py-1 rounded-md text-caption font-medium transition-fast",
                view === "past"
                  ? "bg-surface-1 text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Past
            </button>
          </div>
        </div>
      </FadeIn>

      {/* ── Content ── */}
      {lecturesQuery.isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : lectures.length === 0 ? (
        <FadeIn>
          <div className="rounded-xl border border-border-subtle bg-surface-1 shadow-xs py-16 text-center">
            <BookOpen className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-body text-muted-foreground">No {view} lectures.</p>
            <p className="text-caption text-muted-foreground mt-1 flex items-center justify-center gap-1">
              <Info className="h-3 w-3" />
              Programme allotment may be pending.
            </p>
          </div>
        </FadeIn>
      ) : (
        <div className="space-y-2">
          {lectures.map((l, i) => (
            <FadeIn key={l.id} delay={i * 20}>
              <LectureCard lecture={l} />
            </FadeIn>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Lecture Card ─────────────────────────────────────────── */
function LectureCard({ lecture }: { lecture: LectureRow }) {
  const isLive = lecture.status === "live";
  const isEnded = lecture.status === "ended";

  const dateFmt = useMemo(() => {
    const d = new Date(lecture.lecture_date + "T00:00:00");
    return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
  }, [lecture.lecture_date]);

  return (
    <Link
      to={`/app/lectures/${lecture.id}`}
      className={cn(
        "group flex items-center gap-4 rounded-xl border px-5 py-4 transition-fast",
        "bg-surface-1 shadow-xs",
        isLive
          ? "border-success/25 hover:border-success/40"
          : isEnded
          ? "border-border-subtle opacity-80 hover:opacity-100"
          : "border-border-subtle hover:border-border-strong hover:shadow-sm",
      )}
    >
      {/* Date column */}
      <div className="flex-shrink-0 w-12 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground leading-none">
          {dateFmt.split(" ")[0]}
        </p>
        <p className="text-[20px] font-bold text-foreground leading-tight tabular-nums">
          {dateFmt.split(" ")[1]}
        </p>
        <p className="text-[10px] text-muted-foreground leading-none">
          {dateFmt.split(" ")[2]}
        </p>
      </div>

      {/* Divider */}
      <div className={cn(
        "w-px self-stretch rounded-full",
        isLive ? "bg-success/30" : "bg-border-subtle",
      )} />

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-start gap-2">
          <p className="text-body font-medium text-foreground leading-snug flex-1 min-w-0">
            {lecture.topic}
          </p>
          {isLive && <LiveIndicator className="shrink-0" />}
          {!isLive && (
            <StatusChip
              variant={isEnded ? "ended" : "scheduled"}
              label={isEnded ? "Ended" : "Scheduled"}
              className="shrink-0"
            />
          )}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <span className="flex items-center gap-1 text-caption text-muted-foreground">
            <Clock className="h-3 w-3" />
            {lecture.start_time}–{lecture.end_time}
          </span>
          <span className="flex items-center gap-1 text-caption text-muted-foreground">
            <MapPin className="h-3 w-3" />
            {lecture.venue}
          </span>
        </div>
      </div>

      {/* Arrow */}
      <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0 group-hover:text-muted-foreground transition-fast" />
    </Link>
  );
}
