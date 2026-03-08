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
    <div className="rounded-xl border border-border-subtle bg-surface-1 overflow-hidden shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-border-subtle">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-danger/10 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-4 w-4 text-danger" />
          </div>
          <div>
            <p className="text-base font-semibold text-foreground">At-Risk Students</p>
            <p className="text-xs text-muted-foreground">Low attendance or engagement</p>
          </div>
        </div>
        {count > 0 && (
          <span className="inline-flex items-center gap-1.5 bg-danger/10 text-danger text-xs font-semibold px-2.5 py-1.5 rounded-full border border-danger/20">
            <AlertTriangle className="h-3.5 w-3.5" />
            {count} flagged
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="p-4 space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          ))}
        </div>
      ) : count === 0 ? (
        <div className="px-4 py-10 text-center space-y-2">
          <Users className="h-10 w-10 text-success mx-auto opacity-40" />
          <p className="text-sm text-muted-foreground">All students are performing well 🎉</p>
        </div>
      ) : (
        <div className="p-3 space-y-2">
          {riskStudents!.map((s) => {
            const isHighRisk = s.attendance_consistency < 40;
            return (
              <div
                key={s.user_id}
                className={cn(
                  "flex items-center gap-3 rounded-xl border p-4 transition-colors duration-120",
                  isHighRisk ? "border-danger/20 bg-danger/5" : "border-border-subtle bg-surface-2"
                )}
              >
                <div className={cn("h-10 w-10 rounded-full flex items-center justify-center shrink-0", isHighRisk ? "bg-danger/15" : "bg-warning/10")}>
                  <TrendingDown className={cn("h-4 w-4", isHighRisk ? "text-danger" : "text-warning")} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{s.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Attendance: {s.attendance_consistency}% · Engagement: {s.engagement_index}%
                  </p>
                </div>
                <div className={cn(
                  "text-xs font-bold px-2.5 py-1 rounded-full border shrink-0",
                  isHighRisk ? "bg-danger/10 text-danger border-danger/25" : "bg-warning/10 text-warning border-warning/25"
                )}>
                  {isHighRisk ? "High Risk" : "Medium"}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="px-4 py-3 border-t border-border-subtle">
        <Button variant="ghost" size="sm" className="w-full gap-2 h-11 text-sm text-muted-foreground hover:text-foreground" onClick={() => onNavigateTab("students")}>
          View all students <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
