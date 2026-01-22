import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  TrendingUp,
  Bell,
  CheckCircle,
  MailOpen,
  LogOut,
  QrCode,
  Clock,
  ListChecks,
} from "lucide-react";

import LiveBadge from "@/components/lectures/LiveBadge";

type ProfileRow = {
  name: string;
};

type UpcomingLecture = {
  id: string;
  topic: string;
  lecture_date: string;
  start_time: string;
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
  const navigate = useNavigate();

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

    const lecturesChannel = supabase
      .channel("student_dashboard_lectures")
      .on("postgres_changes", { event: "*", schema: "public", table: "lectures" }, () => {
        // Ensures LIVE/ENDED shows instantly (live badge + counts)
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
        .select("id")
        .eq("user_id", user.id)
        .is("read_at", null);

      // Essential dashboard lists
      const { data: upcomingList } = await supabase
        .from("lectures")
        .select("id, topic, lecture_date, start_time, venue, status")
        .gte("lecture_date", today)
        .order("lecture_date", { ascending: true })
        .order("start_time", { ascending: true })
        .limit(3);

      const { data: liveList } = await supabase
        .from("lectures")
        .select("id, topic, lecture_date, start_time, venue, status")
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
        unreadNotifications: notificationsData?.length || 0,
      });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-premium bg-clip-text text-transparent mb-2">Student Dashboard</h1>
          <p className="text-muted-foreground">
            {greeting}, {name}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-premium transition-all border-primary/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Points</CardTitle>
            <div className="w-10 h-10 rounded-xl bg-gradient-premium flex items-center justify-center shadow-premium">
              <TrendingUp className="h-5 w-5 text-white" />
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
              <CheckCircle className="h-5 w-5 text-white" />
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
              <Calendar className="h-5 w-5 text-white" />
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
              <Bell className="h-5 w-5 text-white" />
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

      <Card className="mt-8 border-primary/10">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks you can perform</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground text-sm">
            Open your inbox for announcements, scan attendance quickly, browse upcoming lectures, or update your profile.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" className="gap-2">
              <Link to="/student/inbox">
                <MailOpen className="h-4 w-4" />
                Inbox
              </Link>
            </Button>
            <Button asChild variant="outline" className="gap-2">
              <Link to="/student/scan">
                <QrCode className="h-4 w-4" />
                Scan Attendance
              </Link>
            </Button>
            <Button asChild variant="outline" className="gap-2">
              <Link to="/lectures">
                <Calendar className="h-4 w-4" />
                Lectures
              </Link>
            </Button>
            <Button asChild variant="outline" className="gap-2">
              <Link to="/student/profile">
                <CheckCircle className="h-4 w-4" />
                Profile
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
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
              <Link to="/lectures">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {liveNow ? (
              <div className="rounded-xl border border-border/40 bg-card/40 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{liveNow.topic}</p>
                      <LiveBadge />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {liveNow.lecture_date} • {liveNow.start_time} • {liveNow.venue}
                    </p>
                  </div>
                  <Button asChild variant="secondary" size="sm">
                    <Link to={`/lectures/${liveNow.id}`}>Open</Link>
                  </Button>
                </div>
              </div>
            ) : null}

            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming lectures found.</p>
            ) : (
              <ul className="space-y-3">
                {upcoming.map((l) => (
                  <li key={l.id} className="rounded-xl border border-border/40 bg-card/40 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{l.topic}</p>
                          {l.status === "live" ? <LiveBadge /> : null}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {l.lecture_date} • {l.start_time} • {l.venue}
                        </p>
                      </div>
                      <Button asChild variant="secondary" size="sm">
                        <Link to={`/lectures/${l.id}`}>Open</Link>
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="border-accent/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListChecks className="h-4 w-4" />
              Recent Activity
            </CardTitle>
            <CardDescription>Latest points and attendance updates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">Points</p>
              {recentPoints.length === 0 ? (
                <p className="text-sm text-muted-foreground">No points activity yet.</p>
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
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Attendance</p>
              {recentAttendance.length === 0 ? (
                <p className="text-sm text-muted-foreground">No attendance marked yet.</p>
              ) : (
                <ul className="space-y-2">
                  {recentAttendance.map((a) => (
                    <li key={a.id} className="flex items-center justify-between rounded-xl border border-border/40 bg-card/40 px-4 py-3">
                      <div>
                        <p className="text-sm font-medium">{a.status}</p>
                        <p className="text-xs text-muted-foreground">{new Date(a.marked_at).toLocaleString()}</p>
                      </div>
                      <Button asChild variant="outline" size="sm">
                        <Link to="/attendance">Details</Link>
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StudentDashboard;
