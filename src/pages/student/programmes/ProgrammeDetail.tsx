import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Calendar, Clock, MapPin, BookOpen } from "lucide-react";
import UpcomingLectureCard from "@/components/lectures/UpcomingLectureCard";

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
      // Get lecture IDs tagged to this programme
      const { data: tags, error: tagsError } = await supabase
        .from("lecture_programme_tags")
        .select("lecture_id")
        .eq("programme_id", id);

      if (tagsError) throw tagsError;

      if (!tags || tags.length === 0) {
        return [];
      }

      const lectureIds = tags.map((t: { lecture_id: string }) => t.lecture_id);

      // Get lecture details
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
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  if (!programmeQuery.data) {
    return (
      <div className="space-y-6">
        <Button asChild variant="ghost" size="sm">
          <Link to="/app/programmes">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Programmes
          </Link>
        </Button>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <BookOpen className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Programme not found or you don't have access.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const programme = programmeQuery.data;
  const upcomingLectures = lecturesQuery.data?.filter((l) => l.status !== "ended") || [];
  const pastLectures = lecturesQuery.data?.filter((l) => l.status === "ended") || [];

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link to="/app/programmes">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Programmes
        </Link>
      </Button>

      <div className="flex items-start gap-4">
        <div
          className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${programme.color}20` }}
        >
          <BookOpen className="h-6 w-6" style={{ color: programme.color }} />
        </div>
        <div>
          <h1 className="text-3xl font-bold">{programme.name}</h1>
          {programme.description && (
            <p className="text-muted-foreground mt-1">{programme.description}</p>
          )}
        </div>
      </div>

      {/* Upcoming / Live Lectures */}
      <Card className="border-primary/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Upcoming Lectures
          </CardTitle>
          <CardDescription>Sessions scheduled for this programme</CardDescription>
        </CardHeader>
        <CardContent>
          {lecturesQuery.isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Skeleton className="h-48" />
              <Skeleton className="h-48" />
            </div>
          ) : upcomingLectures.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No upcoming lectures scheduled for this programme.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {upcomingLectures.map((l) => (
                <UpcomingLectureCard
                  key={l.id}
                  lecture={l}
                  to={`/app/lectures/${l.id}`}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Past Lectures */}
      {pastLectures.length > 0 && (
        <Card className="border-muted">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-5 w-5" />
              Past Lectures
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {pastLectures.map((l) => (
                <li key={l.id}>
                  <Link
                    to={`/app/lectures/${l.id}`}
                    className="flex items-center justify-between rounded-lg border border-border/40 bg-card/50 px-4 py-3 hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-sm">{l.topic}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(l.lecture_date).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {l.venue}
                        </span>
                      </div>
                    </div>
                    <Badge variant="secondary">Ended</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
