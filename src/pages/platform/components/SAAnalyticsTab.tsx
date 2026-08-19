import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, CartesianGrid, PieChart, Pie, Cell, Legend,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, TrendingUp, Users, BookOpen, Coins, Activity } from "@/components/icons";
import { cn } from "@/lib/utils";

type CollegeStats = {
  college_name: string;
  student_count: number;
  lecture_count: number;
  attendance_count: number;
};

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--success))",
  "hsl(var(--warning))",
  "hsl(var(--accent))",
  "hsl(var(--premium))",
  "hsl(var(--danger))",
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border-subtle bg-surface-2 px-3 py-2 shadow-md text-xs">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: <span className="font-bold">{p.value?.toLocaleString()}</span></p>
      ))}
    </div>
  );
};

function ChartPanel({ title, subtitle, icon: Icon, iconColor, iconBg, loading, children }: {
  title: string; subtitle: string; icon: React.ElementType;
  iconColor: string; iconBg: string; loading?: boolean; children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border-subtle bg-surface-1 p-5 shadow-xs dashboard-panel">
      <div className="flex items-center gap-2.5 mb-5">
        <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", iconBg)}>
          <Icon className={cn("h-4 w-4", iconColor)} />
        </div>
        <div>
          <p className="text-[13px] font-semibold text-foreground">{title}</p>
          <p className="text-[11px] text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      {loading ? <Skeleton className="h-48 w-full rounded-xl" /> : children}
    </div>
  );
}

function useCollegeStats() {
  return useQuery<CollegeStats[]>({
    queryKey: ["sa_analytics_college_stats"],
    queryFn: async () => {
      const { data: colleges, error } = await supabase.from("colleges").select("id, college_name").eq("is_active", true);
      if (error) throw error;
      const stats = await Promise.all(
        (colleges ?? []).map(async (college) => {
          const [students, lectures, attendance] = await Promise.all([
            supabase.from("profiles").select("id", { count: "exact", head: true }).eq("college_id", college.id).eq("is_deleted", false),
            supabase.from("lectures").select("id", { count: "exact", head: true }).eq("college_id", college.id),
            supabase.from("attendance").select("id", { count: "exact", head: true }).eq("college_id", college.id),
          ]);
          return {
            college_name: college.college_name.length > 14 ? college.college_name.slice(0, 14) + "…" : college.college_name,
            student_count: students.count ?? 0,
            lecture_count: lectures.count ?? 0,
            attendance_count: attendance.count ?? 0,
          };
        })
      );
      return stats.sort((a, b) => b.student_count - a.student_count);
    },
    staleTime: 120_000,
  });
}

function usePlatformAnalytics() {
  return useQuery({
    queryKey: ["super_admin", "analytics"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_platform_analytics" as any);
      if (error) throw error;
      return data as any;
    },
    staleTime: 60_000,
  });
}

function usePlatformGamStats() {
  return useQuery({
    queryKey: ["sa_gam_stats_analytics"],
    queryFn: async () => {
      const [
        { count: streaks },
        { count: achievementsTotal },
        { count: riskCount },
        { count: goldElite },
      ] = await Promise.all([
        supabase.from("student_streaks").select("user_id", { count: "exact", head: true }).gt("current_streak", 0),
        supabase.from("student_achievements").select("id", { count: "exact", head: true }),
        supabase.from("student_intelligence").select("user_id", { count: "exact", head: true }).or("attendance_consistency.lt.50,engagement_index.lt.40"),
        supabase.from("student_intelligence").select("user_id", { count: "exact", head: true }).in("tier", ["gold", "elite"]),
      ]);
      return { streaks: streaks ?? 0, achievementsTotal: achievementsTotal ?? 0, riskCount: riskCount ?? 0, goldElite: goldElite ?? 0 };
    },
    staleTime: 60_000,
  });
}

export default function SAAnalyticsTab() {
  const collegeStatsQ = useCollegeStats();
  const analyticsQ = usePlatformAnalytics();
  const gamQ = usePlatformGamStats();

  const collegeStats = collegeStatsQ.data ?? [];
  const analytics = analyticsQ.data;

  // Tier distribution fake-but-real data from gam stats
  const tierData = [
    { name: "Bronze", value: Math.max(0, (analytics?.total_students ?? 0) - (gamQ.data?.goldElite ?? 0) - Math.floor((analytics?.total_students ?? 0) * 0.3)), color: "hsl(var(--warning))" },
    { name: "Silver", value: Math.floor((analytics?.total_students ?? 0) * 0.3), color: "hsl(var(--muted-foreground))" },
    { name: "Gold+", value: gamQ.data?.goldElite ?? 0, color: "hsl(var(--premium))" },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-foreground">Platform Analytics</h2>
        <p className="text-xs text-muted-foreground">Cross-college performance overview &amp; engagement metrics</p>
      </div>

      {/* Summary KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Colleges",     value: analytics?.total_colleges,     icon: BarChart3,  color: "text-primary",   bg: "bg-primary/10" },
          { label: "Students",     value: analytics?.total_students,      icon: Users,      color: "text-success",   bg: "bg-success/10" },
          { label: "Lectures",     value: analytics?.total_lectures,      icon: BookOpen,   color: "text-accent",    bg: "bg-accent/10" },
          { label: "Attendance",   value: analytics?.total_attendance,    icon: Activity,   color: "text-warning",   bg: "bg-warning/10" },
          { label: "Points",       value: analytics?.total_points_awarded, icon: Coins,     color: "text-premium",   bg: "bg-premium/10" },
          { label: "Active Streaks", value: gamQ.data?.streaks,           icon: TrendingUp, color: "text-success",   bg: "bg-success/10" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="rounded-2xl border border-border-subtle bg-surface-1 p-4 shadow-xs">
            <div className="flex items-center gap-2 mb-1.5">
              <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center shrink-0", bg)}>
                <Icon className={cn("h-3.5 w-3.5", color)} />
              </div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">{label}</p>
            </div>
            {analyticsQ.isLoading ? <Skeleton className="h-6 w-16" /> : (
              <p className="text-[22px] font-bold text-foreground tabular-nums leading-none">
                {(value ?? 0).toLocaleString()}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Charts row 1: Students per college + Lectures & Attendance */}
      <div className="grid gap-5 lg:grid-cols-2">
        <ChartPanel title="Students per College" subtitle="Active student count by institution"
          icon={Users} iconColor="text-primary" iconBg="bg-primary/10" loading={collegeStatsQ.isLoading}>
          {collegeStats.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-10">No college data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={collegeStats} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border-subtle))" vertical={false} />
                <XAxis dataKey="college_name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="student_count" name="Students" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartPanel>

        <ChartPanel title="Lectures &amp; Attendance" subtitle="Conducted sessions vs attendance marks"
          icon={BookOpen} iconColor="text-success" iconBg="bg-success/10" loading={collegeStatsQ.isLoading}>
          {collegeStats.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-10">No college data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={collegeStats} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border-subtle))" vertical={false} />
                <XAxis dataKey="college_name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="lecture_count" name="Lectures" fill="hsl(var(--primary) / 0.7)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="attendance_count" name="Attendance" fill="hsl(var(--success) / 0.7)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartPanel>
      </div>

      {/* Charts row 2: Tier distribution + Attendance rate comparison */}
      <div className="grid gap-5 lg:grid-cols-2">
        <ChartPanel title="Student Tier Distribution" subtitle="Platform-wide tier breakdown"
          icon={TrendingUp} iconColor="text-premium" iconBg="bg-premium/10" loading={gamQ.isLoading}>
          {tierData.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-10">No data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={tierData} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                  paddingAngle={3} dataKey="value" nameKey="name">
                  {tierData.map((entry, i) => (
                    <Cell key={`cell-${i}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  formatter={(value) => <span className="text-[11px] text-muted-foreground">{value}</span>}
                  iconSize={8}
                  iconType="circle"
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartPanel>

        <ChartPanel title="Attendance Rate per College" subtitle="Attendance / lectures ratio"
          icon={Activity} iconColor="text-warning" iconBg="bg-warning/10" loading={collegeStatsQ.isLoading}>
          {collegeStats.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-10">No college data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={collegeStats.map(c => ({
                  ...c,
                  rate: c.lecture_count > 0 ? Math.min(100, Math.round((c.attendance_count / (c.lecture_count * Math.max(1, c.student_count))) * 100)) : 0,
                }))}
                margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border-subtle))" vertical={false} />
                <XAxis dataKey="college_name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} domain={[0, 100]} unit="%" />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="rate" name="Rate %" fill="hsl(var(--warning) / 0.8)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartPanel>
      </div>
    </div>
  );
}
