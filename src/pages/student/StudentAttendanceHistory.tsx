import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import {
  CalendarDays, CheckCircle2, XCircle, TrendingUp, AlertTriangle,
  Target, Zap, BarChart3, Download,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { AttendanceSkeleton } from "@/components/ui/page-skeletons";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGrowthInsights } from "@/hooks/use-growth-insights";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type AttendanceRow = {
  id: string; lecture_id: string; status: string; marked_at: string; points_earned: number;
};
type LectureRow = {
  id: string; topic: string; lecture_date: string; start_time: string; end_time: string;
};

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

// ── Attendance Heatmap ────────────────────────────────────────────────────────
function AttendanceHeatmap({ attendanceByDate }: { attendanceByDate: Map<string, "present" | "absent"> }) {
  const days: { date: string; status: "present" | "absent" | "none" }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    days.push({ date: dateStr, status: attendanceByDate.get(dateStr) ?? "none" });
  }

  return (
    <div className="rounded-2xl border border-border-subtle bg-surface-1 p-5 dashboard-panel shadow-sm">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="h-8 w-8 rounded-lg bg-success/10 flex items-center justify-center">
          <CalendarDays className="h-4 w-4 text-success" />
        </div>
        <div>
          <p className="text-[13px] font-semibold text-foreground">30-Day Attendance Heatmap</p>
          <p className="text-[11px] text-muted-foreground">GitHub-style activity grid</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {days.map((d) => (
          <motion.div
            key={d.date}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.12, delay: 0 }}
            title={`${d.date}: ${d.status === "none" ? "No lecture" : d.status}`}
            className={cn(
              "h-5 w-5 rounded-sm cursor-default transition-colors",
              d.status === "present" ? "bg-success" :
              d.status === "absent" ? "bg-danger/40" :
              "bg-surface-3"
            )}
          />
        ))}
      </div>
      <div className="flex items-center gap-3 mt-3 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1"><div className="h-3 w-3 rounded-sm bg-success" /> Present</div>
        <div className="flex items-center gap-1"><div className="h-3 w-3 rounded-sm bg-danger/40" /> Absent</div>
        <div className="flex items-center gap-1"><div className="h-3 w-3 rounded-sm bg-surface-3" /> No lecture</div>
      </div>
    </div>
  );
}

// ── Insight Card ──────────────────────────────────────────────────────────────
function InsightCard({ icon: Icon, title, value, sub, accent }: {
  icon: React.ElementType; title: string; value: string; sub?: string; accent: string;
}) {
  return (
    <div className={cn("rounded-2xl border p-4 dashboard-panel shadow-sm bg-surface-1", accent === "success" ? "border-success/20" : accent === "warning" ? "border-warning/20" : accent === "danger" ? "border-danger/20" : "border-primary/20")}>
      <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center mb-3", accent === "success" ? "bg-success/10" : accent === "warning" ? "bg-warning/10" : accent === "danger" ? "bg-danger/10" : "bg-primary/10")}>
        <Icon className={cn("h-4 w-4", accent === "success" ? "text-success" : accent === "warning" ? "text-warning" : accent === "danger" ? "text-danger" : "text-primary")} />
      </div>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">{title}</p>
      <p className="text-2xl font-bold text-foreground mt-0.5 tabular-nums">{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

function downloadCsv(rows: { date: string; topic: string; status: string; points: number }[]) {
  const header = ["Date", "Lecture", "Status", "Points"];
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const csv = [header.join(","), ...rows.map((r) => [r.date, r.topic, r.status, String(r.points)].map(escape).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "my-attendance.csv";
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

export default function StudentAttendanceHistory() {
  const [filterLectureId, setFilterLectureId] = useState("all");

  const lecturesQuery = useQuery({
    queryKey: ["student", "lectures", "all"],
    queryFn: async (): Promise<LectureRow[]> => {
      const { data, error } = await supabase.from("lectures")
        .select("id,topic,lecture_date,start_time,end_time")
        .order("lecture_date", { ascending: false }).limit(500);
      if (error) throw error;
      return (data ?? []) as LectureRow[];
    },
  });

  const attendanceQuery = useQuery({
    queryKey: ["student", "attendance", "all"],
    queryFn: async (): Promise<AttendanceRow[]> => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return [];
      const { data, error } = await supabase.from("attendance")
        .select("id,lecture_id,status,marked_at,points_earned")
        .eq("student_user_id", userData.user.id)
        .order("marked_at", { ascending: false }).limit(500);
      if (error) throw error;
      return (data ?? []) as AttendanceRow[];
    },
  });

  const growthQ = useGrowthInsights();

  const lectureMap = useMemo(() => {
    const map: Record<string, LectureRow> = {};
    for (const l of lecturesQuery.data ?? []) map[l.id] = l;
    return map;
  }, [lecturesQuery.data]);

  const allRows = attendanceQuery.data ?? [];

  // Stats
  const totals = useMemo(() => {
    const present = allRows.filter((r) => r.status === "present").length;
    const total = allRows.length;
    const pct = total > 0 ? Math.round((present / total) * 100) : 0;
    const pts = allRows.reduce((s, r) => s + (r.points_earned ?? 0), 0);
    return { total, present, absent: total - present, pct, pts };
  }, [allRows]);

  // Filtered rows
  const filteredRows = useMemo(() =>
    filterLectureId === "all" ? allRows : allRows.filter((r) => r.lecture_id === filterLectureId),
    [allRows, filterLectureId]
  );

  // 30-day trend chart data
  const trendData = useMemo(() => {
    const byDate: Record<string, { present: number; absent: number }> = {};
    allRows.forEach((r) => {
      const d = r.marked_at.slice(0, 10);
      if (!byDate[d]) byDate[d] = { present: 0, absent: 0 };
      if (r.status === "present") byDate[d].present++;
      else byDate[d].absent++;
    });
    return Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-14)
      .map(([date, v]) => ({
        date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        Present: v.present, Absent: v.absent,
      }));
  }, [allRows]);

  // Heatmap data
  const heatmapData = useMemo(() => {
    const map = new Map<string, "present" | "absent">();
    allRows.forEach((r) => {
      const d = r.marked_at.slice(0, 10);
      if (!map.has(d)) map.set(d, r.status as "present" | "absent");
    });
    return map;
  }, [allRows]);

  // CSV export data
  const exportData = useMemo(() =>
    filteredRows.map((r) => ({
      date: r.marked_at.slice(0, 10),
      topic: lectureMap[r.lecture_id]?.topic ?? r.lecture_id,
      status: r.status,
      points: r.points_earned,
    })), [filteredRows, lectureMap]);

  const growth = growthQ.data;
  const riskLevel = growth?.risk_probability ?? "low";

  if (attendanceQuery.isLoading && !attendanceQuery.data) return <AttendanceSkeleton />;

  return (
    <div className="space-y-5">
      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <InsightCard icon={BarChart3} title="Overall Attendance" value={`${totals.pct}%`}
          sub={`${totals.present} of ${totals.total} lectures`}
          accent={totals.pct >= 75 ? "success" : totals.pct >= 60 ? "warning" : "danger"} />
        <InsightCard icon={CheckCircle2} title="Present" value={String(totals.present)}
          sub="Total attended" accent="success" />
        <InsightCard icon={XCircle} title="Absent" value={String(totals.absent)}
          sub="Total missed" accent={totals.absent > totals.present * 0.3 ? "danger" : "warning"} />
        <InsightCard icon={Zap} title="Points Earned" value={String(totals.pts)}
          sub="From attendance" accent="primary" />
      </div>

      {/* Projection + Risk row */}
      {growth && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Current % */}
          <div className="rounded-2xl border border-border-subtle bg-surface-1 p-5 dashboard-panel shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Target className="h-4 w-4 text-primary" />
              <p className="text-[12px] font-semibold text-foreground">30-Day Attendance</p>
            </div>
            <p className="text-3xl font-bold text-foreground tabular-nums">{growth.last_30_day_attendance_pct}%</p>
            <Progress value={growth.last_30_day_attendance_pct} className="mt-2 h-1.5" />
            <p className="text-[11px] text-muted-foreground mt-1.5">{growth.attended_count} / {growth.total_lectures} lectures attended</p>
          </div>

          {/* Projected end-semester */}
          <div className="rounded-2xl border border-border-subtle bg-surface-1 p-5 dashboard-panel shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-4 w-4 text-success" />
              <p className="text-[12px] font-semibold text-foreground">Projected End Semester</p>
            </div>
            <p className="text-3xl font-bold text-foreground tabular-nums capitalize">{growth.projected_tier_next_month}</p>
            <p className={cn("text-[12px] mt-1 font-medium", growth.trend_direction === "improving" ? "text-success" : growth.trend_direction === "declining" ? "text-danger" : "text-muted-foreground")}>
              {growth.trend_direction === "improving" ? "↑ Trending up" : growth.trend_direction === "declining" ? "↓ Trending down" : "→ Stable"}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">Projected +{growth.projected_points} points next month</p>
          </div>

          {/* Risk status */}
          <div className={cn(
            "rounded-2xl border p-5 dashboard-panel shadow-sm",
            riskLevel === "high" ? "border-danger/30 bg-danger/5" :
            riskLevel === "medium" ? "border-warning/30 bg-warning/5" :
            "border-success/30 bg-success/5"
          )}>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className={cn("h-4 w-4", riskLevel === "high" ? "text-danger" : riskLevel === "medium" ? "text-warning" : "text-success")} />
              <p className="text-[12px] font-semibold text-foreground">Risk Status</p>
            </div>
            <Badge className={cn("text-sm font-bold px-3 py-1 capitalize border-0", riskLevel === "high" ? "bg-danger/15 text-danger" : riskLevel === "medium" ? "bg-warning/15 text-warning" : "bg-success/15 text-success")}>
              {riskLevel === "high" ? "High Risk" : riskLevel === "medium" ? "Moderate Risk" : "Low Risk"}
            </Badge>
            <p className="text-[11px] text-muted-foreground mt-2">
              {riskLevel === "high" ? "Attendance critically low. Attend all upcoming lectures." :
               riskLevel === "medium" ? "Attendance below target. Improve consistency." :
               "Great attendance! Keep up the momentum."}
            </p>
          </div>
        </div>
      )}

      {/* Attendance Trend Chart */}
      {trendData.length > 0 && (
        <div className="rounded-2xl border border-border-subtle bg-surface-1 p-5 dashboard-panel shadow-sm">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-foreground">Attendance Trend</p>
              <p className="text-[11px] text-muted-foreground">Last 14 lectures attendance activity</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={trendData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="present-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border-subtle))" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="Present" stroke="hsl(var(--success))" strokeWidth={2} fill="url(#present-grad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Heatmap */}
      <AttendanceHeatmap attendanceByDate={heatmapData} />

      {/* History table */}
      <div className="rounded-2xl border border-border-subtle bg-surface-1 overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle flex-wrap gap-3">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <CalendarDays className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-foreground">Attendance Records</p>
              <p className="text-[11px] text-muted-foreground">{filteredRows.length} entries</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={filterLectureId} onValueChange={setFilterLectureId}>
              <SelectTrigger className="w-44 h-8 text-xs bg-surface-2 border-border-subtle">
                <SelectValue placeholder="All lectures" />
              </SelectTrigger>
              <SelectContent className="bg-surface-1 border-border-subtle">
                <SelectItem value="all">All Lectures</SelectItem>
                {(lecturesQuery.data ?? []).map((l) => (
                  <SelectItem key={l.id} value={l.id}>{l.lecture_date} — {l.topic}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8"
              onClick={() => { try { downloadCsv(exportData); toast.success("Downloaded"); } catch { toast.error("Export failed"); } }}
              disabled={exportData.length === 0}>
              <Download className="h-3.5 w-3.5" /> Export
            </Button>
          </div>
        </div>

        {/* Column header */}
        <div className="grid grid-cols-[1fr_1fr_80px_60px] text-[10px] font-semibold uppercase tracking-widest text-muted-foreground bg-surface-2 px-5 py-2.5 border-b border-border-subtle">
          <span>Lecture</span>
          <span className="hidden sm:block">Date</span>
          <span className="text-center">Status</span>
          <span className="text-right">Points</span>
        </div>

        <div className="divide-y divide-border-subtle/50">
          {attendanceQuery.isLoading ? (
            <div className="p-5 space-y-2">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <CalendarDays className="h-8 w-8 text-muted-foreground mx-auto opacity-40" />
              <p className="text-[13px] text-muted-foreground">No attendance records found</p>
            </div>
          ) : (
            filteredRows.map((r) => {
              const lecture = lectureMap[r.lecture_id];
              const isPresent = r.status === "present";
              return (
                <div key={r.id} className="grid grid-cols-[1fr_1fr_80px_60px] items-center px-5 py-3 hover:bg-surface-2/60 transition-colors duration-120">
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-foreground truncate">{lecture?.topic ?? "Unknown"}</p>
                    <p className="text-[11px] text-muted-foreground sm:hidden">{r.marked_at.slice(0, 10)}</p>
                  </div>
                  <p className="text-[12px] text-muted-foreground hidden sm:block">{r.marked_at.slice(0, 10)}</p>
                  <div className="flex justify-center">
                    <span className={cn(
                      "inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded-full",
                      isPresent ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
                    )}>
                      {isPresent ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                      {isPresent ? "Present" : "Absent"}
                    </span>
                  </div>
                  <p className={cn("text-right text-[13px] font-semibold tabular-nums", r.points_earned > 0 ? "text-success" : "text-muted-foreground")}>
                    {r.points_earned > 0 ? `+${r.points_earned}` : "—"}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
