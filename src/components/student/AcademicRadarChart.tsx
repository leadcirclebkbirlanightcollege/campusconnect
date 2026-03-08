/**
 * PHASE 2 — Academic Radar Chart
 * Radar visualization of: Attendance, Consistency, Engagement, Reliability, Streak Score
 * Uses Recharts RadarChart, animates on load.
 */
import { useMemo } from "react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, ResponsiveContainer, Tooltip,
} from "recharts";
import { useStudentIntelligence } from "@/hooks/use-intelligence";
import { useGrowthInsights } from "@/hooks/use-growth-insights";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Radar as RadarIcon } from "lucide-react";

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border-subtle bg-surface-2 px-3 py-2 shadow-md text-xs">
      <p className="font-semibold text-foreground">{payload[0]?.payload?.metric}</p>
      <p className="text-primary font-bold">{payload[0]?.value}<span className="text-muted-foreground font-normal"> / 100</span></p>
    </div>
  );
};

export default function AcademicRadarChart() {
  const intel = useStudentIntelligence();
  const growth = useGrowthInsights();

  const streakQ = useQuery({
    queryKey: ["student", "streak-radar"],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_my_streak");
      return (data as any) ?? null;
    },
    staleTime: 60_000,
  });

  const radarData = useMemo(() => {
    const attendance = growth.data?.last_30_day_attendance_pct ?? 0;
    const consistency = intel.data?.attendanceConsistency ?? 0;
    const engagement = intel.data?.engagementIndex ?? 0;
    const reliability = intel.data?.behaviourReliability ?? 0;
    const streak = streakQ.data?.current_streak ?? 0;
    // Map streak to 0-100 (cap at 30 days = 100)
    const streakScore = Math.min(100, Math.round((streak / 30) * 100));

    return [
      { metric: "Attendance",   value: attendance },
      { metric: "Consistency",  value: consistency },
      { metric: "Engagement",   value: engagement },
      { metric: "Reliability",  value: reliability },
      { metric: "Streak",       value: streakScore },
    ];
  }, [intel.data, growth.data, streakQ.data]);

  const isLoading = intel.isLoading || growth.isLoading;

  // Compute overall shape fill % for the summary
  const avgScore = useMemo(() => {
    if (!radarData.every(d => d.value > 0)) return null;
    return Math.round(radarData.reduce((s, d) => s + d.value, 0) / radarData.length);
  }, [radarData]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="rounded-2xl border border-border-subtle bg-surface-1 overflow-hidden shadow-sm"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <RadarIcon className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-[14px] font-semibold text-foreground">Performance Radar</p>
            <p className="text-[11px] text-muted-foreground">Academic shape · 5 dimensions</p>
          </div>
        </div>
        {avgScore !== null && !isLoading && (
          <div className={cn(
            "px-3 py-1.5 rounded-xl text-[12px] font-bold border",
            avgScore >= 75 ? "text-success bg-success/8 border-success/25"
            : avgScore >= 50 ? "text-warning bg-warning/8 border-warning/25"
            : "text-danger bg-danger/8 border-danger/25"
          )}>
            {avgScore}%
          </div>
        )}
      </div>

      <div className="p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-[220px]">
            <Skeleton className="h-[180px] w-[180px] rounded-full" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <RadarChart data={radarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
              <PolarGrid
                stroke="hsl(var(--border-subtle))"
                gridType="polygon"
              />
              <PolarAngleAxis
                dataKey="metric"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))", fontWeight: 500 }}
                tickLine={false}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 100]}
                tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                tickCount={4}
                axisLine={false}
              />
              <Radar
                name="Performance"
                dataKey="value"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary))"
                fillOpacity={0.18}
                strokeWidth={2}
                isAnimationActive={true}
                animationDuration={800}
                animationEasing="ease-out"
                dot={{ fill: "hsl(var(--primary))", r: 3, strokeWidth: 0 }}
              />
              <Tooltip content={<CustomTooltip />} />
            </RadarChart>
          </ResponsiveContainer>
        )}

        {/* Dimension legend */}
        {!isLoading && (
          <div className="grid grid-cols-2 gap-2 mt-2">
            {radarData.map((d) => (
              <div key={d.metric} className="flex items-center justify-between px-3 py-2 rounded-xl bg-surface-2 border border-border-subtle">
                <span className="text-[11px] text-muted-foreground font-medium">{d.metric}</span>
                <span className={cn(
                  "text-[12px] font-bold tabular-nums",
                  d.value >= 75 ? "text-success" : d.value >= 50 ? "text-warning" : "text-danger"
                )}>{d.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
