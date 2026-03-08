import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, TrendingDown, Users, ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface RiskStudent {
  user_id: string;
  name: string;
  attendance_consistency: number;
  engagement_index: number;
  tier: string;
  risk_flags: string[];
}

export default function RiskMonitorPanel({ onNavigateTab }: { onNavigateTab: (tab: string) => void }) {
  const { data: riskStudents, isLoading } = useQuery({
    queryKey: ["admin", "risk-students"],
    queryFn: async (): Promise<RiskStudent[]> => {
      const { data: intel, error } = await supabase
        .from("student_intelligence")
        .select("user_id, attendance_consistency, engagement_index, tier, risk_flags")
        .or("attendance_consistency.lt.50,engagement_index.lt.40")
        .order("attendance_consistency", { ascending: true })
        .limit(6);
      if (error) throw error;

      if (!intel?.length) return [];

      const userIds = intel.map((r) => r.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name")
        .in("user_id", userIds);

      const nameMap: Record<string, string> = {};
      profiles?.forEach((p) => { nameMap[p.user_id] = p.name; });

      return intel.map((r) => ({
        ...r,
        name: nameMap[r.user_id] ?? "Unknown",
        risk_flags: (r.risk_flags as string[]) ?? [],
      }));
    },
    staleTime: 30_000,
  });

  const count = riskStudents?.length ?? 0;

  return (
    <div className="rounded-2xl border border-border-subtle bg-surface-1 overflow-hidden dashboard-panel shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-danger/10 flex items-center justify-center">
            <AlertTriangle className="h-4 w-4 text-danger" />
          </div>
          <div>
            <p className="text-body font-semibold text-foreground">At-Risk Students</p>
            <p className="text-[11px] text-muted-foreground">Low attendance or engagement</p>
          </div>
        </div>
        {count > 0 && (
          <span className="inline-flex items-center gap-1 bg-danger/10 text-danger text-[11px] font-semibold px-2.5 py-1 rounded-full border border-danger/20">
            <AlertTriangle className="h-3 w-3" />
            {count} flagged
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="px-5 py-4 space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-2.5 w-20" />
              </div>
              <Skeleton className="h-5 w-10" />
            </div>
          ))}
        </div>
      ) : count === 0 ? (
        <div className="px-5 py-8 text-center space-y-2">
          <Users className="h-8 w-8 text-success mx-auto opacity-40" />
          <p className="text-caption text-muted-foreground">All students are performing well 🎉</p>
        </div>
      ) : (
        <div className="divide-y divide-border-subtle">
          {riskStudents!.map((s) => (
            <div key={s.user_id} className="flex items-center gap-3 px-5 py-3 group hover:bg-surface-2 transition-colors duration-120">
              <div className="h-8 w-8 rounded-full bg-danger/10 flex items-center justify-center shrink-0">
                <TrendingDown className="h-3.5 w-3.5 text-danger" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-caption font-medium text-foreground truncate">{s.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  Att: {s.attendance_consistency}% · Eng: {s.engagement_index}%
                </p>
              </div>
              <div className={cn(
                "text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                s.attendance_consistency < 40 ? "bg-danger/10 text-danger border-danger/20" : "bg-warning/10 text-warning border-warning/20"
              )}>
                {s.attendance_consistency < 40 ? "High Risk" : "Medium"}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="px-5 py-3 border-t border-border-subtle">
        <Button variant="ghost" size="sm" className="w-full gap-2 text-caption text-muted-foreground hover:text-foreground" onClick={() => onNavigateTab("students")}>
          View all students <ArrowRight className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
