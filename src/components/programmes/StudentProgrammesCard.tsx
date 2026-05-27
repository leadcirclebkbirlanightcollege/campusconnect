import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, ArrowRight, AlertCircle } from "lucide-react";

type Programme = {
  id: string;
  name: string;
  description: string | null;
  color: string;
};

export default function StudentProgrammesCard() {
  const programmesQuery = useQuery({
    queryKey: ["student", "my-programmes"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get allotments for this student
      const { data: allotments, error: allotError } = await supabase
        .from("student_programme_allotments")
        .select("programme_id")
        .eq("student_user_id", user.id);

      if (allotError) throw allotError;

      if (!allotments || allotments.length === 0) {
        return [];
      }

      const programmeIds = allotments.map((a: { programme_id: string }) => a.programme_id);

      // Get programme details
      const { data: programmes, error: progError } = await supabase
        .from("programmes")
        .select("id, name, description, color")
        .in("id", programmeIds)
        .eq("is_active", true);

      if (progError) throw progError;

      return programmes as Programme[];
    },
  });

  if (programmesQuery.isLoading) {
    return (
      <Card className="border-primary/10">
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-60" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (programmesQuery.data?.length === 0) {
    return (
      <Card className="border-amber-500/20 bg-amber-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            Learning Circles
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Programme allotment pending. Please contact admin for assignment.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/10">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            My Learning Circles
          </CardTitle>
          <CardDescription>Your allotted programmes</CardDescription>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/app/programmes">
            View All
            <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2">
          {programmesQuery.data?.map((p) => (
            <Link
              key={p.id}
              to={`/app/programmes/${p.id}`}
              className="group flex items-start gap-3 rounded-xl border border-border/40 bg-card/50 p-4 transition-all hover:shadow-md hover:border-primary/20"
            >
              <div
                className="mt-1 h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: p.color }}
              />
              <div className="min-w-0">
                <p className="font-medium text-sm text-foreground group-hover:text-primary transition-colors">
                  {p.name}
                </p>
                {p.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                    {p.description}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
