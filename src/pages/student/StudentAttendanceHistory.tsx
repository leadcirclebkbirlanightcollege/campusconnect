import { lazy, Suspense, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from "recharts";
import {
  CalendarDays, CheckCircle2, XCircle, TrendingUp, AlertTriangle,
  Target, Zap, BarChart3, Download, BookOpen, Filter,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGrowthInsights } from "@/hooks/use-growth-insights";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type AttendanceRow = {
  id: string; lecture_id: string; status: string; marked_at: string; points_earned: number;
};
type LectureRow = {
  id: string; topic: string; lecture_date: string; start_time: string; end_time: string; venue: string;
};

/* ── Custom Tooltip ── */
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border-subtle bg-surface-2 px-3 py-2 shadow-md text-xs">
      <p className="font-semibold text-foreground mb-1 truncate max-w-[140px]">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} className="font-bold" style={{ color: p.fill }}>{p.name}: {p.value}</p>
      ))}
    </div>
  );
};

/* ── CSV export ── */
function downloadCsv(rows: { date: string; topic: string; status: string; points: number }[]) {
  const header = ["Date", "Lecture", "Status", "Points"];
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const csv = [header.join(","), ...rows.map((r) => [r.date, r.topic, r.status, String(r.points)].map(esc).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = "my-attendance.csv";
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

/* ── KPI Card ── */
function KpiCard({ icon: Icon, label, value, sub, accent }: {
  icon: React.ElementType; label: string; value: string; sub?: string;
  accent: "success" | "danger" | "warning" | "primary";
}) {
  const colors = {
    success: { bg: "bg-success/10", text: "text-success", border: "border-success/20" },
    danger:  { bg: "bg-danger/10",  text: "text-danger",  border: "border-danger/20"  },
    warning: { bg: "bg-warning/10", text: "text-warning",  border: "border-warning/20" },
    primary: { bg: "bg-primary/10", text: "text-primary",  border: "border-primary/20" },
  };
  const c = colors[accent];
  return (
    <div className={cn("rounded-2xl border bg-surface-1 p-4 shadow-sm", c.border)}>
      <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center mb-3", c.bg)}>
        <Icon className={cn("h-4.5 w-4.5", c.text)} />
      </div>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">{label}</p>
      <p className="text-[26px] font-black text-foreground mt-0.5 tabular-nums leading-none">{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
export default function StudentAttendanceHistory() {
  const [filterStatus, setFilterStatus]   = useState<"all" | "present" | "absent">("all");
  const [filterLectureId, setFilterLectureId] = useState("all");

  /* ── Queries ── */
  const lecturesQuery = useQuery({
    queryKey: ["student", "lectures", "all"],
    queryFn: async (): Promise<LectureRow[]> => {
      const { data, error } = await supabase.from("lectures")
        .select("id,topic,lecture_date,start_time,end_time,venue")
        .order("lecture_date", { ascending: false }).limit(500);
      if (error) throw error;
      return (data ?? []) as LectureRow[];
    },
  });

  const attendanceQuery = useQuery({
    queryKey: ["student", "attendance", "all"],
    queryFn: async (): Promise<AttendanceRow[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase.from("attendance")
        .select("id,lecture_id,status,marked_at,points_earned")
        .eq("student_user_id", user.id)
        .order("marked_at", { ascending: false }).limit(500);
      if (error) throw error;
      return (data ?? []) as AttendanceRow[];
    },
  });

  const growthQ = useGrowthInsights();

  /* ── Derived ── */
  const lectureMap = useMemo(() => {
    const m: Record<string, LectureRow> = {};
    for (const l of lecturesQuery.data ?? []) m[l.id] = l;
    return m;
  }, [lecturesQuery.data]);

  const allRows = attendanceQuery.data ?? [];

  const totals = useMemo(() => {
    const present = allRows.filter((r) => r.status === "present").length;
    const total   = allRows.length;
    const pct     = total > 0 ? Math.round((present / total) * 100) : 0;
    const pts     = allRows.reduce((s, r) => s + (r.points_earned ?? 0), 0);
    return { total, present, absent: total - present, pct, pts };
  }, [allRows]);

  const filteredRows = useMemo(() => {
    let rows = allRows;
    if (filterLectureId !== "all") rows = rows.filter((r) => r.lecture_id === filterLectureId);
    if (filterStatus !== "all")    rows = rows.filter((r) => r.status === filterStatus);
    return rows;
  }, [allRows, filterLectureId, filterStatus]);

  /* ── Bar chart: last 12 lectures ── */
  const barData = useMemo(() => {
    const last12 = [...allRows].slice(0, 12).reverse();
    return last12.map((r) => ({
      name: (lectureMap[r.lecture_id]?.topic ?? "Lecture").slice(0, 14),
      value: r.status === "present" ? 1 : 0,
      status: r.status,
      date: r.marked_at.slice(0, 10),
    }));
  }, [allRows, lectureMap]);

  /* ── Subject-wise breakdown ── */
  const subjectBreakdown = useMemo(() => {
    const map: Record<string, { present: number; total: number }> = {};
    for (const r of allRows) {
      const topic = lectureMap[r.lecture_id]?.topic ?? "Unknown";
      if (!map[topic]) map[topic] = { present: 0, total: 0 };
      map[topic].total++;
      if (r.status === "present") map[topic].present++;
    }
    return Object.entries(map)
      .map(([topic, v]) => ({ topic, pct: Math.round((v.present / v.total) * 100), ...v }))
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 6);
  }, [allRows, lectureMap]);

  /* ── Goal tracker ── */
  const GOAL_PCT = 85;
  const goalInfo = useMemo(() => {
    const needed = GOAL_PCT;
    if (totals.total === 0) return null;
    if (totals.pct >= needed) return { met: true, needed: 0, msg: "Goal achieved! You're above 85% 🎉" };
    // How many more lectures to attend (assuming still more to come)?
    const extra = Math.ceil((needed * totals.total - 100 * totals.present) / (100 - needed));
    return { met: false, needed: extra > 0 ? extra : 0, msg: `Attend ${extra} more lecture${extra > 1 ? "s" : ""} to reach 85%` };
  }, [totals]);

  const growth   = growthQ.data;
  const riskLevel = (growth?.risk_probability ?? "low") as string;
  const isLoading = attendanceQuery.isLoading && !attendanceQuery.data;

  const exportData = useMemo(() => filteredRows.map((r) => ({
    date: r.marked_at.slice(0, 10),
    topic: lectureMap[r.lecture_id]?.topic ?? r.lecture_id,
    status: r.status, points: r.points_earned,
  })), [filteredRows, lectureMap]);

  /* ── Skeletons ── */
  if (isLoading) {
    return (
      <div className="space-y-5 pb-28">
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-2xl mx-auto pb-28">

      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <CalendarDays className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-[20px] font-black text-foreground tracking-tight">Attendance History</h1>
            <p className="text-[12px] text-muted-foreground">Your academic attendance record</p>
          </div>
        </div>
      </motion.div>

      {/* ── KPI Strip ── */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { icon: BarChart3,    label: "Overall",  value: `${totals.pct}%`,          sub: `${totals.present} of ${totals.total} attended`, accent: (totals.pct >= 75 ? "success" : totals.pct >= 60 ? "warning" : "danger") as any },
          { icon: CheckCircle2, label: "Present",  value: String(totals.present),     sub: "Lectures attended",                             accent: "success" as const },
          { icon: XCircle,      label: "Absent",   value: String(totals.absent),      sub: "Lectures missed",                               accent: (totals.absent > totals.present * 0.3 ? "danger" : "warning") as const },
          { icon: Zap,          label: "Points",   value: String(totals.pts),         sub: "From attendance",                               accent: "primary" as const },
        ].map(({ icon, label, value, sub, accent }, i) => (
          <motion.div key={label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <KpiCard icon={icon} label={label} value={value} sub={sub} accent={accent} />
          </motion.div>
        ))}
      </div>

      {/* ── Attendance Ring Summary ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
        className="rounded-2xl border border-border-subtle bg-surface-1 p-5 shadow-sm"
      >
        <div className="flex items-center gap-4">
          {/* SVG Ring */}
          <div className="relative h-20 w-20 flex-shrink-0">
            <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
              <circle cx="40" cy="40" r="32" fill="none" stroke="hsl(var(--surface-3))" strokeWidth="8" />
              <motion.circle
                cx="40" cy="40" r="32" fill="none"
                stroke={totals.pct >= 75 ? "hsl(var(--success))" : totals.pct >= 60 ? "hsl(var(--warning))" : "hsl(var(--danger))"}
                strokeWidth="8" strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 32}`}
                initial={{ strokeDashoffset: 2 * Math.PI * 32 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 32 * (1 - totals.pct / 100) }}
                transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[15px] font-black text-foreground tabular-nums">{totals.pct}%</span>
            </div>
          </div>
          <div className="flex-1">
            <p className="text-[16px] font-black text-foreground">{totals.present} / {totals.total}</p>
            <p className="text-[12px] text-muted-foreground mt-0.5">Lectures attended</p>
            <div className="mt-2.5 h-2 rounded-full bg-surface-3 overflow-hidden">
              <motion.div
                className={cn("h-full rounded-full", totals.pct >= 75 ? "bg-success" : totals.pct >= 60 ? "bg-warning" : "bg-danger")}
                initial={{ width: 0 }}
                animate={{ width: `${totals.pct}%` }}
                transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
              />
            </div>
            <p className={cn("text-[11px] font-semibold mt-1.5",
              totals.pct >= 75 ? "text-success" : totals.pct >= 60 ? "text-warning" : "text-danger")}>
              {totals.pct >= 75 ? "✅ On track" : totals.pct >= 60 ? "⚠️ Borderline" : "❌ Critical"}
            </p>
          </div>
        </div>
      </motion.div>

      {/* ── Attendance Warning Panel ── */}
      {totals.total > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className={cn(
            "rounded-2xl border p-4 shadow-sm",
            totals.pct >= 75 ? "border-success/25 bg-success/5"
            : totals.pct >= 60 ? "border-warning/25 bg-warning/5"
            : "border-danger/25 bg-danger/5",
          )}
        >
          <div className="flex items-start gap-3">
            <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0",
              totals.pct >= 75 ? "bg-success/15" : totals.pct >= 60 ? "bg-warning/15" : "bg-danger/15")}>
              <AlertTriangle className={cn("h-4.5 w-4.5",
                totals.pct >= 75 ? "text-success" : totals.pct >= 60 ? "text-warning" : "text-danger")} />
            </div>
            <div>
              <p className={cn("text-[13px] font-bold",
                totals.pct >= 75 ? "text-success" : totals.pct >= 60 ? "text-warning" : "text-danger")}>
                {totals.pct >= 75 ? "Attendance: Safe Zone" : totals.pct >= 60 ? "Attendance Warning" : "⚠ Critical Attendance Alert"}
              </p>
              <p className="text-[12px] text-muted-foreground mt-0.5">
                {totals.pct >= 75
                  ? "Great work! Your attendance meets the required 75% threshold."
                  : totals.pct >= 60
                  ? "Your attendance is below 75%. Attend upcoming lectures to improve."
                  : "Attendance critically low. You may face academic penalties. Attend all remaining lectures."}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Goal Tracker ── */}
      {goalInfo && (
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.17 }}
          className="rounded-2xl border border-primary/20 bg-primary/5 p-5 shadow-sm"
        >
          <div className="flex items-center gap-2.5 mb-4">
            <div className="h-8 w-8 rounded-xl bg-primary/15 flex items-center justify-center">
              <Target className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-[14px] font-bold text-foreground">Goal Tracker</p>
              <p className="text-[11px] text-muted-foreground">Target: 85% attendance</p>
            </div>
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] font-semibold text-foreground">Current: {totals.pct}%</span>
            <span className="text-[12px] font-semibold text-primary">Target: {GOAL_PCT}%</span>
          </div>
          <div className="w-full h-3 rounded-full bg-surface-3 overflow-hidden mb-3">
            <motion.div
              className={cn("h-full rounded-full", goalInfo.met ? "bg-success" : "bg-gradient-to-r from-primary to-primary/70")}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, totals.pct)}%` }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
            />
          </div>
          <p className={cn("text-[12px] font-semibold", goalInfo.met ? "text-success" : "text-foreground")}>
            {goalInfo.msg}
          </p>
        </motion.div>
      )}

      {/* ── Bar Chart ── */}
      {barData.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
          className="rounded-2xl border border-border-subtle bg-surface-1 p-5 shadow-sm"
        >
          <div className="flex items-center gap-2.5 mb-4">
            <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-[14px] font-bold text-foreground">Attendance Per Lecture</p>
              <p className="text-[11px] text-muted-foreground">Last {barData.length} lectures</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={barData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border-subtle))" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} ticks={[0, 1]} tickFormatter={(v) => v === 1 ? "✓" : "✗"} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" name="Status" radius={[4, 4, 0, 0]} maxBarSize={32}>
                {barData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.status === "present" ? "hsl(var(--success))" : "hsl(var(--danger)/0.5)"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <div className="h-2.5 w-2.5 rounded-sm bg-success" />Present
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <div className="h-2.5 w-2.5 rounded-sm bg-danger/50" />Absent
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Subject-wise Breakdown ── */}
      {subjectBreakdown.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="rounded-2xl border border-border-subtle bg-surface-1 p-5 shadow-sm"
        >
          <div className="flex items-center gap-2.5 mb-4">
            <div className="h-8 w-8 rounded-xl bg-warning/10 flex items-center justify-center">
              <BookOpen className="h-4 w-4 text-warning" />
            </div>
            <div>
              <p className="text-[14px] font-bold text-foreground">Subject-wise Attendance</p>
              <p className="text-[11px] text-muted-foreground">Breakdown by lecture topic</p>
            </div>
          </div>
          <div className="space-y-3.5">
            {subjectBreakdown.map(({ topic, pct, present, total }, i) => (
              <motion.div
                key={topic}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.22 + i * 0.05 }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[12px] font-semibold text-foreground truncate max-w-[70%]">{topic}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">{present}/{total}</span>
                    <span className={cn("text-[12px] font-black tabular-nums",
                      pct >= 75 ? "text-success" : pct >= 60 ? "text-warning" : "text-danger")}>
                      {pct}%
                    </span>
                  </div>
                </div>
                <div className="h-2 rounded-full bg-surface-3 overflow-hidden">
                  <motion.div
                    className={cn("h-full rounded-full", pct >= 75 ? "bg-success" : pct >= 60 ? "bg-warning" : "bg-danger")}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.6, ease: "easeOut", delay: 0.23 + i * 0.06 }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Attendance History Records ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}
        className="rounded-2xl border border-border-subtle bg-surface-1 overflow-hidden shadow-sm"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle flex-wrap gap-3">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <CalendarDays className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-[14px] font-bold text-foreground">Attendance Records</p>
              <p className="text-[11px] text-muted-foreground">{filteredRows.length} entries</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Status filter */}
            <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
              <SelectTrigger className="w-28 h-8 text-xs bg-surface-2 border-border-subtle">
                <Filter className="h-3 w-3 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-surface-1 border-border-subtle">
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="present">Present</SelectItem>
                <SelectItem value="absent">Absent</SelectItem>
              </SelectContent>
            </Select>
            {/* Lecture filter */}
            <Select value={filterLectureId} onValueChange={setFilterLectureId}>
              <SelectTrigger className="w-40 h-8 text-xs bg-surface-2 border-border-subtle">
                <SelectValue placeholder="All lectures" />
              </SelectTrigger>
              <SelectContent className="bg-surface-1 border-border-subtle">
                <SelectItem value="all">All Lectures</SelectItem>
                {(lecturesQuery.data ?? []).map((l) => (
                  <SelectItem key={l.id} value={l.id}>{l.lecture_date} — {l.topic.slice(0, 20)}</SelectItem>
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

        {/* Records — mobile cards */}
        <div className="divide-y divide-border-subtle/40">
          {filteredRows.length === 0 ? (
            <div className="py-12 text-center">
              <CalendarDays className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-[13px] text-muted-foreground">No records found</p>
            </div>
          ) : filteredRows.map((r, i) => {
            const lecture    = lectureMap[r.lecture_id];
            const isPresent  = r.status === "present";
            const dateStr    = r.marked_at.slice(0, 10);
            const dateLabel  = new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
            return (
              <motion.div
                key={r.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: Math.min(i * 0.02, 0.3) }}
                className="flex items-center gap-3 px-5 py-3.5 hover:bg-surface-2/60 transition-colors"
              >
                {/* Status dot */}
                <div className={cn("h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0",
                  isPresent ? "bg-success/10" : "bg-danger/10")}>
                  {isPresent
                    ? <CheckCircle2 className="h-4 w-4 text-success" />
                    : <XCircle className="h-4 w-4 text-danger" />}
                </div>
                {/* Main info */}
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-foreground truncate">{lecture?.topic ?? "Unknown"}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-muted-foreground">{dateLabel}</span>
                    {lecture?.venue && (
                      <span className="text-[10px] text-muted-foreground/70 truncate">· {lecture.venue}</span>
                    )}
                  </div>
                </div>
                {/* Right: status + points */}
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className={cn("text-[11px] font-bold px-2 py-0.5 rounded-full",
                    isPresent ? "bg-success/10 text-success" : "bg-danger/10 text-danger")}>
                    {isPresent ? "Present" : "Absent"}
                  </span>
                  {r.points_earned > 0 && (
                    <span className="text-[11px] font-semibold text-success tabular-nums">+{r.points_earned}</span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
