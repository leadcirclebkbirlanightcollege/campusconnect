import { useStudentIntelligence } from "@/hooks/use-intelligence";
import { useGrowthInsights } from "@/hooks/use-growth-insights";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageContainer, PageHeader } from "@/layout";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar, BarChart, Bar
} from "recharts";
import { TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle, Activity, Target, Zap } from "lucide-react";
import { format, subDays, eachDayOfInterval } from "date-fns";

function RiskBadge({ risk }: { risk: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    low:    { label: "Low Risk",    cls: "bg-success/10 text-success border-success/30" },
    medium: { label: "Medium Risk", cls: "bg-warning/10 text-warning border-warning/30" },
    high:   { label: "High Risk",   cls: "bg-danger/10 text-danger border-danger/30" },
  };
  const { label, cls } = map[risk] ?? map.low;
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold", cls)}>
      {risk === "low" ? <CheckCircle className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
      {label}
    </span>
  );
}

function ScoreCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: any; color: string }) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface-1 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
        <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", color)}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="text-3xl font-bold text-foreground">{value}</p>
      <div className="w-full bg-surface-2 rounded-full h-1.5">
        <div
          className={cn("h-1.5 rounded-full transition-all duration-700", color.replace("bg-", "bg-").replace("/10", ""))}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

export default function StudentAnalytics() {
  const { data: intel, isLoading: intelLoading } = useStudentIntelligence();
  const { data: insights, isLoading: insightsLoading } = useGrowthInsights();

  const { data: weeklyData } = useQuery({
    queryKey: ["student", "weekly-attendance-chart"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return [];
      const days = eachDayOfInterval({ start: subDays(new Date(), 29), end: new Date() });
      const { data: attended } = await supabase
        .from("attendance")
        .select("marked_at")
        .eq("student_user_id", session.user.id)
        .eq("status", "present")
        .gte("marked_at", subDays(new Date(), 29).toISOString());
      const attendedDates = new Set((attended ?? []).map(a => format(new Date(a.marked_at), "yyyy-MM-dd")));
      return days.map(d => ({
        date: format(d, "MMM dd"),
        attended: attendedDates.has(format(d, "yyyy-MM-dd")) ? 1 : 0,
      }));
    },
    staleTime: 60_000,
  });

  const isLoading = intelLoading || insightsLoading;

  const performanceScore = intel
    ? Math.round(
        intel.attendanceConsistency * 0.5 +
        intel.engagementIndex * 0.3 +
        intel.behaviourReliability * 0.2
      )
    : 0;

  const radarData = intel
    ? [
        { subject: "Attendance",   value: intel.attendanceConsistency },
        { subject: "Engagement",   value: intel.engagementIndex },
        { subject: "Reliability",  value: intel.behaviourReliability },
        { subject: "Consistency",  value: Math.min(100, intel.attendanceConsistency + 5) },
        { subject: "Performance",  value: performanceScore },
      ]
    : [];

  const trendIcon = insights?.trend_direction === "improving"
    ? <TrendingUp className="h-4 w-4 text-success" />
    : insights?.trend_direction === "declining"
    ? <TrendingDown className="h-4 w-4 text-danger" />
    : <Minus className="h-4 w-4 text-muted-foreground" />;

  return (
    <PageContainer>
      <PageHeader title="My Analytics" subtitle="AI-powered performance insights" />

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top metrics */}
          <div className="grid grid-cols-2 gap-3">
            <ScoreCard label="Performance" value={performanceScore} icon={Target} color="bg-primary/10 text-primary" />
            <ScoreCard label="Attendance" value={intel?.attendanceConsistency ?? 0} icon={Activity} color="bg-success/10 text-success" />
            <ScoreCard label="Engagement" value={intel?.engagementIndex ?? 0} icon={Zap} color="bg-premium/10 text-premium" />
            <ScoreCard label="Reliability" value={intel?.behaviourReliability ?? 0} icon={CheckCircle} color="bg-info/10 text-info" />
          </div>

          {/* Risk + Trend row */}
          <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-border-subtle bg-surface-1">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Risk Level</p>
              <RiskBadge risk={insights?.risk_probability ?? "low"} />
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground mb-1">30-day Trend</p>
              <div className="flex items-center gap-1.5 justify-end">
                {trendIcon}
                <span className="text-sm font-medium capitalize text-foreground">
                  {insights?.trend_direction ?? "stable"}
                </span>
              </div>
            </div>
          </div>

          {/* 30-day attendance area chart */}
          <div className="rounded-xl border border-border-subtle bg-surface-1 p-4">
            <p className="text-sm font-semibold text-foreground mb-3">30-Day Attendance Activity</p>
            <ResponsiveContainer width="100%" height={120}>
              <AreaChart data={weeklyData ?? []} margin={{ top: 4, right: 0, left: -32, bottom: 0 }}>
                <defs>
                  <linearGradient id="attGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickLine={false} interval={6} />
                <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--surface-1))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                  formatter={(v: any) => [v === 1 ? "Present" : "Absent", "Status"]}
                />
                <Area type="monotone" dataKey="attended" stroke="hsl(var(--primary))" fill="url(#attGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Radar chart */}
          <div className="rounded-xl border border-border-subtle bg-surface-1 p-4">
            <p className="text-sm font-semibold text-foreground mb-1">Academic Radar</p>
            <p className="text-xs text-muted-foreground mb-3">Multi-dimension performance view</p>
            <ResponsiveContainer width="100%" height={200}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <Radar
                  name="Score" dataKey="value"
                  stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2}
                  strokeWidth={2}
                />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--surface-1))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Growth projections */}
          {insights && (
            <div className="rounded-xl border border-border-subtle bg-surface-1 p-4 space-y-3">
              <p className="text-sm font-semibold text-foreground">Growth Projection</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-surface-2 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Projected Points</p>
                  <p className="text-xl font-bold text-foreground mt-1">{insights.projected_points}</p>
                </div>
                <div className="bg-surface-2 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Projected Tier</p>
                  <p className="text-xl font-bold capitalize text-foreground mt-1">{insights.projected_tier_next_month}</p>
                </div>
                <div className="bg-surface-2 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">30d Attendance</p>
                  <p className="text-xl font-bold text-foreground mt-1">{insights.last_30_day_attendance_pct}%</p>
                </div>
                <div className="bg-surface-2 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Attended / Total</p>
                  <p className="text-xl font-bold text-foreground mt-1">{insights.attended_count}/{insights.total_lectures}</p>
                </div>
              </div>
            </div>
          )}

          {/* Risk flags */}
          {(intel?.riskFlags?.length ?? 0) > 0 && (
            <div className="rounded-xl border border-danger/20 bg-danger/5 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-danger" />
                <p className="text-sm font-semibold text-danger">Active Flags</p>
              </div>
              <ul className="space-y-1">
                {intel!.riskFlags.map((f, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-danger shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </PageContainer>
  );
}
