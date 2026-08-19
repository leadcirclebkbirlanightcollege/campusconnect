import { useEffect, useMemo } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CalendarDays, Clock, MapPin, ExternalLink, Image as ImageIcon } from "@/components/icons";

import { supabase } from "@/integrations/supabase/client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import LiveBadge from "@/components/lectures/LiveBadge";
import { useRecentUpdate } from "@/hooks/use-recent-update";
import AttendanceMarkingCard from "@/pages/student/attendance/AttendanceMarkingCard";

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

function publicFlyerUrl(path: string) {
  const { data } = supabase.storage.from("lecture-flyers").getPublicUrl(path);
  return data.publicUrl;
}

export default function LectureDetail() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const qc = useQueryClient();
  const { justUpdated, markUpdated } = useRecentUpdate();

  const lectureQuery = useQuery({
    queryKey: ["student", "lecture", id],
    enabled: Boolean(id),
    queryFn: async (): Promise<LectureRow | null> => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("lectures")
        .select("id,topic,lecture_date,start_time,end_time,venue,flyer_object_path,status")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as LectureRow | null;
    },
  });

  const flyerUrl = useMemo(() => {
    const path = lectureQuery.data?.flyer_object_path;
    return path ? publicFlyerUrl(path) : null;
  }, [lectureQuery.data?.flyer_object_path]);

  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`student_lecture_detail_${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lectures", filter: `id=eq.${id}` },
        async () => {
          await qc.invalidateQueries({ queryKey: ["student", "lecture", id] });
          markUpdated();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, qc]);

  return (
    <div className="mx-auto w-full max-w-[720px] px-4 py-6 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <Button asChild variant="outline" className="gap-2 rounded-2xl">
          <Link to="/lectures">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </Button>
      </div>

      {lectureQuery.isLoading ? (
        <Card className="border-primary/10">
          <CardContent className="py-10 text-center text-muted-foreground">Loading lecture…</CardContent>
        </Card>
      ) : !lectureQuery.data ? (
        <Card className="border-primary/10">
          <CardContent className="py-10 text-center text-muted-foreground">Lecture not found.</CardContent>
        </Card>
      ) : (
        <Card className="border-primary/10">
          <CardHeader>
            <CardTitle className="text-2xl">
              <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
                {lectureQuery.data.topic}
                {lectureQuery.data.status === "live" ? <LiveBadge /> : null}
                {lectureQuery.data.status === "ended" ? <Badge variant="secondary">Ended</Badge> : null}
              </span>
            </CardTitle>
            <CardDescription>Lecture details and attendance.</CardDescription>
            {justUpdated ? (
              <p className="text-xs text-muted-foreground">Last updated just now</p>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Flyer cover (static, non-clickable) */}
            <div className="overflow-hidden rounded-xl border border-border/60 bg-card/40">
              <AspectRatio ratio={16 / 9}>
                {flyerUrl ? (
                  <img
                    src={flyerUrl}
                    alt={`Lecture flyer for ${lectureQuery.data.topic}`}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-primary/15 via-background to-accent/10" />
                )}
              </AspectRatio>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-lg border border-border/60 p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarDays className="h-4 w-4" /> Date
                </div>
                <div className="font-medium">{lectureQuery.data.lecture_date}</div>
              </div>
              <div className="rounded-lg border border-border/60 p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" /> Time
                </div>
                <div className="font-medium">
                  {lectureQuery.data.start_time}–{lectureQuery.data.end_time}
                </div>
              </div>
              <div className="rounded-lg border border-border/60 p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" /> Venue
                </div>
                <div className="font-medium">{lectureQuery.data.venue}</div>
              </div>
            </div>

            <div className="rounded-lg border border-border/60 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5 text-primary" />
                  <span className="font-medium">Flyer</span>
                </div>
                {flyerUrl ? <Badge variant="secondary">Shown above</Badge> : <Badge variant="secondary">None</Badge>}
              </div>

              {flyerUrl ? (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button asChild variant="outline" className="gap-2">
                    <a href={flyerUrl} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-4 w-4" />
                      Open flyer
                    </a>
                  </Button>
                  <p className="text-sm text-muted-foreground">Optional: open the original in a new tab.</p>
                </div>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">No flyer uploaded for this lecture.</p>
              )}
            </div>

            <AttendanceMarkingCard
              lectureId={lectureQuery.data.id}
              initialToken={searchParams.get("token") ?? undefined}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
