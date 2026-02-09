import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, Calendar, Users, ArrowRight, AlertCircle } from "lucide-react";

type Programme = {
  id: string;
  name: string;
  description: string | null;
  color: string;
};

type LectureCount = {
  programme_id: string;
  count: number;
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

      if (!allotments || allotments.length === 0) {
        return [];
      }

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

  // Get lecture counts per programme
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
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (programmesQuery.data?.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">My Learning Circles</h1>
          <p className="text-muted-foreground">Your allotted programmes and sessions</p>
        </div>

        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <AlertCircle className="h-16 w-16 text-amber-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Programmes Assigned</h2>
            <p className="text-muted-foreground max-w-md">
              You haven't been assigned to any learning circles yet. Please contact the administrator for programme allotment.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Learning Circles</h1>
        <p className="text-muted-foreground">Your allotted programmes and sessions</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {programmesQuery.data?.map((p) => {
          const lectureCount = lectureCountsQuery.data?.[p.id] || 0;

          return (
            <Link key={p.id} to={`/app/programmes/${p.id}`}>
              <Card className="h-full transition-all hover:shadow-lg hover:border-primary/20 group relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: p.color }} />
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${p.color}20` }}>
                      <BookOpen className="h-5 w-5" style={{ color: p.color }} />
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <CardTitle className="text-lg mt-3">{p.name}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {p.description || "No description available"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {lectureCount} lectures
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
