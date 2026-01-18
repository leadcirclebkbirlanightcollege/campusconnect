import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, BookOpen, CheckSquare, Bell, LayoutDashboard } from "lucide-react";
import StudentManagementTab from "@/pages/admin/students/StudentManagementTab";
import LectureManagementTab from "@/pages/admin/lectures/LectureManagementTab";
import AdminAttendanceControlTab from "@/pages/admin/attendance/AdminAttendanceControlTab";
import AdminNotificationCenterTab from "@/pages/admin/notifications/AdminNotificationCenterTab";


const AdminDashboard = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold bg-gradient-premium bg-clip-text text-transparent mb-2">
          Admin Dashboard
        </h1>
        <p className="text-muted-foreground">Manage lectures, students, attendance, and notifications</p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid grid-cols-5 w-full max-w-2xl">
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
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="border-primary/10 hover:shadow-premium transition-all">
              <CardHeader>
                <CardTitle className="text-lg">Total Students</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">0</div>
              </CardContent>
            </Card>

            <Card className="border-accent/10 hover:shadow-accent transition-all">
              <CardHeader>
                <CardTitle className="text-lg">Active Lectures</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-accent">0</div>
              </CardContent>
            </Card>

            <Card className="border-success/10 hover:shadow-lg transition-all">
              <CardHeader>
                <CardTitle className="text-lg">Attendance Today</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-success">0%</div>
              </CardContent>
            </Card>
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
      </Tabs>
    </div>
  );
};

export default AdminDashboard;