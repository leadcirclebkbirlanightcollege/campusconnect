import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from "recharts";
import { BarChart3, TrendingUp, Users, BookOpen } from "lucide-react";

type CollegeStats = {
  college_name: string;
  student_count: number;
  lecture_count: number;
  attendance_count: number;
};

const CHART_COLORS = {
  primary: "hsl(var(--primary))",
  success: "hsl(var(--success))",
  accent: "#FACC15",
  muted: "hsl(var(--muted-foreground))",
};

export default function SAAnalyticsTab() {
  const collegeStatsQuery = useQuery<CollegeStats[]>({
    queryKey: ["sa_analytics_college_stats"],
    queryFn: async () => {
      const { data: colleges, error } = await supabase
        .from("colleges")
        .select("id, college_name")
        .eq("is_active", true);
      if (error) throw error;

      const stats = await Promise.all(
        (colleges ?? []).map(async (college) => {
          const [students, lectures, attendance] = await Promise.all([
            supabase.from("profiles").select("id", { count: "exact", head: true }).eq("college_id", college.id).eq("is_deleted", false),
            supabase.from("lectures").select("id", { count: "exact", head: true }).eq("college_id", college.id),
            supabase.from("attendance").select("id", { count: "exact", head: true }).eq("college_id", college.id),
          ]);
          return {
            college_name: college.college_name,
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

  const platformQuery = useQuery({
    queryKey: ["super_admin", "analytics"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_platform_analytics" as any);
      if (error) throw error;
      return data as any;
    },
    staleTime: 60_000,
  });

  const collegeStats = collegeStatsQuery.data ?? [];
  const analytics = platformQuery.data;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-surface-1 border border-border-subtle rounded-lg px-3 py-2 text-xs shadow-lg">
          <p className="font-medium text-foreground mb-1">{label}</p>
          {payload.map((p: any) => (
            <p key={p.name} style={{ color: p.color }}>{p.name}: {p.value.toLocaleString()}</p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-foreground">Platform Analytics</h2>
        <p className="text-xs text-muted-foreground">Cross-college performance overview</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Colleges", value: analytics?.total_colleges ?? "—", icon: BarChart3, color: "text-primary" },
          { label: "Students", value: analytics?.total_students?.toLocaleString() ?? "—", icon: Users, color: "text-success" },
          { label: "Lectures", value: analytics?.total_lectures?.toLocaleString() ?? "—", icon: BookOpen, color: "text-blue-400" },
          { label: "Attendance", value: analytics?.total_attendance?.toLocaleString() ?? "—", icon: TrendingUp, color: "text-amber-400" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="bg-surface-1 border-border-subtle">
            <CardContent className="p-3.5 flex items-center gap-2.5">
              <Icon className={`w-4 h-4 ${color} shrink-0`} />
              <div>
                <p className="text-lg font-bold text-foreground leading-none">{value}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Students per college */}
      {collegeStats.length > 0 && (
        <Card className="bg-surface-1 border-border-subtle">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Students per College
            </CardTitle>
          </CardHeader>
          <CardContent>
            {collegeStatsQuery.isLoading ? (
              <div className="h-48 bg-surface-2 animate-pulse rounded-lg" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={collegeStats} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="college_name"
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: string) => v.length > 12 ? v.slice(0, 12) + "…" : v}
                  />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="student_count" name="Students" fill={CHART_COLORS.primary} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      )}

      {/* Lectures & Attendance per college */}
      {collegeStats.length > 0 && (
        <Card className="bg-surface-1 border-border-subtle">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              Lectures & Attendance per College
            </CardTitle>
          </CardHeader>
          <CardContent>
            {collegeStatsQuery.isLoading ? (
              <div className="h-48 bg-surface-2 animate-pulse rounded-lg" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={collegeStats} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="college_name"
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: string) => v.length > 12 ? v.slice(0, 12) + "…" : v}
                  />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="lecture_count" name="Lectures" fill={CHART_COLORS.primary} radius={[3, 3, 0, 0]} />
                  <Bar dataKey="attendance_count" name="Attendance" fill={CHART_COLORS.success} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      )}

      {collegeStats.length === 0 && !collegeStatsQuery.isLoading && (
        <Card className="bg-surface-1 border-border-subtle border-dashed">
          <CardContent className="py-10 text-center">
            <BarChart3 className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No colleges with data yet</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
