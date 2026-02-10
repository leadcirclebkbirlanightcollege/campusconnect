import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight } from "lucide-react";

interface ProgrammeSummary {
  id: string;
  name: string;
  color: string | null;
  is_active: boolean;
  enrolled: number;
}

export default function ProgrammeHealthSection({ onNavigateTab }: { onNavigateTab: (tab: string) => void }) {
  const { data: programmes, isLoading } = useQuery({
    queryKey: ["admin", "programme-health"],
    queryFn: async (): Promise<ProgrammeSummary[]> => {
      // Get programmes
      const { data: progs, error: pe } = await supabase
        .from("programmes")
        .select("id, name, color, is_active")
        .order("name");
      if (pe) throw pe;

      // Get allotment counts
      const { data: allotments, error: ae } = await supabase
        .from("student_programme_allotments")
        .select("programme_id");
      if (ae) throw ae;

      const countMap: Record<string, number> = {};
      allotments?.forEach((a) => {
        countMap[a.programme_id] = (countMap[a.programme_id] || 0) + 1;
      });

      return (progs ?? []).map((p) => ({
        ...p,
        enrolled: countMap[p.id] ?? 0,
      }));
    },
    staleTime: 30_000,
  });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Programme Health
        </h2>
        <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => onNavigateTab("programmes")}>
          View all <ArrowRight className="h-3 w-3" />
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border-border/60">
              <CardContent className="p-5 space-y-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-8 w-12" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !programmes?.length ? (
        <Card className="border-border/60">
          <CardContent className="p-8 text-center">
            <p className="text-sm text-muted-foreground">No programmes created yet.</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => onNavigateTab("programmes")}>
              Create Programme
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {programmes.map((p) => (
            <Card
              key={p.id}
              className="border-border/60 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => onNavigateTab("programmes")}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: p.color || "hsl(var(--primary))" }}
                      />
                      <p className="text-sm font-semibold text-foreground">{p.name}</p>
                    </div>
                    <p className="text-2xl font-bold text-foreground">{p.enrolled}</p>
                    <p className="text-xs text-muted-foreground">Students enrolled</p>
                  </div>
                  <Badge
                    variant={p.is_active ? "default" : "secondary"}
                    className={p.is_active ? "bg-success/15 text-success border-0" : ""}
                  >
                    {p.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
