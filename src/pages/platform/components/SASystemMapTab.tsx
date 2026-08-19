import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2, BookOpen, CheckSquare, ChevronDown, ChevronRight,
  GraduationCap, LayoutGrid, Users, Radio, Activity,
} from "@/components/icons";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CollegeNode {
  id: string;
  college_name: string;
  primary_color: string | null;
  is_active: boolean;
  student_count: number;
  lecture_count: number;
  attendance_count: number;
  dept_count: number;
  class_count: number;
  live_lectures: number;
}

// ─── Attendance Heatmap ───────────────────────────────────────────────────────

const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

function AttendanceHeatmap({ colleges }: { colleges: CollegeNode[] }) {
  const { data: heatmap, isLoading } = useQuery({
    queryKey: ["sa_system_map", "heatmap"],
    queryFn: async () => {
      const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("attendance")
        .select("college_id, marked_at")
        .gte("marked_at", since);

      // Build map: college_id → hour → count
      const map: Record<string, Record<number, number>> = {};
      for (const row of data ?? []) {
        const cid = row.college_id ?? "unknown";
        const hr = new Date(row.marked_at).getHours();
        if (!map[cid]) map[cid] = {};
        map[cid][hr] = (map[cid][hr] ?? 0) + 1;
      }
      return map;
    },
    staleTime: 120_000,
  });

  const maxVal = heatmap
    ? Math.max(1, ...Object.values(heatmap).flatMap((h) => Object.values(h)))
    : 1;

  const cellColor = (count: number) => {
    const intensity = count / maxVal;
    if (intensity === 0) return "bg-surface-2";
    if (intensity < 0.25) return "bg-primary/20";
    if (intensity < 0.5)  return "bg-primary/40";
    if (intensity < 0.75) return "bg-primary/65";
    return "bg-primary";
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Activity className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-bold text-foreground">Attendance Heatmap</h3>
        <Badge variant="outline" className="text-[10px] text-muted-foreground">Last 14 days</Badge>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border-subtle bg-surface-1/60 p-3">
        {/* Hour headers */}
        <div className="flex gap-1 mb-1 pl-24">
          {HOURS.map((h) => (
            <div key={h} className="w-8 text-center text-[9px] text-muted-foreground shrink-0">
              {h}h
            </div>
          ))}
        </div>

        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-8 mb-1 rounded-lg" />
            ))
          : colleges.slice(0, 8).map((college) => {
              const collegeData = heatmap?.[college.id] ?? {};
              return (
                <div key={college.id} className="flex items-center gap-1 mb-1">
                  {/* College label */}
                  <div
                    className="w-24 shrink-0 flex items-center gap-1.5 pr-2"
                    title={college.college_name}
                  >
                    <div
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: college.primary_color ?? "hsl(var(--primary))" }}
                    />
                    <span className="text-[10px] text-muted-foreground truncate">
                      {college.college_name.split(" ")[0]}
                    </span>
                  </div>
                  {/* Heat cells */}
                  {HOURS.map((h) => {
                    const count = collegeData[h] ?? 0;
                    return (
                      <div
                        key={h}
                        title={`${college.college_name} @ ${h}:00 — ${count} records`}
                        className={cn(
                          "w-8 h-7 rounded shrink-0 transition-all duration-150 cursor-default",
                          cellColor(count)
                        )}
                      />
                    );
                  })}
                </div>
              );
            })}

        {/* Legend */}
        <div className="flex items-center gap-2 mt-3 pl-24">
          <span className="text-[9px] text-muted-foreground">Low</span>
          {["bg-primary/20", "bg-primary/40", "bg-primary/65", "bg-primary"].map((c) => (
            <div key={c} className={cn("w-4 h-3 rounded", c)} />
          ))}
          <span className="text-[9px] text-muted-foreground">High</span>
        </div>
      </div>
    </div>
  );
}

// ─── College Node Card ────────────────────────────────────────────────────────

function CollegeCard({ college, expanded, onToggle }: {
  college: CollegeNode;
  expanded: boolean;
  onToggle: () => void;
}) {
  const color = college.primary_color ?? "hsl(var(--primary))";
  const stats = [
    { icon: Users,      label: "Students",   value: college.student_count },
    { icon: BookOpen,   label: "Lectures",   value: college.lecture_count },
    { icon: CheckSquare,label: "Attendance", value: college.attendance_count },
    { icon: LayoutGrid, label: "Depts",      value: college.dept_count },
  ];

  return (
    <motion.div
      layout
      className={cn(
        "rounded-2xl border bg-surface-1/70 backdrop-blur overflow-hidden",
        expanded ? "border-primary/40" : "border-border-subtle",
        "transition-colors duration-150"
      )}
    >
      {/* Header row */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-2/40 transition-colors"
      >
        {/* Color dot */}
        <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: color }} />

        {/* Name + status */}
        <div className="flex-1 min-w-0 text-left">
          <p className="text-sm font-semibold text-foreground truncate">{college.college_name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={cn(
              "text-[10px] font-medium px-1.5 py-0 rounded-full",
              college.is_active
                ? "bg-success/15 text-success"
                : "bg-muted/30 text-muted-foreground"
            )}>
              {college.is_active ? "Active" : "Inactive"}
            </span>
            {college.live_lectures > 0 && (
              <span className="flex items-center gap-1 text-[10px] text-danger font-medium">
                <Radio className="h-2.5 w-2.5 animate-pulse" />
                {college.live_lectures} LIVE
              </span>
            )}
          </div>
        </div>

        {/* Stat pills (compact) */}
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          {stats.slice(0, 2).map((s) => (
            <div key={s.label} className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <s.icon className="h-3 w-3" />
              <span className="font-medium text-foreground">{s.value.toLocaleString()}</span>
            </div>
          ))}
        </div>

        {/* Expand toggle */}
        <motion.div
          animate={{ rotate: expanded ? 90 : 0 }}
          transition={{ duration: 0.15 }}
          className="shrink-0"
        >
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </motion.div>
      </button>

      {/* Expanded details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: [0, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-border-subtle/60 pt-3 space-y-3">
              {/* Stats grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {stats.map((s) => (
                  <div
                    key={s.label}
                    className="flex flex-col items-center gap-1 rounded-xl bg-surface-2/60 py-2.5 px-2"
                  >
                    <s.icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-base font-bold text-foreground tabular-nums">
                      {s.value.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{s.label}</span>
                  </div>
                ))}
              </div>

              {/* Hierarchy visualization */}
              <div className="space-y-1.5 text-[11px] text-muted-foreground pl-1">
                <HierarchyRow depth={0} icon={Building2} label={college.college_name} count={null} color={color} />
                <HierarchyRow depth={1} icon={LayoutGrid}  label="Departments" count={college.dept_count} color={color} />
                <HierarchyRow depth={2} icon={GraduationCap} label="Classes" count={college.class_count} color={color} />
                <HierarchyRow depth={2} icon={Users}        label="Students" count={college.student_count} color={color} />
                <HierarchyRow depth={1} icon={BookOpen}     label="Lectures" count={college.lecture_count} color={color} />
                <HierarchyRow depth={2} icon={CheckSquare}  label="Attendance Records" count={college.attendance_count} color={color} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function HierarchyRow({ depth, icon: Icon, label, count, color }: {
  depth: number; icon: React.ElementType; label: string; count: number | null; color: string;
}) {
  return (
    <div className="flex items-center gap-1.5" style={{ paddingLeft: `${depth * 14}px` }}>
      {depth > 0 && (
        <div className="flex items-center gap-0.5 text-border-subtle">
          <span>└</span>
        </div>
      )}
      <Icon className="h-3 w-3 shrink-0" style={{ color }} />
      <span className="text-foreground/80">{label}</span>
      {count !== null && (
        <span className="ml-auto font-semibold text-foreground tabular-nums">{count.toLocaleString()}</span>
      )}
    </div>
  );
}

// ─── Main Tab ─────────────────────────────────────────────────────────────────

export default function SASystemMapTab() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: colleges, isLoading } = useQuery({
    queryKey: ["sa_system_map", "colleges"],
    queryFn: async () => {
      const [
        { data: collegeRows },
        { data: studentCounts },
        { data: lectureCounts },
        { data: attendanceCounts },
        { data: deptCounts },
        { data: classCounts },
        { data: liveLectures },
      ] = await Promise.all([
        supabase.from("colleges").select("id, college_name, primary_color, is_active").order("college_name"),
        supabase.from("profiles").select("college_id").eq("is_deleted", false),
        supabase.from("lectures").select("college_id"),
        supabase.from("attendance").select("college_id"),
        supabase.from("departments").select("college_id"),
        supabase.from("classes").select("college_id"),
        supabase.from("lectures").select("college_id").eq("status", "live"),
      ]);

      const countBy = (rows: { college_id: string | null }[] | null) => {
        const m: Record<string, number> = {};
        for (const r of rows ?? []) {
          if (r.college_id) m[r.college_id] = (m[r.college_id] ?? 0) + 1;
        }
        return m;
      };

      const sc  = countBy(studentCounts as any);
      const lc  = countBy(lectureCounts as any);
      const ac  = countBy(attendanceCounts as any);
      const dc  = countBy(deptCounts as any);
      const cc  = countBy(classCounts as any);
      const ll  = countBy(liveLectures as any);

      return (collegeRows ?? []).map((c) => ({
        id:               c.id,
        college_name:     c.college_name,
        primary_color:    c.primary_color,
        is_active:        c.is_active,
        student_count:    sc[c.id] ?? 0,
        lecture_count:    lc[c.id] ?? 0,
        attendance_count: ac[c.id] ?? 0,
        dept_count:       dc[c.id] ?? 0,
        class_count:      cc[c.id] ?? 0,
        live_lectures:    ll[c.id] ?? 0,
      })) as CollegeNode[];
    },
    staleTime: 60_000,
  });

  const toggle = (id: string) => setExpandedId((prev) => (prev === id ? null : id));

  // Platform-level totals
  const totals = (colleges ?? []).reduce(
    (acc, c) => ({
      students:   acc.students   + c.student_count,
      lectures:   acc.lectures   + c.lecture_count,
      attendance: acc.attendance + c.attendance_count,
      live:       acc.live       + c.live_lectures,
    }),
    { students: 0, lectures: 0, attendance: 0, live: 0 }
  );

  return (
    <div className="space-y-6">
      {/* Platform-level summary */}
      <div className="rounded-2xl border border-primary/20 bg-surface-1/60 backdrop-blur p-4 space-y-3">
        <div className="flex items-center gap-2">
          <LayoutGrid className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground">Campus Connect Platform</h3>
          {totals.live > 0 && (
            <Badge className="bg-danger/15 text-danger border-danger/20 text-[10px] gap-1">
              <Radio className="h-2.5 w-2.5 animate-pulse" />
              {totals.live} Live
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Colleges",   value: colleges?.length ?? 0,  icon: Building2 },
            { label: "Students",   value: totals.students,         icon: Users },
            { label: "Lectures",   value: totals.lectures,         icon: BookOpen },
            { label: "Attendance", value: totals.attendance,       icon: CheckSquare },
          ].map((s) => (
            <div key={s.label} className="flex flex-col items-center rounded-xl bg-surface-2/50 py-2.5 gap-1">
              <s.icon className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm font-bold text-foreground tabular-nums">{s.value.toLocaleString()}</span>
              <span className="text-[9px] text-muted-foreground">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* College nodes */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground">Institution Ecosystem</h3>
          <span className="text-xs text-muted-foreground">({colleges?.length ?? 0} colleges)</span>
        </div>

        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[60px] rounded-2xl" />
            ))
          : (colleges ?? []).map((college) => (
              <CollegeCard
                key={college.id}
                college={college}
                expanded={expandedId === college.id}
                onToggle={() => toggle(college.id)}
              />
            ))}
      </div>

      {/* Attendance Heatmap */}
      {!isLoading && colleges && colleges.length > 0 && (
        <AttendanceHeatmap colleges={colleges} />
      )}
    </div>
  );
}
