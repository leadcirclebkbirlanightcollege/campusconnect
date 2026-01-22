import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, MapPin, ArrowRight } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import LiveBadge from "@/components/lectures/LiveBadge";

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

  const lecturesQuery = useQuery({
    queryKey: ["student", "lectures"],
    queryFn: async (): Promise<LectureRow[]> => {
      const today = new Date().toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("lectures")
        .select("id,topic,lecture_date,start_time,end_time,venue,flyer_object_path,status")
        .gte("lecture_date", today)
        .order("lecture_date", { ascending: true })
        .order("start_time", { ascending: true })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as LectureRow[];
    },
  });

  const grouped = useMemo(() => {
    const out: Record<string, LectureRow[]> = {};
    for (const l of lecturesQuery.data ?? []) (out[l.lecture_date] ??= []).push(l);
    return out;
  }, [lecturesQuery.data]);

  useEffect(() => {
    const channel = supabase
      .channel("student_lectures_list")
      .on("postgres_changes", { event: "*", schema: "public", table: "lectures" }, async () => {
        await qc.invalidateQueries({ queryKey: ["student", "lectures"] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold bg-gradient-premium bg-clip-text text-transparent mb-2">
          Lectures
        </h1>
        <p className="text-muted-foreground">Browse upcoming lectures and open details.</p>
      </div>

      <div className="space-y-6">
        {lecturesQuery.isLoading ? (
          <Card className="border-primary/10">
            <CardContent className="py-10 text-center text-muted-foreground">Loading lectures…</CardContent>
          </Card>
        ) : Object.keys(grouped).length === 0 ? (
          <Card className="border-primary/10">
            <CardContent className="py-10 text-center text-muted-foreground">No upcoming lectures.</CardContent>
          </Card>
        ) : (
          Object.entries(grouped).map(([date, items]) => (
            <Card key={date} className="border-primary/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-primary" />
                  {date}
                </CardTitle>
                <CardDescription>{items.length} lecture(s)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {items.map((l) => (
                  <div key={l.id} className="rounded-lg border border-border/60 p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="font-medium">{l.topic}</div>
                          {l.status === "live" ? <LiveBadge /> : null}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {l.start_time}–{l.end_time}
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                          <MapPin className="h-4 w-4" />
                          {l.venue}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {l.flyer_object_path ? <Badge variant="secondary">Flyer</Badge> : null}
                        <Button asChild variant="outline" className="gap-2">
                          <Link to={`/lectures/${l.id}`}>
                            Details
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
