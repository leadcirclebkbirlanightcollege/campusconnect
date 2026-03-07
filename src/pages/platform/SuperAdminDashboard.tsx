import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FadeIn, SlideUp } from "@/components/ui/motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Building2, Users, BookOpen, CheckSquare, Coins,
  BarChart3, ShieldCheck, LogOut, Activity, Globe,
  UserCog, Radio, Trophy, Settings2, Shield, TrendingUp,
} from "lucide-react";
import { CollegeProvider, useCollegeContext } from "@/contexts/CollegeContext";
import CollegeSwitcher from "./components/CollegeSwitcher";
import { CollegesTab, AdminManagerTab } from "./components/CollegeManagement";
import SAStudentsTab from "./components/SAStudentsTab";
import SALecturesTab from "./components/SALecturesTab";
import SAAchievementsTab from "./components/SAAchievementsTab";
import SAPlatformModeTab from "./components/SAPlatformModeTab";
import SAAnalyticsTab from "./components/SAAnalyticsTab";
import SASecurityTab from "./components/SASecurityTab";
import SystemHealthPanel from "@/pages/admin/system/SystemHealthPanel";

// ── Types ──────────────────────────────────────────────────────────────────
type PlatformAnalytics = {
  total_colleges: number;
  active_colleges: number;
  total_students: number;
  total_lectures: number;
  total_attendance: number;
  total_points_awarded: number;
};

type College = {
  id: string;
  college_name: string;
  subdomain: string | null;
  logo_url: string | null;
  tagline: string | null;
  primary_color: string | null;
  is_active: boolean;
  created_at: string;
};

// ── Stat Card ───────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, accent }: {
  icon: React.ElementType; label: string; value: string | number; accent?: string;
}) {
  return (
    <Card className="bg-surface-1 border-border-subtle">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${accent ?? "bg-primary/10"}`}>
            <Icon className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-xl font-semibold text-foreground">
              {typeof value === "number" ? value.toLocaleString() : value}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Live Lectures count badge ───────────────────────────────────────────────
function LiveCount() {
  const { data } = useQuery({
    queryKey: ["sa_live_count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("lectures")
        .select("id", { count: "exact", head: true })
        .eq("status", "live");
      return count ?? 0;
    },
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
  if (!data) return null;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] bg-success/15 text-success border border-success/20 rounded-full px-2 py-0.5 ml-1">
      <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
      {data}
    </span>
  );
}

// ── Tab Nav ─────────────────────────────────────────────────────────────────
const TABS = [
  { value: "overview",   icon: BarChart3,   label: "Overview" },
  { value: "analytics",  icon: TrendingUp,  label: "Analytics" },
  { value: "colleges",   icon: Building2,   label: "Colleges" },
  { value: "admins",     icon: ShieldCheck, label: "Admins" },
  { value: "students",   icon: Users,       label: "Students" },
  { value: "lectures",   icon: BookOpen,    label: "Lectures" },
  { value: "achievements",icon: Trophy,     label: "Achievements" },
  { value: "platform",   icon: Settings2,   label: "Platform" },
  { value: "security",   icon: Shield,      label: "Security" },
  { value: "health",     icon: Activity,    label: "Health" },
] as const;

// ── Inner Dashboard (needs CollegeContext) ───────────────────────────────────
function DashboardInner() {
  const [tab, setTab] = useState("overview");
  const { colleges, isLoading: collegesLoading } = useCollegeContext();

  const analyticsQuery = useQuery<PlatformAnalytics>({
    queryKey: ["super_admin", "analytics"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_platform_analytics" as any);
      if (error) throw error;
      return data as PlatformAnalytics;
    },
    staleTime: 60_000,
  });

  const analytics = analyticsQuery.data;

  return (
    <div className="min-h-screen bg-background">
      {/* ── Header ── */}
      <header className="sticky top-0 z-40 border-b border-border-subtle bg-surface-1/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4 text-primary" />
            </div>
            <div className="hidden sm:block">
              <span className="text-sm font-semibold text-foreground">Platform Control</span>
              <Badge variant="secondary" className="ml-2 text-[10px] px-1.5 py-0">SUPER ADMIN</Badge>
            </div>
          </div>

          {/* College Switcher — center */}
          <div className="flex-1 flex justify-center">
            <CollegeSwitcher />
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost" size="sm"
              className="gap-1.5 text-xs text-muted-foreground hidden sm:flex"
              onClick={async () => {
                const { data } = await supabase.auth.getSession();
                if (data.session) {
                  window.location.href = "/app/admin/dashboard";
                }
              }}
            >
              <UserCog className="w-3.5 h-3.5" />
              Admin View
            </Button>
            <Button
              variant="ghost" size="sm"
              className="gap-1.5 text-muted-foreground"
              onClick={async () => { await supabase.auth.signOut(); window.location.href = "/auth"; }}
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <FadeIn>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-foreground">Platform Overview</h1>
              <p className="text-xs text-muted-foreground mt-0.5">Multi-college management &amp; platform analytics</p>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span className="text-xs text-muted-foreground">All systems operational</span>
            </div>
          </div>
        </FadeIn>

        <Tabs value={tab} onValueChange={setTab}>
          {/* Scrollable tab list */}
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <TabsList className="bg-surface-2 border border-border-subtle h-auto p-1 flex w-max min-w-full sm:w-auto sm:flex-wrap gap-0">
              {TABS.map(({ value, icon: Icon, label }) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className="gap-1.5 text-xs h-8 px-3 data-[state=active]:bg-background data-[state=active]:shadow-sm whitespace-nowrap"
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  {label}
                  {value === "lectures" && <LiveCount />}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* ── OVERVIEW ── */}
          <TabsContent value="overview" className="mt-6 space-y-6">
            <SlideUp>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <StatCard icon={Building2}   label="Total Colleges"    value={analytics?.total_colleges ?? "—"} />
                <StatCard icon={Activity}    label="Active Colleges"   value={analytics?.active_colleges ?? "—"} accent="bg-success/10" />
                <StatCard icon={Users}       label="Total Students"    value={analytics?.total_students ?? "—"} />
                <StatCard icon={BookOpen}    label="Lectures Conducted" value={analytics?.total_lectures ?? "—"} />
                <StatCard icon={CheckSquare} label="Attendance Records" value={analytics?.total_attendance ?? "—"} />
                <StatCard icon={Coins}       label="Points Awarded"    value={analytics?.total_points_awarded ?? "—"} />
              </div>
            </SlideUp>

            <SlideUp delay={0.06}>
              <Card className="bg-surface-1 border-border-subtle">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Globe className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-foreground">College Snapshot</span>
                  </div>
                  {colleges.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2">No colleges yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {colleges.slice(0, 6).map((college) => (
                        <div key={college.id} className="flex items-center gap-3">
                          <div
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: college.primary_color ?? "hsl(var(--primary))" }}
                          />
                          <span className="text-sm text-foreground flex-1 truncate">{college.college_name}</span>
                          <Badge
                            variant={college.is_active ? "default" : "secondary"}
                            className="text-[10px]"
                          >
                            {college.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      ))}
                      {colleges.length > 6 && (
                        <button
                          className="text-xs text-primary hover:underline pt-1"
                          onClick={() => setTab("colleges")}
                        >
                          +{colleges.length - 6} more → View all colleges
                        </button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </SlideUp>
          </TabsContent>

          {/* ── ANALYTICS ── */}
          <TabsContent value="analytics" className="mt-6">
            <SAAnalyticsTab />
          </TabsContent>

          {/* ── COLLEGES ── */}
          <TabsContent value="colleges" className="mt-6">
            <CollegesTab colleges={colleges as College[]} isLoading={collegesLoading} />
          </TabsContent>

          {/* ── ADMINS ── */}
          <TabsContent value="admins" className="mt-6">
            <AdminManagerTab />
          </TabsContent>

          {/* ── STUDENTS ── */}
          <TabsContent value="students" className="mt-6">
            <SAStudentsTab />
          </TabsContent>

          {/* ── LECTURES ── */}
          <TabsContent value="lectures" className="mt-6">
            <SALecturesTab />
          </TabsContent>

          {/* ── ACHIEVEMENTS ── */}
          <TabsContent value="achievements" className="mt-6">
            <SAAchievementsTab />
          </TabsContent>

          {/* ── PLATFORM MODE ── */}
          <TabsContent value="platform" className="mt-6">
            <SAPlatformModeTab />
          </TabsContent>

          {/* ── SECURITY ── */}
          <TabsContent value="security" className="mt-6">
            <SASecurityTab />
          </TabsContent>

          {/* ── SYSTEM HEALTH ── */}
          <TabsContent value="health" className="mt-6">
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-semibold text-foreground">System Health</h2>
                <p className="text-xs text-muted-foreground">Real-time platform diagnostics</p>
              </div>
              <SystemHealthPanel />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// ── Main Export — wraps with CollegeProvider ─────────────────────────────────
export default function SuperAdminDashboard() {
  return (
    <CollegeProvider>
      <DashboardInner />
    </CollegeProvider>
  );
}
