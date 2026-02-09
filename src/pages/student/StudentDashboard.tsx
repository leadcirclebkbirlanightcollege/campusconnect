import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  TrendingUp,
  Bell,
  CheckCircle,
  MailOpen,
  Clock,
  ListChecks,
  ExternalLink,
} from "lucide-react";

import UpcomingLectureCard from "@/components/lectures/UpcomingLectureCard";
import LiveAttendanceWidget from "@/components/attendance/LiveAttendanceWidget";
import RecentAttendanceCard from "@/components/attendance/RecentAttendanceCard";
import StudentProgrammesCard from "@/components/programmes/StudentProgrammesCard";
import { useRecentUpdate } from "@/hooks/use-recent-update";

type ProfileRow = {
  name: string;
};

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

type RecentAttendance = {
  id: string;
  marked_at: string;
  status: string;
  lecture_id: string;
};

function getTimeGreeting(now = new Date()) {
  const h = now.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

const StudentDashboard = () => {
  const { justUpdated, markUpdated } = useRecentUpdate();

  const [stats, setStats] = useState({
    totalPoints: 0,
    lecturesAttended: 0,
    upcomingLectures: 0,
    unreadNotifications: 0,
  });

  const [upcoming, setUpcoming] = useState<UpcomingLecture[]>([]);
  const [liveNow, setLiveNow] = useState<UpcomingLecture | null>(null);
  const [recentPoints, setRecentPoints] = useState<RecentPoint[]>([]);
  const [recentAttendance, setRecentAttendance] = useState<RecentAttendance[]>([]);

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

    const notificationsMetaChannel = supabase
      .channel("student_dashboard_notifications_meta")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => {
        // Pick up edits/cancellations that affect the inbox count.
        fetchDashboardStats();
      })
      .subscribe();

    const lecturesChannel = supabase
      .channel("student_dashboard_lectures")
      .on("postgres_changes", { event: "*", schema: "public", table: "lectures" }, () => {
        // Ensures LIVE/ENDED shows instantly (live badge + counts)
        fetchDashboardStats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(notificationsChannel);
      supabase.removeChannel(notificationsMetaChannel);
      supabase.removeChannel(lecturesChannel);
    };
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch basic profile name
      const { data: profile } = await supabase
        .from("profiles")
        .select("name")
        .eq("user_id", user.id)
        .maybeSingle<ProfileRow>();

      const friendlyName = profile?.name || "User";
      setName(friendlyName);

      // Fetch total points
      const { data: pointsData } = await supabase.from("points_ledger").select("points").eq("user_id", user.id);
      const totalPoints = pointsData?.reduce((sum, entry) => sum + entry.points, 0) || 0;

      // Fetch lectures attended
      const { data: attendanceData } = await supabase
        .from("attendance")
        .select("id")
        .eq("student_user_id", user.id)
        .eq("status", "present");

      // Fetch upcoming lectures
      const today = new Date().toISOString().split("T")[0];
      const { data: upcomingCountData } = await supabase.from("lectures").select("id").gte("lecture_date", today);

      // Fetch unread notifications
      const { data: notificationsData } = await supabase
        .from("notification_recipients")
        .select("notification_id")
        .eq("user_id", user.id)
        .is("read_at", null);

      const unreadNotificationIds = Array.from(
        new Set((notificationsData ?? []).map((r: any) => r.notification_id).filter(Boolean) as string[]),
      );

      let unreadNotificationsCount = unreadNotificationIds.length;
      if (unreadNotificationIds.length > 0) {
        const { data: notifMeta, error: notifMetaError } = await supabase
          .from("notifications")
          .select("id,status")
          .in("id", unreadNotificationIds);
        if (!notifMetaError) {
          unreadNotificationsCount = (notifMeta ?? []).filter((n: any) => n.status !== "cancelled").length;
        }
      }

      // Essential dashboard lists
      const { data: upcomingList } = await supabase
        .from("lectures")
        .select("id, topic, lecture_date, start_time, end_time, venue, flyer_object_path, status")
        .gte("lecture_date", today)
        .order("lecture_date", { ascending: true })
        .order("start_time", { ascending: true })
        .limit(3);

      const { data: liveList } = await supabase
        .from("lectures")
        .select("id, topic, lecture_date, start_time, end_time, venue, flyer_object_path, status")
        .eq("status", "live")
        .order("lecture_date", { ascending: true })
        .order("start_time", { ascending: true })
        .limit(1);

      const { data: recentPts } = await supabase
        .from("points_ledger")
        .select("id, created_at, points, source, note")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      const { data: recentAtt } = await supabase
        .from("attendance")
        .select("id, marked_at, status, lecture_id")
        .eq("student_user_id", user.id)
        .order("marked_at", { ascending: false })
        .limit(5);

      setUpcoming((upcomingList ?? []) as UpcomingLecture[]);
      setLiveNow(((liveList ?? [])[0] as UpcomingLecture | undefined) ?? null);
      setRecentPoints((recentPts ?? []) as RecentPoint[]);
      setRecentAttendance((recentAtt ?? []) as RecentAttendance[]);

      setStats({
        totalPoints,
        lecturesAttended: attendanceData?.length || 0,
        upcomingLectures: upcomingCountData?.length || 0,
        unreadNotifications: unreadNotificationsCount,
      });

      markUpdated();
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
    }
  };

  return (
    <div className="space-y-8">
      {/* Greeting Header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-premium bg-clip-text text-transparent">
            {greeting}, {name}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Welcome back to Campus Connect</p>
          {justUpdated && (
            <p className="mt-1 text-xs text-muted-foreground">Last updated just now</p>
          )}
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-premium transition-all border-primary/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Points</CardTitle>
            <div className="w-10 h-10 rounded-xl bg-gradient-premium flex items-center justify-center shadow-premium">
              <TrendingUp className="h-5 w-5 text-primary-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{stats.totalPoints}</div>
            <p className="text-xs text-muted-foreground mt-1">Keep attending to earn more!</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-accent transition-all border-accent/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lectures Attended</CardTitle>
            <div className="w-10 h-10 rounded-xl bg-gradient-accent flex items-center justify-center shadow-accent">
              <CheckCircle className="h-5 w-5 text-accent-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-accent">{stats.lecturesAttended}</div>
            <p className="text-xs text-muted-foreground mt-1">Great attendance record!</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-premium transition-all border-primary/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Lectures</CardTitle>
            <div className="w-10 h-10 rounded-xl bg-gradient-premium flex items-center justify-center shadow-premium">
              <Calendar className="h-5 w-5 text-primary-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{stats.upcomingLectures}</div>
            <p className="text-xs text-muted-foreground mt-1">Don't miss out!</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-accent transition-all border-accent/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Notifications</CardTitle>
            <div className="w-10 h-10 rounded-xl bg-gradient-accent flex items-center justify-center shadow-accent">
              <Bell className="h-5 w-5 text-accent-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-accent">{stats.unreadNotifications}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.unreadNotifications > 0 ? "You have unread messages" : "All caught up!"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* PROMINENT ATTENDANCE SECTION */}
      <div className="mt-8">
        <LiveAttendanceWidget />
      </div>

      {/* Campus Screening Portal Link */}
      <Card className="border-premium/20 bg-gradient-to-r from-premium/5 to-transparent">
        <CardContent className="flex items-center justify-between py-4">
          <div>
            <p className="font-medium text-premium">Campus Screening Portal</p>
            <p className="text-xs text-muted-foreground">Book your hall screenings</p>
          </div>
          <Button asChild variant="outline" size="sm" className="gap-2 border-premium/30 hover:bg-premium/10">
            <a href="https://campus-bookings.vercel.app/" target="_blank" rel="noopener noreferrer">
              Open Portal
              <ExternalLink className="h-3 w-3" />
            </a>
          </Button>
        </CardContent>
      </Card>

      {/* Learning Circles */}
      <StudentProgrammesCard />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-primary/10">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Upcoming Lectures
              </CardTitle>
              <CardDescription>Next sessions you should attend</CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to="/app/lectures">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {liveNow ? (
              <UpcomingLectureCard lecture={liveNow} to={`/app/lectures/${liveNow.id}`} className="shadow-sm" />
            ) : null}

            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No upcoming lectures. Stay tuned!</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {upcoming.map((l) => (
                  <UpcomingLectureCard key={l.id} lecture={l} to={`/app/lectures/${l.id}`} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Attendance Card */}
        <RecentAttendanceCard />

        {/* Recent Points */}
        <Card className="border-accent/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListChecks className="h-4 w-4" />
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
                  <li key={p.id} className="flex items-center justify-between rounded-xl border border-border/40 bg-card/40 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium">{p.source}</p>
                      <p className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleString()}</p>
                    </div>
                    <p className="text-sm font-semibold text-primary">{p.points > 0 ? `+${p.points}` : p.points}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StudentDashboard;
