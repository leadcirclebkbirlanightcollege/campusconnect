import { AlertTriangle, Sparkles, TrendingUp } from "lucide-react";

import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/lib/utils";

type LectureInsightsPanelProps = {
  attendanceRate: number;
  recentMissed: boolean;
  trendDirection: "improving" | "declining" | "stable";
};

export function LectureInsightsPanel({ attendanceRate, recentMissed, trendDirection }: LectureInsightsPanelProps) {
  const cards = [
    attendanceRate >= 75
      ? {
          icon: TrendingUp,
          title: "Strong lecture attendance",
          body: `You attended ${attendanceRate}% of recent sessions. Keep the momentum up.`,
          tone: "success",
        }
      : {
          icon: AlertTriangle,
          title: "Close to attendance threshold",
          body: "Attend upcoming classes to stay above the 75% requirement.",
          tone: "warning",
        },
    recentMissed
      ? {
          icon: AlertTriangle,
          title: "You missed the last lecture",
          body: "Join the next live session to recover your consistency quickly.",
          tone: "danger",
        }
      : {
          icon: Sparkles,
          title: "Recent sessions on track",
          body: "You stayed active in your latest lectures. Great discipline.",
          tone: "primary",
        },
    trendDirection === "improving"
      ? {
          icon: TrendingUp,
          title: "Attendance trend improving",
          body: "Your recent lecture participation is moving in the right direction.",
          tone: "success",
        }
      : trendDirection === "declining"
      ? {
          icon: AlertTriangle,
          title: "Attendance trend slipping",
          body: "Prioritize upcoming classes to prevent further decline.",
          tone: "warning",
        }
      : {
          icon: Sparkles,
          title: "Attendance trend stable",
          body: "Consistency is solid. Aim for one extra attended lecture this week.",
          tone: "primary",
        },
  ] as const;

  return (
    <div className="space-y-3">
      {cards.map((card, index) => (
        <GlassCard key={`${card.title}-${index}`} className="flex items-start gap-3" hover={false}>
          <div
            className={cn(
              "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
              card.tone === "success" && "bg-success/12 text-success",
              card.tone === "warning" && "bg-warning/12 text-warning",
              card.tone === "danger" && "bg-danger/12 text-danger",
              card.tone === "primary" && "bg-primary/12 text-primary",
            )}
          >
            <card.icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">{card.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{card.body}</p>
          </div>
        </GlassCard>
      ))}
    </div>
  );
}
