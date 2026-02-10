import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Info } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import UpcomingLectureCard from "@/components/lectures/UpcomingLectureCard";
import { useRecentUpdate } from "@/hooks/use-recent-update";

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
  const { justUpdated, markUpdated } = useRecentUpdate();

  const lecturesQuery = useQuery({
    queryKey: ["student", "lectures"],
    queryFn: async (): Promise<LectureRow[]> => {
      const today = new Date().toISOString().slice(0, 10);

      // 1. Get the current user's allotted programme IDs
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

      // 2. Get all lectures tagged to programmes
      const { data: tags } = await supabase
        .from("lecture_programme_tags")
        .select("lecture_id, programme_id");

      const tagMap = new Map<string, string>();
      (tags ?? []).forEach((t) => tagMap.set(t.lecture_id, t.programme_id));

      // 3. Fetch upcoming lectures
      const { data, error } = await supabase
        .from("lectures")
        .select("id,topic,lecture_date,start_time,end_time,venue,flyer_object_path,status")
        .gte("lecture_date", today)
        .order("lecture_date", { ascending: true })
        .order("start_time", { ascending: true })
        .limit(200);
      if (error) throw error;

      // 4. Filter: show lecture if untagged OR tagged to an allotted programme
      const filtered = (data ?? []).filter((l) => {
        const taggedProgramme = tagMap.get(l.id);
        if (!taggedProgramme) return true; // untagged = visible to all
        return allottedProgrammeIds.includes(taggedProgramme);
      });

      return filtered as LectureRow[];
    },
  });

  const grouped = useMemo(() => {
    const out: Record<string, LectureRow[]> = {};
    for (const l of lecturesQuery.data ?? []) (out[l.lecture_date] ??= []).push(l);
    return out;
  }, [lecturesQuery.data]);

  const hasNoProgramme = useMemo(() => {
    // Check if user has no allotted programmes at all - we check from the query data
    // If there are zero lectures and no error, it could mean no allotment
    return false; // We'll show this based on a separate check
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("student_lectures_list")
      .on("postgres_changes", { event: "*", schema: "public", table: "lectures" }, async () => {
        await qc.invalidateQueries({ queryKey: ["student", "lectures"] });
        markUpdated();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc, markUpdated]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold bg-gradient-premium bg-clip-text text-transparent mb-2">Lectures</h1>
        <p className="text-muted-foreground">Browse upcoming lectures for your programmes.</p>
        {justUpdated ? <p className="mt-1 text-xs text-muted-foreground">Last updated just now</p> : null}
      </div>

      <div className="space-y-6">
        {lecturesQuery.isLoading ? (
          <Card className="border-primary/10">
            <CardContent className="py-10 text-center text-muted-foreground">Loading lectures…</CardContent>
          </Card>
        ) : Object.keys(grouped).length === 0 ? (
          <Card className="border-primary/10">
            <CardContent className="py-10 text-center space-y-2">
              <p className="text-muted-foreground">No upcoming lectures.</p>
              <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                <Info className="h-3.5 w-3.5" />
                If you expect to see lectures, your programme allotment may be pending. Please contact the admin.
              </p>
            </CardContent>
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
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((l) => (
                    <UpcomingLectureCard
                      key={l.id}
                      lecture={l}
                      to={`/app/lectures/${l.id}`}
                      showDateChip={false}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
