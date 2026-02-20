import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  TrendingUp,
  Bell,
  CheckCircle,
  Clock,
  ListChecks,
  ExternalLink,
  Trophy,
  CreditCard,
  ArrowRight,
  Sparkles,
  Megaphone,
  BarChart3,
  AlertTriangle,
  Shield,
} from "lucide-react";

import UpcomingLectureCard from "@/components/lectures/UpcomingLectureCard";
import LiveAttendanceWidget from "@/components/attendance/LiveAttendanceWidget";
import RecentAttendanceCard from "@/components/attendance/RecentAttendanceCard";
import StudentProgrammesCard from "@/components/programmes/StudentProgrammesCard";
import DashboardStatsRing from "@/pages/student/dashboard/DashboardStatsRing";
import { useRecentUpdate } from "@/hooks/use-recent-update";
import { useStudentIntelligence } from "@/hooks/use-intelligence";
import { useGrowthInsights } from "@/hooks/use-growth-insights";
import { TIER_CONFIG } from "@/lib/intelligenceEngine";

type ProfileRow = { name: string };
type UpcomingLecture = {
  id: string;
  topic: string;
  lecture_date: string;
  start_time: string;
  end_time: string;
  venue: string;
  flyer_object_path: string | null;
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
  const { justUpdated, markUpdated } = useRecentUpdate();
  const intelligence = useStudentIntelligence();

  const [stats, setStats] = useState({
    totalPoints: 0,
    lecturesAttended: 0,
    upcomingLectures: 0,
    unreadNotifications: 0,
    totalLectures: 0,
    leaderboardRank: 0,
  });

  const [upcoming, setUpcoming] = useState<UpcomingLecture[]>([]);
  const [liveNow, setLiveNow] = useState<UpcomingLecture | null>(null);
  const [recentPoints, setRecentPoints] = useState<RecentPoint[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [dailyContent, setDailyContent] = useState<any | null>(null);
  const [activePoll, setActivePoll] = useState<any | null>(null);

  const [name, setName] = useState<string>("User");
  const greeting = useMemo(() => getTimeGreeting(), []);

  useEffect(() => {
    fetchDashboardStats();

    const notificationsChannel = supabase
      .channel("student_dashboard_notifications")
      .on("postgres_changes", { event: "*", schema: "public", table: "notification_recipients" }, () => {
        fetchDashboardStats();
      })
      .subscribe();

    const lecturesChannel = supabase
      .channel("student_dashboard_lectures")
      .on("postgres_changes", { event: "*", schema: "public", table: "lectures" }, () => {
        fetchDashboardStats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(notificationsChannel);
      supabase.removeChannel(lecturesChannel);
    };
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const [
        { data: profile },
        { data: pointsTotal },
        { data: attendanceData },
        { data: upcomingCountData },
        { data: allLectures },
        { data: notificationsData },
        { data: upcomingList },
        { data: liveList },
        { data: recentPts },
        { data: announcementsData },
        { data: dailyData },
        { data: pollData },
      ] = await Promise.all([
        supabase.from("profiles").select("name").eq("user_id", user.id).maybeSingle<ProfileRow>(),
        supabase.rpc("get_my_points_total"),
        supabase.from("attendance").select("id").eq("student_user_id", user.id).eq("status", "present"),
        supabase.from("lectures").select("id").gte("lecture_date", new Date().toISOString().split("T")[0]),
        supabase.from("lectures").select("id"),
        supabase.from("notification_recipients").select("notification_id").eq("user_id", user.id).is("read_at", null),
        supabase
          .from("lectures")
          .select("id, topic, lecture_date, start_time, end_time, venue, flyer_object_path, status")
          .gte("lecture_date", new Date().toISOString().split("T")[0])
          .order("lecture_date", { ascending: true })
          .order("start_time", { ascending: true })
          .limit(3),
        supabase
          .from("lectures")
          .select("id, topic, lecture_date, start_time, end_time, venue, flyer_object_path, status")
          .eq("status", "live")
          .limit(1),
        supabase
          .from("points_ledger")
          .select("id, created_at, points, source, note")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("announcements")
          .select("id, title, priority, created_at")
          .order("is_pinned", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(3),
        supabase
          .from("daily_content")
          .select("id, content_type, title, body")
          .eq("is_active", true)
          .order("publish_date", { ascending: false })
          .limit(1),
        supabase
          .from("polls")
          .select("id, question, options")
          .order("created_at", { ascending: false })
          .limit(1),
      ]);

      setName(profile?.name || "User");
      const totalPoints = Number(pointsTotal ?? 0);

      // Leaderboard rank
      let rank = 0;
      try {
        const { data: lb } = await supabase.rpc("get_leaderboard", { p_limit: 100, p_verified_only: false });
        const entry = (lb ?? []).find((r: any) => r.user_id === user.id);
        rank = entry?.rank ?? 0;
      } catch {
        /* ignore */
      }

      // Filter notifications
      const unreadIds = Array.from(
        new Set((notificationsData ?? []).map((r: any) => r.notification_id).filter(Boolean) as string[]),
      );
      let unreadCount = unreadIds.length;
      if (unreadIds.length > 0) {
        const { data: notifMeta } = await supabase.from("notifications").select("id,status").in("id", unreadIds);
        if (notifMeta) unreadCount = notifMeta.filter((n: any) => n.status !== "cancelled").length;
      }

      setUpcoming((upcomingList ?? []) as UpcomingLecture[]);
      setLiveNow(((liveList ?? [])[0] as UpcomingLecture | undefined) ?? null);
      setRecentPoints((recentPts ?? []) as RecentPoint[]);
      setAnnouncements(announcementsData ?? []);
      setDailyContent((dailyData ?? [])[0] ?? null);
      setActivePoll((pollData ?? [])[0] ?? null);

      setStats({
        totalPoints,
        lecturesAttended: attendanceData?.length || 0,
        upcomingLectures: upcomingCountData?.length || 0,
        unreadNotifications: unreadCount,
        totalLectures: allLectures?.length || 0,
        leaderboardRank: rank,
      });

      markUpdated();
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
    }
  };

  const tierData = intelligence.data ? TIER_CONFIG[intelligence.data.tier] : null;

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <header>
        <h1 className="text-2xl font-bold text-foreground">
          {greeting}, {name}
        </h1>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-sm text-muted-foreground">Welcome back to Campus Connect</p>
          {tierData && (
            <Badge className={`${tierData.bg} ${tierData.color} ${tierData.border} border text-[10px] gap-1`}>
              <Shield className="h-3 w-3" />
              {tierData.label}
            </Badge>
          )}
        </div>
        {justUpdated && <p className="text-xs text-muted-foreground mt-0.5">Updated just now</p>}
      </header>

      {/* Risk Alert Banner */}
      {intelligence.data && intelligence.data.riskFlags.length > 0 && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="py-3 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-destructive">Attention Required</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {intelligence.data.riskFlags.join(" · ")}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Command Center Row */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/50 col-span-2 sm:col-span-1">
          <CardContent className="flex items-center justify-center py-5">
            <DashboardStatsRing
              value={stats.lecturesAttended}
              max={stats.totalLectures || 1}
              label="Attendance"
              sublabel={`${stats.lecturesAttended}/${stats.totalLectures} lectures`}
            />
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="pt-5 pb-4 flex flex-col items-center justify-center text-center">
            <div className="h-10 w-10 rounded-xl bg-gradient-premium flex items-center justify-center shadow-premium mb-2">
              <TrendingUp className="h-5 w-5 text-primary-foreground" />
            </div>
            <p className="text-2xl font-bold text-primary">{stats.totalPoints}</p>
            <p className="text-xs text-muted-foreground">Total Points</p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="pt-5 pb-4 flex flex-col items-center justify-center text-center">
            <div className="h-10 w-10 rounded-xl bg-gradient-accent flex items-center justify-center shadow-accent mb-2">
              <Trophy className="h-5 w-5 text-accent-foreground" />
            </div>
            <p className="text-2xl font-bold text-accent">
              {stats.leaderboardRank > 0 ? `#${stats.leaderboardRank}` : "—"}
            </p>
            <p className="text-xs text-muted-foreground">Leaderboard</p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="pt-5 pb-4 flex flex-col items-center justify-center text-center">
            <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center mb-2 relative">
              <Bell className="h-5 w-5 text-foreground" />
              {stats.unreadNotifications > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-bold">
                  {stats.unreadNotifications > 9 ? "9+" : stats.unreadNotifications}
                </span>
              )}
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.unreadNotifications}</p>
            <p className="text-xs text-muted-foreground">
              {stats.unreadNotifications > 0 ? "Unread" : "All clear"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Intelligence Scores */}
      {intelligence.data && (
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Intelligence Scores
            </CardTitle>
            <CardDescription>Your academic performance metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <ScoreBar label="Consistency" value={intelligence.data.attendanceConsistency} />
              <ScoreBar label="Reliability" value={intelligence.data.behaviourReliability} />
              <ScoreBar label="Engagement" value={intelligence.data.engagementIndex} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Growth Insights */}
      <GrowthInsightsPanel />

      {/* Live Attendance */}
      <LiveAttendanceWidget />

      {/* Daily Content + Active Poll row */}
      <div className="grid gap-4 sm:grid-cols-2">
        {dailyContent && (
          <Card className="border-border/50">
            <CardContent className="py-4 text-center space-y-2">
              <Badge variant="secondary" className="text-[10px]">
                {dailyContent.content_type === "meme" ? "😂 Meme of the Day" : "✨ Daily Suvichar"}
              </Badge>
              {dailyContent.title && <h4 className="text-sm font-medium text-foreground">{dailyContent.title}</h4>}
              {dailyContent.body && (
                <p className="text-sm text-muted-foreground italic leading-relaxed">"{dailyContent.body}"</p>
              )}
              <Button asChild variant="ghost" size="sm" className="text-xs gap-1">
                <Link to="/app/daily">
                  View all <ArrowRight className="h-3 w-3" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {activePoll && (
          <Card className="border-border/50">
            <CardContent className="py-4 space-y-2">
              <Badge variant="secondary" className="text-[10px] gap-1">
                <BarChart3 className="h-3 w-3" /> Active Poll
              </Badge>
              <h4 className="text-sm font-medium text-foreground line-clamp-2">{activePoll.question}</h4>
              <Button asChild variant="outline" size="sm" className="w-full text-xs gap-1">
                <Link to="/app/polls">
                  Vote Now <ArrowRight className="h-3 w-3" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Announcements Preview */}
      {announcements.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-primary" />
              Announcements
            </CardTitle>
            <Button asChild variant="ghost" size="sm" className="gap-1 text-xs">
              <Link to="/app/announcements">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {announcements.map((a: any) => (
              <div key={a.id} className="flex items-center justify-between rounded-lg border border-border/40 bg-card/40 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{a.title}</p>
                  <p className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleDateString()}</p>
                </div>
                {a.priority === "urgent" && (
                  <Badge variant="destructive" className="text-[10px] shrink-0">Urgent</Badge>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Quick Access Row */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <Button asChild variant="outline" className="h-auto flex-col gap-1.5 py-3">
          <Link to="/app/id-card">
            <CreditCard className="h-4 w-4 text-primary" />
            <span className="text-xs">Digital ID</span>
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-auto flex-col gap-1.5 py-3">
          <Link to="/app/attendance">
            <Calendar className="h-4 w-4 text-accent" />
            <span className="text-xs">Attendance</span>
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-auto flex-col gap-1.5 py-3">
          <Link to="/app/leaderboard">
            <Trophy className="h-4 w-4 text-premium" />
            <span className="text-xs">Leaderboard</span>
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-auto flex-col gap-1.5 py-3">
          <a href="https://campus-bookings.vercel.app/" target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs">Screening</span>
          </a>
        </Button>
      </div>

      {/* Learning Circles */}
      <StudentProgrammesCard />

      {/* Upcoming Lectures + Recent Attendance */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Upcoming Lectures
              </CardTitle>
              <CardDescription>Next sessions you should attend</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm" className="gap-1 text-xs">
              <Link to="/app/lectures">
                View all
                <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {liveNow ? (
              <UpcomingLectureCard lecture={liveNow} to={`/app/lectures/${liveNow.id}`} className="shadow-sm" />
            ) : null}

            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No upcoming lectures. Stay tuned!</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {upcoming.map((l) => (
                  <UpcomingLectureCard key={l.id} lecture={l} to={`/app/lectures/${l.id}`} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <RecentAttendanceCard />
      </div>

      {/* Recent Points */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-primary" />
            Recent Points
          </CardTitle>
          <CardDescription>Latest points activity</CardDescription>
        </CardHeader>
        <CardContent>
          {recentPoints.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No points activity yet.</p>
          ) : (
            <ul className="space-y-2">
              {recentPoints.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between rounded-lg border border-border/40 bg-card/40 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium">{p.source}</p>
                    <p className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleString()}</p>
                  </div>
                  <span className="text-sm font-semibold text-primary">
                    {p.points > 0 ? `+${p.points}` : p.points}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

/** Simple horizontal score bar */
function ScoreBar({ label, value }: { label: string; value: number }) {
  const color = value >= 70 ? "bg-success" : value >= 40 ? "bg-premium" : "bg-destructive";
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-xs font-semibold text-foreground">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

/** Growth Insights Panel — all data from server RPC */
function GrowthInsightsPanel() {
  const growth = useGrowthInsights();
  if (!growth.data) return null;

  const g = growth.data;
  const trendIcon = g.trend_direction === "improving" ? "📈" : g.trend_direction === "declining" ? "📉" : "➡️";
  const riskColor =
    g.risk_probability === "high" ? "text-destructive" : g.risk_probability === "medium" ? "text-premium" : "text-success";
  const projTier = TIER_CONFIG[g.projected_tier_next_month as keyof typeof TIER_CONFIG];

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Growth Insights
        </CardTitle>
        <CardDescription>30-day trends & projections (server-computed)</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="text-center space-y-1">
            <p className="text-2xl font-bold text-foreground">{g.last_30_day_attendance_pct}%</p>
            <p className="text-xs text-muted-foreground">30-Day Attendance</p>
          </div>
          <div className="text-center space-y-1">
            <p className="text-2xl font-bold text-foreground">{trendIcon}</p>
            <p className="text-xs text-muted-foreground capitalize">{g.trend_direction}</p>
          </div>
          <div className="text-center space-y-1">
            {projTier ? (
              <Badge className={`${projTier.bg} ${projTier.color} ${projTier.border} border text-xs`}>
                {projTier.label}
              </Badge>
            ) : (
              <p className="text-sm font-semibold capitalize">{g.projected_tier_next_month}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">Projected Tier</p>
          </div>
          <div className="text-center space-y-1">
            <p className={`text-lg font-bold capitalize ${riskColor}`}>{g.risk_probability}</p>
            <p className="text-xs text-muted-foreground">Risk Level</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default StudentDashboard;
