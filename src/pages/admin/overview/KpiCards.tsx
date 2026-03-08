import { Users, GraduationCap, TrendingUp, ShieldCheck, AlertTriangle, Flame } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useMetricCountUp } from "@/components/ui/motion";

interface KpiCardsProps {
  students: number;
  programmes: number;
  avgAttendancePct: number;
  manualOverrides: number;
  attendanceToday: number;
  riskCount?: number;
  loading: boolean;
}

function KpiCard({
  label, context, value, suffix = "", icon: Icon, colorClass, bgClass, loading, index, trend,
}: {
  label: string; context: string; value: number; suffix?: string;
  icon: React.ElementType; colorClass: string; bgClass: string;
  loading: boolean; index: number; trend?: string;
}) {
  const counted = useMetricCountUp(loading ? 0 : value, 900 + index * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.06, ease: "easeOut" }}
      className="rounded-2xl border border-border-subtle bg-surface-1 p-5 shadow-xs dashboard-panel group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <p className="text-label uppercase tracking-widest text-muted-foreground">{label}</p>
          {loading ? (
            <Skeleton className="h-8 w-20 mt-1" />
          ) : (
            <p className="text-[28px] font-bold tracking-tight text-foreground tabular-nums leading-none mt-1">
              {counted}{suffix}
            </p>
          )}
          <p className="text-[11px] text-muted-foreground mt-1.5">{context}</p>
          {trend && !loading && (
            <p className={cn("text-[11px] font-medium mt-0.5", trend.startsWith("+") ? "text-success" : "text-muted-foreground")}>
              {trend}
            </p>
          )}
        </div>
        <div className={cn("rounded-xl p-2.5 shrink-0 transition-colors duration-150 group-hover:scale-110 transition-transform", bgClass)}>
          <Icon className={cn("h-5 w-5", colorClass)} />
        </div>
      </div>
    </motion.div>
  );
}

export default function KpiCards({ students, programmes, avgAttendancePct, manualOverrides, attendanceToday, riskCount = 0, loading }: KpiCardsProps) {
  const kpis = [
    {
      key: "students", label: "Total Students", context: "Registered & active",
      icon: Users, colorClass: "text-primary", bgClass: "bg-primary/10",
      value: students, trend: students > 0 ? "Active accounts" : undefined,
    },
    {
      key: "programmes", label: "Programmes", context: "Learning circles running",
      icon: GraduationCap, colorClass: "text-accent", bgClass: "bg-accent/10",
      value: programmes, trend: programmes > 0 ? `${programmes} active` : undefined,
    },
    {
      key: "attendanceToday", label: "Attendance Today", context: "Marks recorded today",
      icon: TrendingUp, colorClass: "text-success", bgClass: "bg-success/10",
      value: attendanceToday, trend: attendanceToday > 0 ? "+today" : "No records yet",
    },
    {
      key: "avgAttendancePct", label: "Avg. Attendance", context: "Current month rate",
      icon: Flame, colorClass: "text-warning", bgClass: "bg-warning/10",
      value: avgAttendancePct, suffix: "%",
      trend: avgAttendancePct >= 75 ? "On target" : avgAttendancePct >= 50 ? "Needs attention" : "Critical",
    },
    {
      key: "riskCount", label: "At-Risk Students", context: "Low engagement / attendance",
      icon: AlertTriangle, colorClass: "text-danger", bgClass: "bg-danger/10",
      value: riskCount, trend: riskCount > 0 ? `${riskCount} flagged` : "All clear",
    },
    {
      key: "manualOverrides", label: "Manual Overrides", context: "Admin adjustments",
      icon: ShieldCheck, colorClass: "text-premium", bgClass: "bg-premium/10",
      value: manualOverrides, trend: "Total adjustments",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
      {kpis.map((kpi, i) => (
        <KpiCard key={kpi.key} index={i} loading={loading} {...kpi} />
      ))}
    </div>
  );
}
