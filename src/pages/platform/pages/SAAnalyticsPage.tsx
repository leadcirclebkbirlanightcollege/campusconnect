import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar
} from "recharts";
import { Building2, Users, BookOpen, Activity, TrendingUp, CheckCircle } from "@/components/icons";
import { cn } from "@/lib/utils";

function MetricCard({ label, value, icon: Icon, color, sub }: {
  label: string; value: string | number; icon: any; color: string; sub?: string;
}) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface-1 p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">{label}</p>
          <p className="text-3xl font-bold text-foreground mt-1">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
        </div>
        <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0", color)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

export default function SAAnalyticsPage() {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ["sa", "platform-analytics"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_platform_analytics");
      if (error) throw error;
      return data as any;
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const { data: colleges } = useQuery({
    queryKey: ["sa", "colleges-list-analytics"],
    queryFn: async () => {
      const { data } = await supabase
        .from("colleges")
        .select("college_name, is_active, created_at")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    staleTime: 60_000,
  });

  const collegeBarData = (colleges ?? []).map(c => ({
    name: c.college_name.length > 12 ? c.college_name.slice(0, 12) + "…" : c.college_name,
    status: c.is_active ? 1 : 0,
  }));

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Platform Analytics</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Real-time metrics across all colleges</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <MetricCard label="Total Colleges"    value={analytics?.total_colleges ?? 0}       icon={Building2}   color="bg-primary/10 text-primary"   sub={`${analytics?.active_colleges ?? 0} active`} />
            <MetricCard label="Total Students"    value={analytics?.total_students ?? 0}       icon={Users}       color="bg-success/10 text-success"   />
            <MetricCard label="Total Admins"      value={analytics?.total_admins ?? 0}         icon={CheckCircle} color="bg-info/10 text-info"          />
            <MetricCard label="Total Lectures"    value={analytics?.total_lectures ?? 0}       icon={BookOpen}    color="bg-premium/10 text-premium"    />
            <MetricCard label="Live Now"          value={analytics?.live_lectures ?? 0}        icon={Activity}    color="bg-danger/10 text-danger"      sub="Lectures live" />
            <MetricCard label="Attendance Today"  value={analytics?.attendance_today ?? 0}     icon={TrendingUp}  color="bg-warning/10 text-warning"    />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl border border-border-subtle bg-surface-1 p-4">
              <p className="text-sm font-semibold text-foreground mb-1">Total Attendance Records</p>
              <p className="text-3xl font-bold text-foreground">{(analytics?.total_attendance ?? 0).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">Platform-wide marks</p>
            </div>
            <div className="rounded-xl border border-border-subtle bg-surface-1 p-4">
              <p className="text-sm font-semibold text-foreground mb-1">Points Awarded</p>
              <p className="text-3xl font-bold text-foreground">{(analytics?.total_points_awarded ?? 0).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">Total across all colleges</p>
            </div>
          </div>

          {collegeBarData.length > 0 && (
            <div className="rounded-xl border border-border-subtle bg-surface-1 p-4">
              <p className="text-sm font-semibold text-foreground mb-3">College Status Overview</p>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={collegeBarData} margin={{ top: 0, right: 0, left: -24, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} angle={-25} textAnchor="end" tickLine={false} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} ticks={[0, 1]} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--surface-1))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                    formatter={(v: any) => [v === 1 ? "Active" : "Inactive", "Status"]}
                  />
                  <Bar dataKey="status" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="rounded-xl border border-border-subtle bg-surface-1 p-4 space-y-4">
            <p className="text-sm font-semibold text-foreground">System Health</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-surface-2 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Security Alerts</p>
                <p className={cn("text-xl font-bold mt-1", (analytics?.security_alerts_open ?? 0) > 0 ? "text-danger" : "text-success")}>
                  {analytics?.security_alerts_open ?? 0}
                </p>
                <p className="text-xs text-muted-foreground">open</p>
              </div>
              <div className="bg-surface-2 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Active Sessions</p>
                <p className="text-xl font-bold text-foreground mt-1">{analytics?.active_sessions_15m ?? 0}</p>
                <p className="text-xs text-muted-foreground">last 15 min</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
