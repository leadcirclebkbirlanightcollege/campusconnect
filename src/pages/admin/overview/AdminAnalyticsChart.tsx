import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

/* Build last-N-days attendance data from points_ledger / attendance counts */
function useLast7DaysAttendance() {
  return useQuery({
    queryKey: ["admin", "analytics", "7day"],
    queryFn: async () => {
      const days: { date: string; label: string; count: number }[] = [];
      const today = new Date();
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const iso = d.toISOString().slice(0, 10);
        days.push({
          date: iso,
          label: d.toLocaleDateString("en-GB", { weekday: "short" }),
          count: 0,
        });
      }
      const since = days[0].date;
      const { data } = await supabase
        .from("attendance")
        .select("marked_at")
        .eq("status", "present")
        .gte("marked_at", since + "T00:00:00Z");

      (data ?? []).forEach((row) => {
        const d = row.marked_at.slice(0, 10);
        const entry = days.find((x) => x.date === d);
        if (entry) entry.count++;
      });
      return days;
    },
    staleTime: 30_000,
  });
}

function useLast4WeeksLectures() {
  return useQuery({
    queryKey: ["admin", "analytics", "4week"],
    queryFn: async () => {
      const weeks: { label: string; lectures: number; attendance: number }[] = [];
      const today = new Date();
      for (let i = 3; i >= 0; i--) {
        const end = new Date(today);
        end.setDate(end.getDate() - i * 7);
        const start = new Date(end);
        start.setDate(start.getDate() - 6);
        weeks.push({
          label: `W${4 - i}`,
          lectures: 0,
          attendance: 0,
        });
        const startStr = start.toISOString().slice(0, 10);
        const endStr = end.toISOString().slice(0, 10);
        const [{ count: lCount }, { count: aCount }] = await Promise.all([
          supabase.from("lectures").select("id", { count: "exact", head: true })
            .gte("lecture_date", startStr).lte("lecture_date", endStr),
          supabase.from("attendance").select("id", { count: "exact", head: true })
            .eq("status", "present")
            .gte("marked_at", startStr + "T00:00:00Z"),
        ]);
        weeks[3 - i].lectures = lCount ?? 0;
        weeks[3 - i].attendance = aCount ?? 0;
      }
      return weeks;
    },
    staleTime: 60_000,
  });
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border-subtle bg-surface-2 px-3 py-2 shadow-md text-xs">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: <span className="font-bold">{p.value}</span></p>
      ))}
    </div>
  );
};

export default function AdminAnalyticsChart() {
  const daily = useLast7DaysAttendance();
  const weekly = useLast4WeeksLectures();

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {/* 7-day attendance trend */}
      <div className="rounded-2xl border border-border-subtle bg-surface-1 p-5 shadow-xs dashboard-panel">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="h-8 w-8 rounded-lg bg-success/10 flex items-center justify-center">
            <TrendingUp className="h-4 w-4 text-success" />
          </div>
          <div>
            <p className="text-body font-semibold text-foreground">Attendance Trend</p>
            <p className="text-[11px] text-muted-foreground">Last 7 days · attendance marks</p>
          </div>
        </div>
        {daily.isLoading ? (
          <div className="space-y-2 h-40 flex flex-col justify-end">
            {[60, 80, 45, 90, 70, 55, 85].map((h, i) => (
              <Skeleton key={i} className={`h-${Math.round(h/20)} w-full rounded`} />
            ))}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={daily.data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="attGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border-subtle))" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="count" name="Marks" stroke="hsl(var(--success))" strokeWidth={2} fill="url(#attGrad)" dot={{ r: 3, fill: "hsl(var(--success))", strokeWidth: 0 }} activeDot={{ r: 5 }} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Weekly lectures vs participation */}
      <div className="rounded-2xl border border-border-subtle bg-surface-1 p-5 shadow-xs dashboard-panel">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <BarChart3 className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-body font-semibold text-foreground">Weekly Activity</p>
            <p className="text-[11px] text-muted-foreground">Last 4 weeks · lectures & participation</p>
          </div>
        </div>
        {weekly.isLoading ? (
          <Skeleton className="h-40 w-full rounded-xl" />
        ) : (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={weekly.data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border-subtle))" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="lectures" name="Lectures" fill="hsl(var(--primary) / 0.7)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="attendance" name="Attendance" fill="hsl(var(--success) / 0.7)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
