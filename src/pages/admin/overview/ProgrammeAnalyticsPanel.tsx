/**
 * PHASE 7 — Programme Analytics Panel (Admin)
 * Per-programme attendance, engagement, and points distribution.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell,
} from "recharts";
import { BarChart3, ArrowRight, GraduationCap } from "@/components/icons";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface ProgrammeStat {
  id: string;
  name: string;
  color: string;
  enrolled: number;
  present: number;
  attendancePct: number;
  totalPoints: number;
  avgEngagement: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border-subtle bg-surface-2 px-3 py-2 shadow-md text-xs">
      <p className="font-semibold text-foreground mb-1 truncate max-w-[160px]">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color ?? "hsl(var(--foreground))" }}>
          {p.name}: <span className="font-bold">{p.value}{p.unit ?? ""}</span>
        </p>
      ))}
    </div>
  );
};

export default function ProgrammeAnalyticsPanel({ onNavigateTab }: { onNavigateTab: (tab: string) => void }) {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin", "programme-analytics-v2"],
    queryFn: async (): Promise<ProgrammeStat[]> => {
      const [
        { data: progs },
        { data: allotments },
        { data: attendance },
        { data: intel },
        { data: ledger },
      ] = await Promise.all([
        supabase.from("programmes").select("id,name,color").eq("is_active", true).order("name"),
        supabase.from("student_programme_allotments").select("programme_id,student_user_id"),
        supabase.from("attendance").select("student_user_id,status").eq("status", "present"),
        supabase.from("student_intelligence").select("user_id,engagement_index"),
        supabase.from("points_ledger").select("user_id,points"),
      ]);

      if (!progs) return [];

      // Build lookup maps
      const studentsByProg: Record<string, Set<string>> = {};
      (allotments ?? []).forEach((a) => {
        if (!studentsByProg[a.programme_id]) studentsByProg[a.programme_id] = new Set();
        studentsByProg[a.programme_id].add(a.student_user_id);
      });

      const intelByUser: Record<string, number> = {};
      (intel ?? []).forEach((r) => { intelByUser[r.user_id] = r.engagement_index; });

      const pointsByUser: Record<string, number> = {};
      (ledger ?? []).forEach((r) => { pointsByUser[r.user_id] = (pointsByUser[r.user_id] ?? 0) + r.points; });

      const presentSet = new Set((attendance ?? []).map((a) => a.student_user_id));

      return progs.map((p) => {
        const students = [...(studentsByProg[p.id] ?? new Set())];
        const enrolled = students.length;
        const present  = students.filter((uid) => presentSet.has(uid)).length;
        const attPct   = enrolled > 0 ? Math.round((present / enrolled) * 100) : 0;
        const totalPts = students.reduce((s, uid) => s + (pointsByUser[uid] ?? 0), 0);
        const avgEng   = enrolled > 0
          ? Math.round(students.reduce((s, uid) => s + (intelByUser[uid] ?? 0), 0) / enrolled)
          : 0;
        return {
          id: p.id, name: p.name, color: p.color ?? "hsl(var(--primary))",
          enrolled, present, attendancePct: attPct, totalPoints: totalPts, avgEngagement: avgEng,
        };
      });
    },
    staleTime: 45_000,
  });

  const shortName = (s: string) => s.length > 8 ? s.slice(0, 7) + "…" : s;

  const attChartData  = useMemo(() => (stats ?? []).map((p) => ({ name: shortName(p.name), value: p.attendancePct, color: p.color, fullName: p.name })), [stats]);
  const engChartData  = useMemo(() => (stats ?? []).map((p) => ({ name: shortName(p.name), value: p.avgEngagement, color: p.color, fullName: p.name })), [stats]);

  return (
    <div className="rounded-2xl border border-border-subtle bg-surface-1 overflow-hidden dashboard-panel shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <BarChart3 className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-body font-semibold text-foreground">Programme Analytics</p>
            <p className="text-[11px] text-muted-foreground">Attendance & engagement by programme</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="gap-1 text-caption text-muted-foreground hover:text-foreground" onClick={() => onNavigateTab("programmes")}>
          Manage <ArrowRight className="h-3 w-3" />
        </Button>
      </div>

      {isLoading ? (
        <div className="p-5 space-y-4">
          <Skeleton className="h-[120px] w-full rounded-xl" />
          <Skeleton className="h-[120px] w-full rounded-xl" />
        </div>
      ) : !stats?.length ? (
        <div className="p-8 text-center">
          <GraduationCap className="h-8 w-8 text-muted-foreground mx-auto opacity-40 mb-2" />
          <p className="text-caption text-muted-foreground">No active programmes yet.</p>
        </div>
      ) : (
        <div className="p-5 space-y-5">
          {/* Attendance % chart */}
          <div>
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-2">Attendance Rate (%)</p>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={attChartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border-subtle))" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} domain={[0, 100]} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="Attendance" radius={[4, 4, 0, 0]}>
                  {attChartData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Engagement chart */}
          <div>
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-2">Avg Engagement Score</p>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={engChartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border-subtle))" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} domain={[0, 100]} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="Engagement" radius={[4, 4, 0, 0]}>
                  {engChartData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} fillOpacity={0.7} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Summary rows */}
          <div className="space-y-2">
            {stats.map((p, i) => (
              <motion.div key={p.id}
                initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3 rounded-xl border border-border-subtle bg-surface-2 px-4 py-2.5"
              >
                <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                <p className="text-[12px] font-medium text-foreground flex-1 truncate">{p.name}</p>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <p className="text-[12px] font-bold text-foreground tabular-nums">{p.attendancePct}%</p>
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Att</p>
                  </div>
                  <div className="text-right">
                    <p className={cn("text-[12px] font-bold tabular-nums",
                      p.avgEngagement >= 70 ? "text-success" : p.avgEngagement >= 50 ? "text-warning" : "text-danger"
                    )}>{p.avgEngagement}</p>
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Eng</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[12px] font-bold text-foreground tabular-nums">{p.enrolled}</p>
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Students</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
