import { useEffect, useState } from "react";
import { useLiveLecture } from "@/hooks/use-live-lecture";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Radio, ArrowRight, Clock } from "lucide-react";

interface Props {
  attendanceToday: number;
  totalStudents: number;
  loading: boolean;
  onGoToAttendance: () => void;
}

function useCountdown(endTime: string | undefined, lectureDate: string | undefined) {
  const [remaining, setRemaining] = useState("");

  useEffect(() => {
    if (!endTime || !lectureDate) return;

    const tick = () => {
      const end = new Date(`${lectureDate}T${endTime}`);
      const diff = end.getTime() - Date.now();
      if (diff <= 0) {
        setRemaining("Ending soon");
        return;
      }
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setRemaining(`${mins}m ${secs}s remaining`);
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endTime, lectureDate]);

  return remaining;
}

export default function LiveOperationsPanel({ attendanceToday, totalStudents, loading, onGoToAttendance }: Props) {
  const { data: liveLecture, isLoading: lectureLoading } = useLiveLecture();
  const countdown = useCountdown(liveLecture?.end_time, liveLecture?.lecture_date);

  const pct = totalStudents > 0 ? Math.min(100, Math.round((attendanceToday / totalStudents) * 100)) : 0;

  const isLive = !!liveLecture;

  return (
    <Card className={isLive ? "ring-2 ring-success/40" : ""}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-foreground">Today's Status</CardTitle>
          {isLive && (
            <Badge className="bg-success text-success-foreground gap-1.5 animate-pulse">
              <Radio className="h-3 w-3" />
              Live
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Lecture info */}
        {lectureLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-28" />
          </div>
        ) : isLive ? (
          <div className="space-y-1">
            <p className="text-lg font-semibold text-foreground">{liveLecture.topic}</p>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span>{liveLecture.venue}</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {countdown}
              </span>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">No lecture is live right now</p>
            <p className="text-xs text-muted-foreground">Attendance will appear here when a lecture goes live.</p>
          </div>
        )}

        {/* Attendance progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Attendance today</span>
            <span className="font-medium text-foreground">
              {loading ? "..." : `${attendanceToday} / ${totalStudents}`}
            </span>
          </div>
          <Progress value={loading ? 0 : pct} className="h-2" />
          <p className="text-xs text-muted-foreground text-right">{loading ? "..." : `${pct}% marked`}</p>
        </div>

        {/* CTA */}
        <Button
          className="w-full gap-2"
          size="lg"
          onClick={onGoToAttendance}
        >
          Go to Attendance Control
          <ArrowRight className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
