import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";

import { Users, BookOpen, CheckSquare, Bell, LayoutDashboard, ArrowRight, Settings, Shield, Coins } from "lucide-react";
import StudentManagementTab from "@/pages/admin/students/StudentManagementTab";
import LectureManagementTab from "@/pages/admin/lectures/LectureManagementTab";
import AdminAttendanceControlTab from "@/pages/admin/attendance/AdminAttendanceControlTab";
import AdminMonthlyAttendance from "@/pages/admin/attendance/AdminMonthlyAttendance";
import AdminNotificationCenterTab from "@/pages/admin/notifications/AdminNotificationCenterTab";
import SystemHealthPanel from "@/pages/admin/system/SystemHealthPanel";
import PointsRulesSettings from "@/pages/admin/system/PointsRulesSettings";
import AdminProfileSettings from "@/pages/admin/system/AdminProfileSettings";
import AdminPointsAdjustmentsTab from "@/pages/admin/system/AdminPointsAdjustmentsTab";

const AdminDashboard = () => {
  const location = useLocation();
  const [tab, setTab] = useState("overview");
  const isMobile = useIsMobile();

  const tabItems = useMemo(
    () => [
      { value: "overview", label: "Overview", icon: LayoutDashboard },
      { value: "students", label: "Students", icon: Users },
      { value: "lectures", label: "Lectures", icon: BookOpen },
      { value: "attendance", label: "Attendance", icon: CheckSquare },
      { value: "monthly", label: "Monthly", icon: CheckSquare },
      { value: "notifications", label: "Notifications", icon: Bell },
      { value: "points", label: "Points", icon: Coins },
      { value: "settings", label: "Settings", icon: Settings },
      { value: "admin_profile", label: "Admin", icon: Shield },
    ],
    [],
  );

  const { startIso, endIso, todayDate } = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return {
      startIso: start.toISOString(),
      endIso: end.toISOString(),
      todayDate: start.toISOString().slice(0, 10),
    };
  }, []);

  const statsQuery = useQuery({
    queryKey: ["admin", "overview", "stats", todayDate],
    queryFn: async () => {
      const [{ count: studentsCount, error: studentsError }, { count: lecturesCount, error: lecturesError }, { count: attendanceCount, error: attendanceError }] =
        await Promise.all([
          supabase
            .from("profiles")
            .select("id", { count: "exact", head: true })
            .eq("is_deleted", false),
          supabase
            .from("lectures")
            .select("id", { count: "exact", head: true })
            .gte("lecture_date", todayDate),
          supabase
            .from("attendance")
            .select("id", { count: "exact", head: true })
            .gte("marked_at", startIso)
            .lt("marked_at", endIso),
        ]);

      if (studentsError) throw studentsError;
      if (lecturesError) throw lecturesError;
      if (attendanceError) throw attendanceError;

      return {
        students: studentsCount ?? 0,
        lectures: lecturesCount ?? 0,
        attendanceToday: attendanceCount ?? 0,
      };
    },
  });

  const attendancePct = useMemo(() => {
    const s = statsQuery.data?.students ?? 0;
    const a = statsQuery.data?.attendanceToday ?? 0;
    if (!s) return 0;
    return Math.min(100, Math.round((a / s) * 100));
  }, [statsQuery.data]);

  useEffect(() => {
    if (location.hash === "#admin_profile") setTab("admin_profile");
    if (location.hash === "#points") setTab("points");
    if (location.hash === "#settings") setTab("settings");
  }, [location.hash]);

  return (
    <div className="container mx-auto px-0 sm:px-4 py-2 sm:py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold bg-gradient-premium bg-clip-text text-transparent mb-2">
          Admin Dashboard
        </h1>
        <p className="text-muted-foreground">Manage lectures, students, attendance, and notifications</p>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-6">
        {/* Mobile: dropdown selector */}
        {isMobile ? (
          <div className="px-4">
            <Select value={tab} onValueChange={setTab}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select section" />
              </SelectTrigger>
              <SelectContent>
                {tabItems.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <TabsList className="w-full max-w-5xl flex flex-wrap gap-2 h-auto bg-muted/60">
            {tabItems.map((t) => {
              const Icon = t.icon;
              return (
                <TabsTrigger key={t.value} value={t.value} className="gap-2 h-10">
                  <Icon className="w-4 h-4" />
                  {t.label}
                </TabsTrigger>
              );
            })}
          </TabsList>
        )}

        <TabsContent value="overview" className="px-4 sm:px-0">
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="border-primary/10 hover:shadow-premium transition-all">
              <CardHeader>
                <CardTitle className="text-lg">Total Students</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">
                  {statsQuery.isLoading ? "…" : statsQuery.data?.students ?? 0}
                </div>
              </CardContent>
            </Card>

            <Card className="border-accent/10 hover:shadow-accent transition-all">
              <CardHeader>
                <CardTitle className="text-lg">Active Lectures</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-accent">
                  {statsQuery.isLoading ? "…" : statsQuery.data?.lectures ?? 0}
                </div>
              </CardContent>
            </Card>

            <Card className="border-success/10 hover:shadow-lg transition-all">
              <CardHeader>
                <CardTitle className="text-lg">Attendance Today</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-success">{statsQuery.isLoading ? "…" : `${attendancePct}%`}</div>
              </CardContent>
            </Card>
           </div>

           <div className="mt-6 grid gap-6 lg:grid-cols-3">
             <Card className="border-primary/10">
               <CardHeader>
                 <CardTitle className="text-lg">Quick actions</CardTitle>
                 <CardDescription>Jump straight to the most-used admin tools.</CardDescription>
               </CardHeader>
               <CardContent className="grid gap-2 sm:grid-cols-2">
                 <Button type="button" variant="outline" className="justify-between" onClick={() => setTab("students")}>
                   Manage students
                   <ArrowRight className="h-4 w-4" />
                 </Button>
                 <Button type="button" variant="outline" className="justify-between" onClick={() => setTab("lectures")}>
                   Manage lectures
                   <ArrowRight className="h-4 w-4" />
                 </Button>
                 <Button type="button" variant="outline" className="justify-between" onClick={() => setTab("attendance")}>
                   Attendance control
                   <ArrowRight className="h-4 w-4" />
                 </Button>
                 <Button type="button" variant="outline" className="justify-between" onClick={() => setTab("notifications")}>
                   Notifications
                   <ArrowRight className="h-4 w-4" />
                 </Button>
               </CardContent>
             </Card>

             <Card className="border-primary/10">
               <CardHeader>
                 <CardTitle className="text-lg">Today’s snapshot</CardTitle>
                 <CardDescription>Counts refresh automatically as records change.</CardDescription>
               </CardHeader>
               <CardContent className="space-y-2 text-sm text-muted-foreground">
                 <div className="flex items-center justify-between">
                   <span>Attendance marks today</span>
                   <span className="font-medium text-foreground">
                     {statsQuery.isLoading ? "…" : statsQuery.data?.attendanceToday ?? 0}
                   </span>
                 </div>
                 <div className="flex items-center justify-between">
                   <span>Attendance rate</span>
                   <span className="font-medium text-foreground">{statsQuery.isLoading ? "…" : `${attendancePct}%`}</span>
                 </div>
               </CardContent>
             </Card>

             <SystemHealthPanel />
           </div>
         </TabsContent>

        <TabsContent value="students" className="px-4 sm:px-0">
          <StudentManagementTab />
        </TabsContent>

        <TabsContent value="lectures" className="px-4 sm:px-0">
          <LectureManagementTab />
        </TabsContent>

        <TabsContent value="attendance" className="px-4 sm:px-0">
          <AdminAttendanceControlTab />
        </TabsContent>

        <TabsContent value="monthly" className="px-4 sm:px-0">
          <AdminMonthlyAttendance />
        </TabsContent>

        <TabsContent value="notifications" className="px-4 sm:px-0">
          <AdminNotificationCenterTab />
        </TabsContent>

        <TabsContent value="points" className="px-4 sm:px-0">
          <AdminPointsAdjustmentsTab />
        </TabsContent>

        <TabsContent value="settings" className="px-4 sm:px-0">
          <div className="space-y-6">
            <PointsRulesSettings />
          </div>
        </TabsContent>

        <TabsContent value="admin_profile" className="px-4 sm:px-0">
          <AdminProfileSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;