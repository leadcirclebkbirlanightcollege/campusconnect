import { Users, GraduationCap, TrendingUp, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface KpiCardsProps {
  students: number;
  programmes: number;
  avgAttendancePct: number;
  manualOverrides: number;
  loading: boolean;
}

const kpis = [
  {
    key: "students",
    label: "Total Students",
    context: "Registered & active",
    icon: Users,
    colorClass: "text-primary",
    bgClass: "bg-primary/10",
  },
  {
    key: "programmes",
    label: "Active Programmes",
    context: "Learning circles running",
    icon: GraduationCap,
    colorClass: "text-accent",
    bgClass: "bg-accent/10",
  },
  {
    key: "avgAttendancePct",
    label: "Avg. Attendance",
    context: "Current month rate",
    icon: TrendingUp,
    colorClass: "text-success",
    bgClass: "bg-success/10",
    suffix: "%",
  },
  {
    key: "manualOverrides",
    label: "Manual Overrides",
    context: "Admin adjustments",
    icon: ShieldCheck,
    colorClass: "text-premium",
    bgClass: "bg-premium/10",
  },
] as const;

export default function KpiCards({ students, programmes, avgAttendancePct, manualOverrides, loading }: KpiCardsProps) {
  const values: Record<string, number> = { students, programmes, avgAttendancePct, manualOverrides };

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        return (
          <Card key={kpi.key}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {kpi.label}
                  </p>
                  {loading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <p className="text-2xl font-bold tracking-tight text-foreground">
                      {values[kpi.key]}
                      {"suffix" in kpi ? kpi.suffix : ""}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">{kpi.context}</p>
                </div>
                <div className={`rounded-xl p-2.5 ${kpi.bgClass}`}>
                  <Icon className={`h-5 w-5 ${kpi.colorClass}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
