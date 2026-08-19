/**
 * PHASE 2 — 30-Day Streak Heatmap
 * GitHub-style contribution grid for check-ins + attendance.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { CalendarDays } from "@/components/icons";

function toLocalDate(d = new Date()) {
  return d.toISOString().split("T")[0];
}

function getLast30Days(): string[] {
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    return toLocalDate(d);
  });
}

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

type DayData = {
  date: string;
  checkin: boolean;
  attended: boolean;
  isToday: boolean;
  dayLabel: string;
};

export default function StreakHeatmap() {
  const days30 = useMemo(() => getLast30Days(), []);
  const since = days30[0];
  const today = toLocalDate();

  const q = useQuery({
    queryKey: ["student", "heatmap-30d"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { checkins: new Set<string>(), attended: new Set<string>() };

      const [{ data: checkins }, { data: attendance }] = await Promise.all([
        supabase.from("daily_checkins")
          .select("checkin_date")
          .eq("user_id", user.id)
          .gte("checkin_date", since),
        supabase.from("attendance")
          .select("marked_at")
          .eq("student_user_id", user.id)
          .eq("status", "present")
          .gte("marked_at", `${since}T00:00:00`),
      ]);

      const checkinSet = new Set((checkins ?? []).map((c: any) => c.checkin_date));
      const attendedSet = new Set((attendance ?? []).map((a: any) => a.marked_at.split("T")[0]));

      return { checkins: checkinSet, attended: attendedSet };
    },
    staleTime: 30_000,
  });

  const grid: DayData[] = useMemo(() => {
    return days30.map((date) => ({
      date,
      checkin: q.data?.checkins.has(date) ?? false,
      attended: q.data?.attended.has(date) ?? false,
      isToday: date === today,
      dayLabel: DAY_LABELS[new Date(`${date}T00:00:00`).getDay()],
    }));
  }, [days30, q.data, today]);

  // streak count from grid
  const currentStreak = useMemo(() => {
    let streak = 0;
    for (let i = grid.length - 1; i >= 0; i--) {
      if (grid[i].checkin || grid[i].attended) streak++;
      else break;
    }
    return streak;
  }, [grid]);

  const totalActive = grid.filter(d => d.checkin || d.attended).length;

  function getCellClass(d: DayData) {
    if (d.attended && d.checkin) return "bg-primary border-primary/40";
    if (d.attended) return "bg-success border-success/40";
    if (d.checkin) return "bg-warning border-warning/40";
    if (d.isToday) return "bg-surface-3 border-primary/50 ring-1 ring-primary/40";
    return "bg-surface-3 border-border-subtle";
  }

  function getCellTitle(d: DayData) {
    if (d.attended && d.checkin) return `${d.date}: Attended + Checked in`;
    if (d.attended) return `${d.date}: Attended lecture`;
    if (d.checkin) return `${d.date}: Daily check-in`;
    return d.date;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: 0.08 }}
      className="rounded-2xl border border-border-subtle bg-surface-1 overflow-hidden shadow-sm"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-warning/10 flex items-center justify-center">
            <CalendarDays className="h-4 w-4 text-warning" />
          </div>
          <div>
            <p className="text-[14px] font-semibold text-foreground">Activity Heatmap</p>
            <p className="text-[11px] text-muted-foreground">Last 30 days · check-ins & lectures</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-right">
          <div>
            <p className="text-[16px] font-black text-foreground tabular-nums leading-none">{currentStreak}</p>
            <p className="text-[10px] text-muted-foreground">streak</p>
          </div>
          <div className="w-px h-8 bg-border-subtle" />
          <div>
            <p className="text-[16px] font-black text-success tabular-nums leading-none">{totalActive}</p>
            <p className="text-[10px] text-muted-foreground">active days</p>
          </div>
        </div>
      </div>

      <div className="p-5">
        {q.isLoading ? (
          <div className="grid grid-cols-10 gap-1.5">
            {[...Array(30)].map((_, i) => <Skeleton key={i} className="aspect-square rounded-md" />)}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-10 gap-1.5">
              {grid.map((d, i) => (
                <motion.div
                  key={d.date}
                  title={getCellTitle(d)}
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.012, duration: 0.15 }}
                  className={cn(
                    "aspect-square rounded-md border cursor-default transition-transform duration-100 hover:scale-110",
                    getCellClass(d),
                  )}
                />
              ))}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-4 flex-wrap">
              {[
                { color: "bg-surface-3 border-border-subtle", label: "No activity" },
                { color: "bg-warning border-warning/40", label: "Check-in" },
                { color: "bg-success border-success/40", label: "Attendance" },
                { color: "bg-primary border-primary/40", label: "Both" },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <div className={cn("h-3 w-3 rounded border", color)} />
                  <span className="text-[10px] text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}
