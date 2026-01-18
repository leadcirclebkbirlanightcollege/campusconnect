import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, TrendingUp, Bell, CheckCircle, MailOpen, LogOut, QrCode } from "lucide-react";

type ProfileRow = {
  name: string;
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

  const [name, setName] = useState<string>("User");
  const greeting = useMemo(() => getTimeGreeting(), []);

  useEffect(() => {
    fetchDashboardStats();

    const channel = supabase
      .channel("student_dashboard_notifications")
      .on("postgres_changes", { event: "*", schema: "public", table: "notification_recipients" }, () => {
        fetchDashboardStats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
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
      const { data: upcomingData } = await supabase.from("lectures").select("id").gte("lecture_date", today);

      // Fetch unread notifications
      const { data: notificationsData } = await supabase
        .from("notification_recipients")
        .select("id")
        .eq("user_id", user.id)
        .is("read_at", null);

      setStats({
        totalPoints,
        lecturesAttended: attendanceData?.length || 0,
        upcomingLectures: upcomingData?.length || 0,
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
              Open your inbox for announcements, scan attendance quickly, browse upcoming lectures, or update your
              profile.
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
    </div>
  );
};

export default StudentDashboard;
