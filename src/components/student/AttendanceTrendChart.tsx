/**
 * PHASE 2 — Attendance Trend Chart
 * Line chart showing attendance over last 30 days.
 * Uses Recharts AreaChart.
 */
import { useMemo } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useGrowthInsights } from "@/hooks/use-growth-insights";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Minus, TrendingUpIcon } from "@/components/icons";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border-subtle bg-surface-2 px-3 py-2 shadow-md text-xs">
      <p className="text-muted-foreground mb-1">{label}</p>
      <p className="font-bold text-primary">{payload[0]?.value}% attendance</p>
    </div>
  );
};

export default function AttendanceTrendChart() {
  const growth = useGrowthInsights();

  // Get attendance data grouped by week over last 30 days
  const attendanceQ = useQuery({
    queryKey: ["student", "attendance-trend-chart"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const since = new Date();
      since.setDate(since.getDate() - 30);

      const [{ data: attended }, { data: lectures }] = await Promise.all([
        supabase.from("attendance")
          .select("marked_at")
          .eq("student_user_id", user.id)
          .eq("status", "present")
          .gte("marked_at", since.toISOString()),
        supabase.from("lectures")
          .select("lecture_date")
          .gte("lecture_date", since.toISOString().split("T")[0])
          .neq("status", "scheduled")
          .order("lecture_date"),
      ]);

      // Group by week
      const weeks: Record<string, { attended: number; total: number; label: string }> = {};
      const getWeek = (dateStr: string) => {
        const d = new Date(dateStr);
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - d.getDay());
        return weekStart.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
      };

      (lectures ?? []).forEach((l) => {
        const w = getWeek(l.lecture_date);
        if (!weeks[w]) weeks[w] = { attended: 0, total: 0, label: w };
        weeks[w].total++;
      });

      (attended ?? []).forEach((a) => {
        const w = getWeek(a.marked_at.split("T")[0]);
        if (weeks[w]) weeks[w].attended++;
      });

      return Object.values(weeks).map(w => ({
        label: w.label,
        pct: w.total > 0 ? Math.round((w.attended / w.total) * 100) : 0,
        attended: w.attended,
        total: w.total,
      }));
    },
    staleTime: 5 * 60_000,
  });

  const trend = growth.data?.trend_direction ?? "stable";
  const trendColor = trend === "improving" ? "text-success" : trend === "declining" ? "text-danger" : "text-muted-foreground";
  const TrendIcon = trend === "improving" ? TrendingUp : trend === "declining" ? TrendingDown : Minus;

  const avgPct = useMemo(() => {
    const d = attendanceQ.data ?? [];
    if (!d.length) return 0;
    return Math.round(d.reduce((s, w) => s + w.pct, 0) / d.length);
  }, [attendanceQ.data]);

  const isLoading = attendanceQ.isLoading;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: 0.05 }}
      className="rounded-2xl border border-border-subtle bg-surface-1 overflow-hidden shadow-sm"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-success/10 flex items-center justify-center">
            <TrendingUpIcon className="h-4 w-4 text-success" />
          </div>
          <div>
            <p className="text-[14px] font-semibold text-foreground">Attendance Trend</p>
            <p className="text-[11px] text-muted-foreground">Last 30 days · weekly</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isLoading && (
            <div className="text-right">
              <p className={cn("text-[13px] font-bold", avgPct >= 75 ? "text-success" : avgPct >= 50 ? "text-warning" : "text-danger")}>
                {avgPct}% avg
              </p>
            </div>
          )}
          <div className={cn("flex items-center gap-1 text-[11px] font-semibold capitalize px-2.5 py-1 rounded-full border",
            trend === "improving" ? "text-success bg-success/8 border-success/25"
            : trend === "declining" ? "text-danger bg-danger/8 border-danger/25"
            : "text-muted-foreground bg-surface-3 border-border-subtle"
          )}>
            <TrendIcon className="h-3 w-3" />
            {trend}
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 pb-3">
        {isLoading ? (
          <Skeleton className="h-[140px] w-full rounded-xl" />
        ) : !attendanceQ.data?.length ? (
          <div className="h-[140px] flex items-center justify-center">
            <p className="text-[12px] text-muted-foreground">No lecture data available yet</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={150}>
            <AreaChart data={attendanceQ.data} margin={{ top: 5, right: 5, left: -28, bottom: 0 }}>
              <defs>
                <linearGradient id="att-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border-subtle))" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false} tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false} tickLine={false}
                tickFormatter={(v) => `${v}%`}
              />
              <ReferenceLine y={75} stroke="hsl(var(--success))" strokeDasharray="4 3" strokeOpacity={0.4} strokeWidth={1} />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone" dataKey="pct" name="Attendance %"
                stroke="hsl(var(--success))" strokeWidth={2}
                fill="url(#att-grad)"
                dot={{ fill: "hsl(var(--success))", r: 3, strokeWidth: 0 }}
                isAnimationActive={true} animationDuration={900} animationEasing="ease-out"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
        <p className="text-[10px] text-muted-foreground/60 mt-1 text-center">
          Dashed line = 75% attendance threshold
        </p>
      </div>
    </motion.div>
  );
}
