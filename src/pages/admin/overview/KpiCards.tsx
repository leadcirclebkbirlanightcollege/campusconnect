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
  label, context, value, suffix = "", icon: Icon, colorClass, bgClass, loading, index, trend, danger,
}: {
  label: string; context: string; value: number; suffix?: string;
  icon: React.ElementType; colorClass: string; bgClass: string;
  loading: boolean; index: number; trend?: string; danger?: boolean;
}) {
  const counted = useMetricCountUp(loading ? 0 : value, 900 + index * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay: index * 0.05, ease: "easeOut" }}
      className={cn(
        "rounded-xl border bg-surface-1 p-4 sm:p-5 shadow-xs transition-all duration-150 active:scale-[0.98] min-h-[120px] flex flex-col justify-between",
        danger ? "border-danger/30 bg-danger/5" : "border-border-subtle"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground leading-none">{label}</p>
        <div className={cn("rounded-lg p-2 shrink-0", bgClass)}>
          <Icon className={cn("h-4 w-4", colorClass)} />
        </div>
      </div>

      <div>
        {loading ? (
          <Skeleton className="h-9 w-20 mt-2" />
        ) : (
          <p className={cn(
            "text-4xl font-bold tracking-tight tabular-nums leading-none mt-2",
            danger && value > 0 ? "text-danger" : "text-foreground"
          )}>
            {counted}{suffix}
          </p>
        )}
        {!loading && (
          <p className={cn(
            "text-xs mt-1.5 leading-tight",
            danger && value > 0 ? "text-danger/70" : "text-muted-foreground"
          )}>
            {trend ?? context}
          </p>
        )}
      </div>
    </motion.div>
  );
}

export default function KpiCards({ students, programmes, avgAttendancePct, manualOverrides, attendanceToday, riskCount = 0, loading }: KpiCardsProps) {
  const kpis = [
    {
      key: "students", label: "Total Students", context: "Registered & active",
      icon: Users, colorClass: "text-primary", bgClass: "bg-primary/10",
      value: students, trend: "Active accounts",
    },
    {
      key: "programmes", label: "Programmes", context: "Learning circles running",
      icon: GraduationCap, colorClass: "text-accent", bgClass: "bg-accent/10",
      value: programmes, trend: programmes > 0 ? `${programmes} active` : "None yet",
    },
    {
      key: "attendanceToday", label: "Attendance Today", context: "Marks recorded today",
      icon: TrendingUp, colorClass: "text-success", bgClass: "bg-success/10",
      value: attendanceToday, trend: attendanceToday > 0 ? "Recorded today" : "No records yet",
    },
    {
      key: "avgAttendancePct", label: "Avg. Attendance", context: "This month",
      icon: Flame, colorClass: "text-warning", bgClass: "bg-warning/10",
      value: avgAttendancePct, suffix: "%",
      trend: avgAttendancePct >= 75 ? "On target" : avgAttendancePct >= 50 ? "Needs attention" : "Critical",
    },
    {
      key: "riskCount", label: "At-Risk Students", context: "Low engagement or attendance",
      icon: AlertTriangle, colorClass: "text-danger", bgClass: "bg-danger/10",
      value: riskCount, trend: riskCount > 0 ? `${riskCount} flagged` : "All clear",
      danger: true,
    },
    {
      key: "manualOverrides", label: "Manual Overrides", context: "Admin adjustments total",
      icon: ShieldCheck, colorClass: "text-premium", bgClass: "bg-premium/10",
      value: manualOverrides, trend: "Total adjustments",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {kpis.map((kpi, i) => (
        <KpiCard key={kpi.key} index={i} loading={loading} {...kpi} />
      ))}
    </div>
  );
}
