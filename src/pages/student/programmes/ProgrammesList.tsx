import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, ArrowRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

type Programme = {
  id: string;
  name: string;
  description: string | null;
  color: string;
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
      if (!allotments || allotments.length === 0) return [];

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
      <div className="space-y-3">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 rounded-xl" />)}
      </div>
    );
  }

  if (programmesQuery.data?.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="h-8 w-8 text-muted-foreground mb-3" />
          <h3 className="text-sm font-medium mb-1">No Programmes Assigned</h3>
          <p className="text-xs text-muted-foreground max-w-sm">
            You haven't been assigned to any learning circles yet. Please contact the administrator.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Programme</TableHead>
                <TableHead className="w-32">Lectures</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {programmesQuery.data?.map((p) => {
                const lectureCount = lectureCountsQuery.data?.[p.id] || 0;
                return (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: p.color }}
                        />
                        <div>
                          <p className="text-sm font-medium">{p.name}</p>
                          {p.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1">{p.description}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground tabular-nums">
                      {lectureCount}
                    </TableCell>
                    <TableCell>
                      <Button asChild variant="ghost" size="sm" className="h-7 text-xs gap-1">
                        <Link to={`/app/programmes/${p.id}`}>
                          View <ArrowRight className="h-3 w-3" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
