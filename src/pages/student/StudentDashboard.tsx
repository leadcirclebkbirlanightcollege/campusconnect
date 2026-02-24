import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  TrendingUp,
  Clock,
  ArrowRight,
  Shield,
  Zap,
} from "lucide-react";

import { useStudentIntelligence } from "@/hooks/use-intelligence";
import { useGrowthInsights } from "@/hooks/use-growth-insights";
import { TIER_CONFIG } from "@/lib/intelligenceEngine";
import { Skeleton } from "@/components/ui/skeleton";

type UpcomingLecture = {
  id: string;
  topic: string;
  lecture_date: string;
  start_time: string;
  end_time: string;
  venue: string;
  status?: "scheduled" | "live" | "ended";
};
type RecentPoint = {
  id: string;
  created_at: string;
  points: number;
  source: string;
  note: string | null;
};

function getTimeGreeting(now = new Date()) {
  const h = now.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

const StudentDashboard = () => {
  const intelligence = useStudentIntelligence();
  const growth = useGrowthInsights();

  const [stats, setStats] = useState({
    totalPoints: 0,
    lecturesAttended: 0,
    totalLectures: 0,
    currentStreak: 0,
  });

  const [nextLecture, setNextLecture] = useState<UpcomingLecture | null>(null);
  const [liveNow, setLiveNow] = useState<UpcomingLecture | null>(null);
  const [recentPoints, setRecentPoints] = useState<RecentPoint[]>([]);
  const [name, setName] = useState("User");
  const [loading, setLoading] = useState(true);
  const greeting = useMemo(() => getTimeGreeting(), []);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [
        { data: profile },
        { data: pointsTotal },
        { data: attendanceData },
        { data: allLectures },
        { data: upcomingList },
        { data: liveList },
        { data: recentPts },
        { data: streakData },
      ] = await Promise.all([
        supabase.from("profiles").select("name").eq("user_id", user.id).maybeSingle(),
        supabase.rpc("get_my_points_total"),
        supabase.from("attendance").select("id").eq("student_user_id", user.id).eq("status", "present"),
        supabase.from("lectures").select("id"),
        supabase
          .from("lectures")
          .select("id, topic, lecture_date, start_time, end_time, venue, status")
          .gte("lecture_date", new Date().toISOString().split("T")[0])
          .neq("status", "ended")
          .order("lecture_date", { ascending: true })
          .order("start_time", { ascending: true })
          .limit(1),
        supabase
          .from("lectures")
          .select("id, topic, lecture_date, start_time, end_time, venue, status")
          .eq("status", "live")
          .limit(1),
        supabase
          .from("points_ledger")
          .select("id, created_at, points, source, note")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(8),
        supabase.rpc("get_my_streak"),
      ]);

      setName((profile as any)?.name || "User");

      const streak = streakData as any;
      setStats({
        totalPoints: Number(pointsTotal ?? 0),
        lecturesAttended: attendanceData?.length || 0,
        totalLectures: allLectures?.length || 0,
        currentStreak: streak?.current_streak ?? 0,
      });

      setLiveNow(((liveList ?? [])[0] as UpcomingLecture | undefined) ?? null);
      setNextLecture(((upcomingList ?? [])[0] as UpcomingLecture | undefined) ?? null);
      setRecentPoints((recentPts ?? []) as RecentPoint[]);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const tierData = intelligence.data ? TIER_CONFIG[intelligence.data.tier] : null;
  const attendancePct = stats.totalLectures > 0 ? Math.round((stats.lecturesAttended / stats.totalLectures) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <header>
        <h1 className="text-xl font-semibold text-foreground">
          {greeting}, {name}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">Welcome back to Campus Connect</p>
      </header>

      {/* Zone A — Academic Snapshot */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SnapshotCard
          label="Attendance"
          value={`${attendancePct}%`}
          sub={`${stats.lecturesAttended}/${stats.totalLectures}`}
          loading={loading}
        />
        <SnapshotCard
          label="Current Tier"
          value={tierData?.label ?? "—"}
          sub={intelligence.data ? `Score: ${intelligence.data.engagementIndex}` : "Loading"}
          loading={intelligence.isLoading}
        />
        <SnapshotCard
          label="Streak"
          value={`${stats.currentStreak}d`}
          sub="Consecutive days"
          loading={loading}
        />
        <SnapshotCard
          label="Total Points"
          value={String(stats.totalPoints)}
          sub="All time"
          loading={loading}
        />
      </div>

      {/* Zone B — Immediate Action */}
      {liveNow ? (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-2.5 w-2.5 rounded-full bg-success animate-pulse shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{liveNow.topic}</p>
                <p className="text-xs text-muted-foreground">{liveNow.venue} — {liveNow.start_time}</p>
              </div>
            </div>
            <Button asChild size="sm">
              <Link to={`/app/lectures/${liveNow.id}`}>
                Mark Attendance
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : nextLecture ? (
        <Card>
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3 min-w-0">
              <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">Next: {nextLecture.topic}</p>
                <p className="text-xs text-muted-foreground">
                  {nextLecture.lecture_date} at {nextLecture.start_time} — {nextLecture.venue}
                </p>
              </div>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to="/app/lectures">View</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* Zone C — Performance Overview */}
      {intelligence.data && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MetricPanel
            label="Attendance Consistency"
            value={intelligence.data.attendanceConsistency}
            description="How regularly you attend scheduled lectures"
          />
          <MetricPanel
            label="Behaviour Reliability"
            value={intelligence.data.behaviourReliability}
            description="Timeliness and pattern of your attendance marking"
          />
          <MetricPanel
            label="Engagement Index"
            value={intelligence.data.engagementIndex}
            description="Overall participation across platform activities"
          />
        </div>
      )}

      {/* Growth Insights */}
      {growth.data && <GrowthInsightsStrip data={growth.data} />}

      {/* Zone D — Activity Timeline */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
            <Button asChild variant="ghost" size="sm" className="text-xs gap-1 h-7">
              <Link to="/app/attendance">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {recentPoints.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No activity yet.</p>
          ) : (
            <div className="divide-y divide-border">
              {recentPoints.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm text-foreground">{p.source}</p>
                    <p className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className="text-sm font-medium text-foreground tabular-nums">
                    {p.points > 0 ? `+${p.points}` : p.points}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

/* Snapshot card for Zone A */
function SnapshotCard({ label, value, sub, loading }: { label: string; value: string; sub: string; loading: boolean }) {
  if (loading) {
    return (
      <Card>
        <CardContent className="py-4 space-y-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-7 w-12" />
          <Skeleton className="h-3 w-20" />
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardContent className="py-4">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-semibold text-foreground mt-1">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
      </CardContent>
    </Card>
  );
}

/* Performance metric panel for Zone C */
function MetricPanel({ label, value, description }: { label: string; value: number; description: string }) {
  const barColor = value >= 70 ? "bg-success" : value >= 40 ? "bg-warning" : "bg-destructive";
  return (
    <Card>
      <CardContent className="py-4 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-foreground">{label}</p>
          <span className="text-sm font-semibold text-foreground tabular-nums">{value}</span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div className={`h-full rounded-full ${barColor}`} style={{ width: `${value}%` }} />
        </div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

/* Growth insights strip */
function GrowthInsightsStrip({ data }: { data: any }) {
  const trendLabel = data.trend_direction === "improving" ? "Improving" : data.trend_direction === "declining" ? "Declining" : "Stable";
  const riskColor = data.risk_probability === "high" ? "text-destructive" : data.risk_probability === "medium" ? "text-warning" : "text-success";
  const projTier = TIER_CONFIG[data.projected_tier_next_month as keyof typeof TIER_CONFIG];

  return (
    <Card>
      <CardContent className="py-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">30-Day Attendance</p>
            <p className="text-lg font-semibold text-foreground mt-0.5">{data.last_30_day_attendance_pct}%</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Trend</p>
            <p className="text-lg font-semibold text-foreground mt-0.5">{trendLabel}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Projected Tier</p>
            <p className="text-lg font-semibold text-foreground mt-0.5">{projTier?.label ?? data.projected_tier_next_month}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Risk Level</p>
            <p className={`text-lg font-semibold mt-0.5 capitalize ${riskColor}`}>{data.risk_probability}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default StudentDashboard;
