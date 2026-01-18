import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, BookOpen, CheckSquare, Bell, LayoutDashboard } from "lucide-react";

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
          <Card className="border-primary/10">
            <CardHeader>
              <CardTitle>Student Management</CardTitle>
              <CardDescription>Add, edit, and manage student profiles</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Student management interface coming soon</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lectures">
          <Card className="border-primary/10">
            <CardHeader>
              <CardTitle>Lecture Management</CardTitle>
              <CardDescription>Create and manage lecture schedules</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Lecture management interface coming soon</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance">
          <Card className="border-primary/10">
            <CardHeader>
              <CardTitle>Attendance Control</CardTitle>
              <CardDescription>Generate OTP/QR codes and finalize attendance</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Attendance control interface coming soon</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card className="border-primary/10">
            <CardHeader>
              <CardTitle>Notification Center</CardTitle>
              <CardDescription>Send notifications to students</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Notification interface coming soon</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;