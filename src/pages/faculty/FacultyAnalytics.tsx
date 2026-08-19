import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { BookOpen, Users, TrendingUp, Activity, Award, AlertTriangle } from "@/components/icons";
import { cn } from "@/lib/utils";

function KpiCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: any; color: string }) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface-1 p-4 flex items-center gap-3">
      <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shrink-0", color)}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xl font-bold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

export default function FacultyAnalytics() {
  const { data, isLoading } = useQuery({
    queryKey: ["faculty", "analytics"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_faculty_lecture_analytics" as any);
      if (error) throw error;
      return data as any;
    },
    staleTime: 60_000,
  });

  const { data: topStudents } = useQuery({
    queryKey: ["faculty", "top-students"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return [];
      // Get lectures by this faculty
      const { data: lecs } = await supabase
        .from("lectures")
        .select("id")
        .eq("created_by", session.user.id);
      if (!lecs?.length) return [];
      const lecIds = lecs.map(l => l.id);
      // Get top attenders
      const { data: att } = await supabase
        .from("attendance")
        .select("student_user_id")
        .in("lecture_id", lecIds)
        .eq("status", "present");
      if (!att?.length) return [];
      const counts: Record<string, number> = {};
      att.forEach(a => { counts[a.student_user_id] = (counts[a.student_user_id] ?? 0) + 1; });
      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
      const userIds = sorted.map(([uid]) => uid);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name, student_id")
        .in("user_id", userIds);
      return sorted.map(([uid, cnt]) => {
        const p = profiles?.find(x => x.user_id === uid);
        return { name: p?.name ?? "Unknown", student_id: p?.student_id ?? "—", count: cnt };
      });
    },
    staleTime: 60_000,
  });

  const recentChartData = (data?.recent_lectures ?? []).slice(0, 8).reverse().map((l: any) => ({
    name: l.topic.length > 14 ? l.topic.slice(0, 14) + "…" : l.topic,
    attendance: l.present_count,
  }));

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div className="rounded-3xl bg-gradient-to-br from-primary via-primary to-primary/80 p-6 text-primary-foreground shadow-lg">
        <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] opacity-80">Insights</p>
        <h1 className="font-heading text-[24px] font-black tracking-tight">Faculty Analytics</h1>
        <p className="text-[13px] opacity-85 mt-0.5">Lecture performance &amp; student insights</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <KpiCard label="Total Lectures"     value={data?.total_lectures ?? 0}       icon={BookOpen} color="bg-primary/10 text-primary" />
            <KpiCard label="Avg Attendance"     value={`${data?.avg_attendance ?? 0}`}  icon={Users}    color="bg-success/10 text-success" />
            <KpiCard label="Completed"          value={data?.completed_lectures ?? 0}   icon={Activity} color="bg-info/10 text-info" />
            <KpiCard label="Total Marks Given"  value={data?.total_attendance_marks ?? 0} icon={TrendingUp} color="bg-premium/10 text-premium" />
          </div>

          {recentChartData.length > 0 && (
            <div className="rounded-xl border border-border-subtle bg-surface-1 p-4">
              <p className="text-sm font-semibold text-foreground mb-3">Attendance per Lecture</p>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={recentChartData} margin={{ top: 0, right: 0, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} angle={-30} textAnchor="end" tickLine={false} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--surface-1))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                    formatter={(v: any) => [v, "Students Present"]}
                  />
                  <Bar dataKey="attendance" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {(topStudents?.length ?? 0) > 0 && (
            <div className="rounded-xl border border-border-subtle bg-surface-1 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Award className="h-4 w-4 text-premium" />
                <p className="text-sm font-semibold text-foreground">Top Attending Students</p>
              </div>
              <div className="space-y-2">
                {topStudents!.map((s, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-border-subtle last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                        {i + 1}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-foreground">{s.name}</p>
                        <p className="text-xs text-muted-foreground">{s.student_id}</p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-success">{s.count} present</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {recentChartData.length === 0 && (
            <div className="rounded-xl border border-border-subtle bg-surface-1 py-12 text-center">
              <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="text-sm text-muted-foreground">No lecture data yet. Create lectures to see analytics.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
