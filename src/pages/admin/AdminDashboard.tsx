import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useIsMobile } from "@/hooks/use-mobile";

import { Users, BookOpen, CheckSquare, Bell, LayoutDashboard, Settings, Shield, Coins, GraduationCap } from "lucide-react";
import AdminOverviewTab from "@/pages/admin/overview/AdminOverviewTab";
import StudentManagementTab from "@/pages/admin/students/StudentManagementTab";
import LectureManagementTab from "@/pages/admin/lectures/LectureManagementTab";
import AdminAttendanceControlTab from "@/pages/admin/attendance/AdminAttendanceControlTab";
import AdminMonthlyAttendance from "@/pages/admin/attendance/AdminMonthlyAttendance";
import AdminNotificationCenterTab from "@/pages/admin/notifications/AdminNotificationCenterTab";
import PointsRulesSettings from "@/pages/admin/system/PointsRulesSettings";
import AdminProfileSettings from "@/pages/admin/system/AdminProfileSettings";
import AdminPointsAdjustmentsTab from "@/pages/admin/system/AdminPointsAdjustmentsTab";
import ProgrammeManagementTab from "@/pages/admin/programmes/ProgrammeManagementTab";
import StudentAllotmentTab from "@/pages/admin/programmes/StudentAllotmentTab";

const AdminDashboard = () => {
  const location = useLocation();
  const [tab, setTab] = useState("overview");
  const isMobile = useIsMobile();

  const tabItems = useMemo(
    () => [
      { value: "overview", label: "Overview", icon: LayoutDashboard },
      { value: "students", label: "Students", icon: Users },
      { value: "lectures", label: "Lectures", icon: BookOpen },
      { value: "programmes", label: "Programmes", icon: GraduationCap },
      { value: "allotments", label: "Allotments", icon: Users },
      { value: "attendance", label: "Attendance", icon: CheckSquare },
      { value: "monthly", label: "Monthly", icon: CheckSquare },
      { value: "notifications", label: "Notifications", icon: Bell },
      { value: "points", label: "Points", icon: Coins },
      { value: "settings", label: "Settings", icon: Settings },
      { value: "admin_profile", label: "Admin", icon: Shield },
    ],
    [],
  );

  useEffect(() => {
    if (location.hash === "#admin_profile") setTab("admin_profile");
    if (location.hash === "#points") setTab("points");
    if (location.hash === "#settings") setTab("settings");
  }, [location.hash]);

  return (
    <div className="container mx-auto px-0 sm:px-4 py-2 sm:py-8">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage lectures, students, attendance, and programmes</p>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-6">
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
          <TabsList className="w-full max-w-5xl flex flex-wrap gap-1 h-auto bg-muted/50 p-1">
            {tabItems.map((t) => {
              const Icon = t.icon;
              return (
                <TabsTrigger key={t.value} value={t.value} className="gap-1.5 h-9 text-xs">
                  <Icon className="w-3.5 h-3.5" />
                  {t.label}
                </TabsTrigger>
              );
            })}
          </TabsList>
        )}

        <TabsContent value="overview">
          <AdminOverviewTab onNavigateTab={setTab} />
        </TabsContent>

        <TabsContent value="students" className="px-4 sm:px-0">
          <StudentManagementTab />
        </TabsContent>

        <TabsContent value="lectures" className="px-4 sm:px-0">
          <LectureManagementTab />
        </TabsContent>

        <TabsContent value="programmes" className="px-4 sm:px-0">
          <ProgrammeManagementTab />
        </TabsContent>

        <TabsContent value="allotments" className="px-4 sm:px-0">
          <StudentAllotmentTab />
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