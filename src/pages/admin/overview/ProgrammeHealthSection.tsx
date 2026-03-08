import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, GraduationCap, Users } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ProgrammeSummary {
  id: string; name: string; color: string | null; is_active: boolean; enrolled: number;
}

export default function ProgrammeHealthSection({ onNavigateTab }: { onNavigateTab: (tab: string) => void }) {
  const { data: programmes, isLoading } = useQuery({
    queryKey: ["admin", "programme-health"],
    queryFn: async (): Promise<ProgrammeSummary[]> => {
      const { data: progs, error: pe } = await supabase.from("programmes").select("id,name,color,is_active").order("name");
      if (pe) throw pe;
      const { data: allotments } = await supabase.from("student_programme_allotments").select("programme_id");
      const countMap: Record<string, number> = {};
      allotments?.forEach((a) => { countMap[a.programme_id] = (countMap[a.programme_id] || 0) + 1; });
      return (progs ?? []).map((p) => ({ ...p, enrolled: countMap[p.id] ?? 0 }));
    },
    staleTime: 30_000,
  });

  return (
    <div className="rounded-2xl border border-border-subtle bg-surface-1 overflow-hidden dashboard-panel shadow-sm">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center">
            <GraduationCap className="h-4 w-4 text-accent" />
          </div>
          <div>
            <p className="text-body font-semibold text-foreground">Programme Health</p>
            <p className="text-[11px] text-muted-foreground">Active learning circles & enrollment</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="gap-1 text-caption text-muted-foreground hover:text-foreground" onClick={() => onNavigateTab("programmes")}>
          Manage <ArrowRight className="h-3 w-3" />
        </Button>
      </div>

      {isLoading ? (
        <div className="p-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
      ) : !programmes?.length ? (
        <div className="p-8 text-center space-y-3">
          <GraduationCap className="h-8 w-8 text-muted-foreground mx-auto opacity-40" />
          <p className="text-caption text-muted-foreground">No programmes created yet.</p>
          <Button variant="outline" size="sm" onClick={() => onNavigateTab("programmes")}>Create Programme</Button>
        </div>
      ) : (
        <div className="p-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {programmes.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: i * 0.05 }}
              className="rounded-xl border border-border-subtle bg-surface-2 p-4 cursor-pointer hover:border-primary/30 hover:bg-surface-3 transition-all duration-150 group"
              onClick={() => onNavigateTab("programmes")}
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: p.color || "hsl(var(--primary))" }} />
                  <p className="text-body font-semibold text-foreground truncate">{p.name}</p>
                </div>
                <Badge variant={p.is_active ? "default" : "secondary"}
                  className={cn("shrink-0 text-[10px]", p.is_active ? "bg-success/15 text-success border-0" : "")}>
                  {p.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[22px] font-bold text-foreground tabular-nums">{p.enrolled}</span>
                <span className="text-caption text-muted-foreground self-end pb-0.5">students</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
