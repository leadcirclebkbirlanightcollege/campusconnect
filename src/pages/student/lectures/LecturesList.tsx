import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Info } from "lucide-react";
import { Link } from "react-router-dom";

import { supabase } from "@/integrations/supabase/client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

  const statusBadge = (status?: string) => {
    if (status === "live") return <Badge className="bg-success text-success-foreground text-xs">Live</Badge>;
    if (status === "ended") return <Badge variant="secondary" className="text-xs">Ended</Badge>;
    return <Badge variant="outline" className="text-xs">Scheduled</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button
          variant={view === "upcoming" ? "default" : "outline"}
          size="sm"
          onClick={() => setView("upcoming")}
        >
          Upcoming
        </Button>
        <Button
          variant={view === "past" ? "default" : "outline"}
          size="sm"
          onClick={() => setView("past")}
        >
          Past
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lecture</TableHead>
                  <TableHead className="w-28">Date</TableHead>
                  <TableHead className="w-32">Time</TableHead>
                  <TableHead className="w-28">Venue</TableHead>
                  <TableHead className="w-24">Status</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lecturesQuery.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">Loading...</TableCell>
                  </TableRow>
                ) : (lecturesQuery.data ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                      <div className="space-y-1">
                        <p>No {view} lectures found.</p>
                        <p className="text-xs flex items-center justify-center gap-1">
                          <Info className="h-3 w-3" />
                          Your programme allotment may be pending.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  (lecturesQuery.data ?? []).map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="text-sm font-medium">{l.topic}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{l.lecture_date}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{l.start_time}–{l.end_time}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{l.venue}</TableCell>
                      <TableCell>{statusBadge(l.status)}</TableCell>
                      <TableCell>
                        <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
                          <Link to={`/app/lectures/${l.id}`}>View</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
