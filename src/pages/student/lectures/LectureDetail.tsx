import { useMemo } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CalendarDays, Clock, MapPin, ExternalLink, Image as ImageIcon } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import AttendanceMarkingCard from "@/pages/student/attendance/AttendanceMarkingCard";

type LectureRow = {
  id: string;
  topic: string;
  lecture_date: string;
  start_time: string;
  end_time: string;
  venue: string;
  flyer_object_path: string | null;
};

function publicFlyerUrl(path: string) {
  const { data } = supabase.storage.from("lecture-flyers").getPublicUrl(path);
  return data.publicUrl;
}

export default function LectureDetail() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();

  const lectureQuery = useQuery({
    queryKey: ["student", "lecture", id],
    enabled: Boolean(id),
    queryFn: async (): Promise<LectureRow | null> => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("lectures")
        .select("id,topic,lecture_date,start_time,end_time,venue,flyer_object_path")
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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <Button asChild variant="outline" className="gap-2">
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
            <CardTitle className="text-2xl">{lectureQuery.data.topic}</CardTitle>
            <CardDescription>Lecture details and flyer.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
                {flyerUrl ? <Badge variant="secondary">Available</Badge> : <Badge variant="secondary">None</Badge>}
              </div>

              {flyerUrl ? (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button asChild variant="outline" className="gap-2">
                    <a href={flyerUrl} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-4 w-4" />
                      Open flyer
                    </a>
                  </Button>
                  <p className="text-sm text-muted-foreground">
                    If the flyer is an image, your browser will preview it.
                  </p>
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
