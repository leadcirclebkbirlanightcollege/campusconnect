import { Users, GraduationCap, TrendingUp, ShieldCheck, AlertTriangle, Flame, BookOpen, Zap } from "@/components/icons";
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
  totalLectures?: number;
  totalPoints?: number;
  loading: boolean;
}

function KpiCard({
  label, value, suffix = "", icon: Icon, colorClass, bgClass, loading, index, trend, danger,
}: {
  label: string; value: number; suffix?: string;
  icon: React.ElementType; colorClass: string; bgClass: string;
  loading: boolean; index: number; trend?: string; danger?: boolean;
}) {
  const counted = useMetricCountUp(loading ? 0 : value, 900 + index * 80);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.045, ease: "easeOut" }}
      className={cn(
        "rounded-2xl border bg-surface-1 p-4 shadow-xs flex flex-col justify-between min-h-[116px] transition-all duration-150 hover:shadow-sm active:scale-[0.98]",
        danger && value > 0 ? "border-danger/30 bg-danger/5" : "border-border-subtle",
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground leading-none">{label}</p>
        <div className={cn("h-8 w-8 rounded-xl flex items-center justify-center shrink-0", bgClass)}>
          <Icon className={cn("h-4 w-4", colorClass)} />
        </div>
      </div>

      <div>
        {loading ? (
          <Skeleton className="h-9 w-20" />
        ) : (
          <p className={cn(
            "text-[36px] font-black tracking-tight tabular-nums leading-none",
            danger && value > 0 ? "text-danger" : "text-foreground",
          )}>
            {counted.toLocaleString()}{suffix}
          </p>
        )}
        {!loading && trend && (
          <p className={cn(
            "text-[11px] mt-1.5 leading-tight font-medium",
            danger && value > 0 ? "text-danger/70" : "text-muted-foreground",
          )}>
            {trend}
          </p>
        )}
      </div>
    </motion.div>
  );
}

export default function KpiCards({
  students, programmes, avgAttendancePct, manualOverrides,
  attendanceToday, riskCount = 0, totalLectures = 0, totalPoints = 0, loading,
}: KpiCardsProps) {
  const kpis = [
    {
      key: "students",
      label: "Total Students",
      icon: Users, colorClass: "text-primary", bgClass: "bg-primary/10",
      value: students,
      trend: students > 0 ? `${students} registered` : "No students yet",
    },
    {
      key: "lectures",
      label: "Total Lectures",
      icon: BookOpen, colorClass: "text-accent", bgClass: "bg-accent/10",
      value: totalLectures,
      trend: totalLectures > 0 ? `${totalLectures} scheduled` : "None created yet",
    },
    {
      key: "attendanceToday",
      label: "Attendance Today",
      icon: TrendingUp, colorClass: "text-success", bgClass: "bg-success/10",
      value: attendanceToday,
      trend: attendanceToday > 0 ? "Records today" : "No records yet",
    },
    {
      key: "programmes",
      label: "Programmes",
      icon: GraduationCap, colorClass: "text-premium", bgClass: "bg-premium/10",
      value: programmes,
      trend: programmes > 0 ? `${programmes} active circles` : "None yet",
    },
    {
      key: "totalPoints",
      label: "Points Awarded",
      icon: Zap, colorClass: "text-warning", bgClass: "bg-warning/10",
      value: totalPoints,
      trend: "All-time total",
    },
    {
      key: "riskCount",
      label: "At-Risk Students",
      icon: AlertTriangle, colorClass: "text-danger", bgClass: "bg-danger/10",
      value: riskCount,
      trend: riskCount > 0 ? `${riskCount} need attention` : "✓ All clear",
      danger: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
      {kpis.map((kpi, i) => (
        <KpiCard key={kpi.key} index={i} loading={loading} {...kpi} />
      ))}
    </div>
  );
}
