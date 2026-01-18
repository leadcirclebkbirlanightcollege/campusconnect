import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

import { Users, BookOpen, CheckSquare, Bell, LayoutDashboard, ArrowRight, Settings, Shield } from "lucide-react";
import StudentManagementTab from "@/pages/admin/students/StudentManagementTab";
import LectureManagementTab from "@/pages/admin/lectures/LectureManagementTab";
import AdminAttendanceControlTab from "@/pages/admin/attendance/AdminAttendanceControlTab";
import AdminNotificationCenterTab from "@/pages/admin/notifications/AdminNotificationCenterTab";
import SystemHealthPanel from "@/pages/admin/system/SystemHealthPanel";
import PointsRulesSettings from "@/pages/admin/system/PointsRulesSettings";
import AdminProfileSettings from "@/pages/admin/system/AdminProfileSettings";

const AdminDashboard = () => {
  const [tab, setTab] = useState("overview");

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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold bg-gradient-premium bg-clip-text text-transparent mb-2">
          Admin Dashboard
        </h1>
        <p className="text-muted-foreground">Manage lectures, students, attendance, and notifications</p>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-6">
        <TabsList className="grid grid-cols-7 w-full max-w-4xl">
          <TabsTrigger value="overview" className="gap-2">
            <LayoutDashboard className="w-4 h-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="students" className="gap-2">
            <Users className="w-4 h-4" />
            Students
          </TabsTrigger>
          <TabsTrigger value="lectures" className="gap-2">
            <BookOpen className="w-4 h-4" />
            Lectures
          </TabsTrigger>
          <TabsTrigger value="attendance" className="gap-2">
            <CheckSquare className="w-4 h-4" />
            Attendance
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="w-4 h-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="w-4 h-4" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="admin_profile" className="gap-2">
            <Shield className="w-4 h-4" />
            Admin
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
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

        <TabsContent value="students">
          <StudentManagementTab />
        </TabsContent>

        <TabsContent value="lectures">
          <LectureManagementTab />
        </TabsContent>

        <TabsContent value="attendance">
          <AdminAttendanceControlTab />
        </TabsContent>

        <TabsContent value="notifications">
          <AdminNotificationCenterTab />
        </TabsContent>

        <TabsContent value="settings">
          <div className="space-y-6">
            <PointsRulesSettings />
          </div>
        </TabsContent>

        <TabsContent value="admin_profile">
          <AdminProfileSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;