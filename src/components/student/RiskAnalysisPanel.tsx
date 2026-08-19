/**
 * PHASE 2 — Risk Analysis Panel
 * Displays risk level, reasons, and actionable suggestions.
 */
import { useGrowthInsights } from "@/hooks/use-growth-insights";
import { useStudentIntelligence } from "@/hooks/use-intelligence";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  ShieldCheck, ShieldAlert, ShieldX,
  AlertTriangle, CheckCircle2, ArrowRight, Lightbulb,
} from "@/components/icons";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useMemo } from "react";

type Risk = "low" | "medium" | "high";

const RISK_CONFIG: Record<Risk, {
  label: string; icon: typeof ShieldCheck;
  border: string; bg: string; color: string; headerBg: string;
}> = {
  low: {
    label: "Low Risk",
    icon: ShieldCheck,
    border: "border-success/25",
    bg: "bg-success/5",
    color: "text-success",
    headerBg: "bg-success/8",
  },
  medium: {
    label: "Moderate Risk",
    icon: ShieldAlert,
    border: "border-warning/25",
    bg: "bg-warning/5",
    color: "text-warning",
    headerBg: "bg-warning/8",
  },
  high: {
    label: "High Risk",
    icon: ShieldX,
    border: "border-danger/25",
    bg: "bg-danger/5",
    color: "text-danger",
    headerBg: "bg-danger/8",
  },
};

function getRiskReasons(risk: Risk, riskFlags: string[], attendancePct: number, trend: string): string[] {
  const reasons: string[] = [];
  if (attendancePct < 50) reasons.push(`Attendance at ${attendancePct}% — critically low`);
  else if (attendancePct < 75) reasons.push(`Attendance at ${attendancePct}% — below the 75% threshold`);
  if (trend === "declining") reasons.push("Attendance trending downward this month");
  riskFlags.forEach(f => {
    const display = f.replace(/_/g, " ").toLowerCase();
    reasons.push(`Flag: ${display}`);
  });
  if (risk === "low" && reasons.length === 0) {
    reasons.push("Attendance is healthy");
    reasons.push("Consistent participation recorded");
  }
  return reasons.slice(0, 4);
}

function getSuggestions(risk: Risk, attendancePct: number): string[] {
  if (risk === "high") return [
    "Attend the next 3 consecutive lectures to begin recovery",
    "Contact your class coordinator for support",
    "Ensure daily check-ins to earn points toward tier",
  ];
  if (risk === "medium") return [
    "Maintain 75%+ attendance to stay on track",
    "Keep your daily check-in streak going",
    "Review missed lecture notes to stay caught up",
  ];
  return [
    "Keep up your excellent consistency!",
    attendancePct >= 90 ? "Outstanding! You're in the top attendance tier" : "Attend upcoming lectures to push above 90%",
    "You're on track — maintain your current pace",
  ];
}

export default function RiskAnalysisPanel() {
  const growth = useGrowthInsights();
  const intel = useStudentIntelligence();

  const risk = (growth.data?.risk_probability ?? "low") as Risk;
  const cfg = RISK_CONFIG[risk];
  const Icon = cfg.icon;

  const reasons = useMemo(() => getRiskReasons(
    risk,
    intel.data?.riskFlags ?? [],
    growth.data?.last_30_day_attendance_pct ?? 0,
    growth.data?.trend_direction ?? "stable",
  ), [risk, intel.data, growth.data]);

  const suggestions = useMemo(() => getSuggestions(
    risk,
    growth.data?.last_30_day_attendance_pct ?? 0,
  ), [risk, growth.data]);

  const isLoading = growth.isLoading;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: 0.06 }}
      className={cn("rounded-2xl border overflow-hidden shadow-sm", cfg.border, cfg.bg)}
    >
      {/* Header */}
      <div className={cn("flex items-center justify-between px-5 py-4 border-b", cfg.border, cfg.headerBg)}>
        <div className="flex items-center gap-2.5">
          <div className={cn("h-8 w-8 rounded-xl flex items-center justify-center", cfg.color, "bg-current/10")}>
            <Icon className={cn("h-4 w-4", cfg.color)} />
          </div>
          <div>
            <p className="text-[14px] font-semibold text-foreground">Risk Analysis</p>
            <p className="text-[11px] text-muted-foreground">Academic standing assessment</p>
          </div>
        </div>
        {!isLoading && (
          <span className={cn(
            "px-3 py-1.5 rounded-xl text-[11px] font-bold border uppercase tracking-wide",
            cfg.color, cfg.border, cfg.headerBg,
          )}>
            {cfg.label}
          </span>
        )}
      </div>

      <div className="px-5 py-4 space-y-4">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-3 w-4/5" />
          </div>
        ) : (
          <>
            {/* Reasons */}
            <div>
              <div className="flex items-center gap-1.5 mb-2.5">
                <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-[12px] font-semibold text-foreground uppercase tracking-wider">Assessment</p>
              </div>
              <div className="space-y-1.5">
                {reasons.map((r, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className={cn("h-1.5 w-1.5 rounded-full mt-1.5 shrink-0", cfg.color.replace("text-", "bg-"))} />
                    <p className="text-[12px] text-muted-foreground leading-snug">{r}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Suggestions */}
            <div className="border-t border-current/10 pt-4">
              <div className="flex items-center gap-1.5 mb-2.5">
                <Lightbulb className="h-3.5 w-3.5 text-primary" />
                <p className="text-[12px] font-semibold text-foreground uppercase tracking-wider">Suggestions</p>
              </div>
              <div className="space-y-2">
                {suggestions.map((s, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.07 }}
                    className="flex items-start gap-2"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                    <p className="text-[12px] text-foreground leading-snug">{s}</p>
                  </motion.div>
                ))}
              </div>
            </div>

            {risk !== "low" && (
              <Button asChild size="sm" className="w-full gap-2 rounded-xl h-10 mt-1">
                <Link to="/app/lectures">
                  View Upcoming Lectures <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}
