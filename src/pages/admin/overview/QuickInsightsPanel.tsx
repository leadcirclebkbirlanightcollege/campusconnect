import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, ShieldCheck, QrCode } from "@/components/icons";

interface Props {
  attendanceToday: number;
  manualOverrides: number;
  loading: boolean;
}

export default function QuickInsightsPanel({ attendanceToday, manualOverrides, loading }: Props) {
  return (
    <Card className="border-border/60 h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-foreground">Quick Insights</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Attendance trend */}
        <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
          <div className="rounded-lg bg-success/10 p-2">
            <TrendingUp className="h-4 w-4 text-success" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Marked today</p>
            {loading ? (
              <Skeleton className="mt-1 h-5 w-12" />
            ) : (
              <p className="text-lg font-bold text-foreground">{attendanceToday}</p>
            )}
          </div>
        </div>

        {/* Manual overrides */}
        <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
          <div className="rounded-lg bg-premium/10 p-2">
            <ShieldCheck className="h-4 w-4 text-premium" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Manual overrides</p>
            {loading ? (
              <Skeleton className="mt-1 h-5 w-12" />
            ) : (
              <p className="text-lg font-bold text-foreground">{manualOverrides}</p>
            )}
          </div>
        </div>

        {/* QR vs OTP */}
        <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <QrCode className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Primary method</p>
            <p className="text-sm font-semibold text-foreground">QR + OTP</p>
            <p className="text-xs text-muted-foreground">Full analytics in Reports</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
