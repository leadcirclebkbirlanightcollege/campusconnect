import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, BookOpen } from "@/components/icons";
import ShareButton from "@/components/share/ShareButton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Programme = {
  id: string;
  name: string;
  description: string | null;
  color: string;
};

type Lecture = {
  id: string;
  topic: string;
  lecture_date: string;
  start_time: string;
  end_time: string;
  venue: string;
  status: "scheduled" | "live" | "ended";
  flyer_object_path: string | null;
};

export default function ProgrammeDetail() {
  const { id } = useParams<{ id: string }>();

  const programmeQuery = useQuery({
    queryKey: ["student", "programme", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("programmes")
        .select("id, name, description, color")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as Programme | null;
    },
  });

  const lecturesQuery = useQuery({
    queryKey: ["student", "programme-lectures", id],
    enabled: !!id,
    queryFn: async () => {
      const { data: tags, error: tagsError } = await supabase
        .from("lecture_programme_tags")
        .select("lecture_id")
        .eq("programme_id", id);
      if (tagsError) throw tagsError;
      if (!tags || tags.length === 0) return [];

      const lectureIds = tags.map((t: { lecture_id: string }) => t.lecture_id);
      const { data: lectures, error: lecturesError } = await supabase
        .from("lectures")
        .select("id, topic, lecture_date, start_time, end_time, venue, status, flyer_object_path")
        .in("id", lectureIds)
        .order("lecture_date", { ascending: true })
        .order("start_time", { ascending: true });
      if (lecturesError) throw lecturesError;
      return lectures as Lecture[];
    },
  });

  if (programmeQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-72" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!programmeQuery.data) {
    return (
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm">
          <Link to="/app/programmes">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Programme not found.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const programme = programmeQuery.data;
  const lectures = lecturesQuery.data ?? [];

  const statusBadge = (status: string) => {
    if (status === "live") return <Badge className="bg-success text-success-foreground text-[10px]">Live</Badge>;
    if (status === "ended") return <Badge variant="secondary" className="text-[10px]">Ended</Badge>;
    return <Badge variant="outline" className="text-[10px]">Scheduled</Badge>;
  };

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="h-8 text-xs">
        <Link to="/app/programmes">
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
          Back to Programmes
        </Link>
      </Button>

      {/* Programme header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 rounded-full shrink-0" style={{ backgroundColor: programme.color }} />
          <div>
            <h2 className="text-xl font-bold text-foreground">{programme.name}</h2>
            {programme.description && (
              <p className="text-sm text-muted-foreground mt-0.5">{programme.description}</p>
            )}
          </div>
        </div>

        <ShareButton
          title={programme.name}
          description={programme.description}
          url={`/clubs/${programme.id}`}
          entityType="club"
          variant="outline"
          size="sm"
          className="rounded-xl font-semibold shrink-0"
        />
      </div>

      {/* Lectures table */}
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
                ) : lectures.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                      No lectures scheduled for this programme.
                    </TableCell>
                  </TableRow>
                ) : (
                  lectures.map((l) => (
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
