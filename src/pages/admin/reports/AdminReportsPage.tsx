import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import { Users, BookOpen, AlertTriangle, TrendingUp, Award, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TIER_COLORS = {
  elite: "hsl(var(--primary))",
  gold: "hsl(var(--premium))",
  silver: "hsl(var(--muted-foreground))",
  bronze: "hsl(39 100% 57%)",
};

function StatCard({ label, value, icon: Icon, color, sub }: {
  label: string; value: string | number; icon: any; color: string; sub?: string;
}) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface-1 p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
        </div>
        <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0", color)}>
          <Icon className="h-4.5 w-4.5" />
        </div>
      </div>
    </div>
  );
}

export default function AdminReportsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "college-analytics"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_admin_college_analytics" as any);
      if (error) throw error;
      return data as any;
    },
    staleTime: 60_000,
  });

  const { data: riskStudents, isLoading: riskLoading } = useQuery({
    queryKey: ["admin", "risk-students-report"],
    queryFn: async () => {
      const { data: intel } = await supabase
        .from("student_intelligence")
        .select("user_id, attendance_consistency, engagement_index, tier, risk_flags")
        .lt("attendance_consistency", 60)
        .order("attendance_consistency", { ascending: true })
        .limit(10);
      if (!intel?.length) return [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name, student_id, class_name")
        .in("user_id", intel.map(r => r.user_id));
      return intel.map(r => ({
        ...r,
        name: profiles?.find(p => p.user_id === r.user_id)?.name ?? "Unknown",
        student_id: profiles?.find(p => p.user_id === r.user_id)?.student_id ?? "—",
        class_name: profiles?.find(p => p.user_id === r.user_id)?.class_name ?? "—",
      }));
    },
    staleTime: 60_000,
  });

  const tierDist = data?.tier_distribution
    ? Object.entries(data.tier_distribution as Record<string, number>)
        .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }))
        .filter(d => d.value > 0)
    : [];

  const handleExportCSV = () => {
    if (!riskStudents?.length) return;
    const header = "Name,Student ID,Class,Attendance %,Engagement %,Tier\n";
    const rows = riskStudents.map(s =>
      `"${s.name}","${s.student_id}","${s.class_name}",${s.attendance_consistency},${s.engagement_index},${s.tier}`
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "at-risk-students.csv"; a.click();
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">College Reports</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Institutional analytics & performance</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={handleExportCSV}>
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Total Students"   value={data?.total_students ?? 0}    icon={Users}       color="bg-primary/10 text-primary"  />
            <StatCard label="Total Faculty"    value={data?.total_faculty ?? 0}     icon={Award}       color="bg-premium/10 text-premium"  />
            <StatCard label="Total Lectures"   value={data?.total_lectures ?? 0}    icon={BookOpen}    color="bg-info/10 text-info"         />
            <StatCard label="Attendance Today" value={data?.attendance_today ?? 0}  icon={TrendingUp}  color="bg-success/10 text-success"   />
            <StatCard
              label="Avg Attendance %" value={`${data?.avg_attendance_pct ?? 0}%`}
              icon={TrendingUp} color="bg-success/10 text-success"
              sub="Across all students"
            />
            <StatCard
              label="At-Risk Students" value={data?.at_risk_count ?? 0}
              icon={AlertTriangle} color="bg-danger/10 text-danger"
              sub="Below 60% attendance"
            />
          </div>

          {tierDist.length > 0 && (
            <div className="rounded-xl border border-border-subtle bg-surface-1 p-4">
              <p className="text-sm font-semibold text-foreground mb-3">Student Tier Distribution</p>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={tierDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} paddingAngle={3}>
                    {tierDist.map((entry) => (
                      <Cell key={entry.name} fill={TIER_COLORS[entry.name.toLowerCase() as keyof typeof TIER_COLORS] ?? "#888"} />
                    ))}
                  </Pie>
                  <Legend formatter={(v) => <span className="text-xs text-foreground">{v}</span>} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--surface-1))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="rounded-xl border border-border-subtle bg-surface-1 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-danger" />
                <p className="text-sm font-semibold text-foreground">At-Risk Students</p>
              </div>
              {(riskStudents?.length ?? 0) > 0 && (
                <span className="text-xs bg-danger/10 text-danger px-2.5 py-1 rounded-full border border-danger/20 font-semibold">
                  {riskStudents!.length} flagged
                </span>
              )}
            </div>
            {riskLoading ? (
              <div className="p-4 space-y-2">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14" />)}
              </div>
            ) : (riskStudents?.length ?? 0) === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                🎉 All students are above the threshold
              </div>
            ) : (
              <div className="divide-y divide-border-subtle">
                {riskStudents!.map((s, i) => (
                  <div key={i} className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.student_id} · {s.class_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-danger">{s.attendance_consistency}%</p>
                      <p className="text-xs text-muted-foreground capitalize">{s.tier}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
