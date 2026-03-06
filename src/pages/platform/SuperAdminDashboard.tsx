import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FadeIn, SlideUp } from "@/components/ui/motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Building2, Users, BookOpen, CheckSquare, Coins,
  BarChart3, ShieldCheck, LogOut, Activity, Globe, UserCog
} from "lucide-react";
import { CollegeProvider, useCollegeContext } from "@/contexts/CollegeContext";
import CollegeSwitcher from "./components/CollegeSwitcher";
import { CollegesTab, AdminManagerTab } from "./components/CollegeManagement";

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
      <CardContent className="p-5">
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
                  // Open admin dashboard in same tab with college context
                  window.location.href = "/app/admin/dashboard";
                }
              }}
            >
              <UserCog className="w-3.5 h-3.5" />
              Admin View
            </Button>
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground"
              onClick={async () => { await supabase.auth.signOut(); window.location.href = "/auth"; }}>
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <FadeIn>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Platform Overview</h1>
            <p className="text-sm text-muted-foreground mt-1">Multi-college management &amp; platform analytics</p>
          </div>
        </FadeIn>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="bg-surface-2 border border-border-subtle">
            <TabsTrigger value="overview" className="gap-1.5 text-xs">
              <BarChart3 className="w-3.5 h-3.5" />Overview
            </TabsTrigger>
            <TabsTrigger value="colleges" className="gap-1.5 text-xs">
              <Building2 className="w-3.5 h-3.5" />Colleges
            </TabsTrigger>
            <TabsTrigger value="admins" className="gap-1.5 text-xs">
              <ShieldCheck className="w-3.5 h-3.5" />Admins
            </TabsTrigger>
          </TabsList>

          {/* ── OVERVIEW ── */}
          <TabsContent value="overview" className="mt-6 space-y-6">
            <SlideUp>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <StatCard icon={Building2} label="Total Colleges" value={analytics?.total_colleges ?? "—"} />
                <StatCard icon={Activity} label="Active Colleges" value={analytics?.active_colleges ?? "—"} accent="bg-success/10" />
                <StatCard icon={Users} label="Total Students" value={analytics?.total_students ?? "—"} />
                <StatCard icon={BookOpen} label="Lectures Conducted" value={analytics?.total_lectures ?? "—"} />
                <StatCard icon={CheckSquare} label="Attendance Records" value={analytics?.total_attendance ?? "—"} />
                <StatCard icon={Coins} label="Points Awarded" value={analytics?.total_points_awarded ?? "—"} />
              </div>
            </SlideUp>

            <SlideUp delay={0.08}>
              <Card className="bg-surface-1 border-border-subtle">
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Globe className="w-4 h-4 text-primary" />
                    Platform Health
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                    <span className="text-sm text-foreground">All systems operational</span>
                    <Badge variant="secondary" className="ml-auto text-[10px]">Live</Badge>
                  </div>
                </CardContent>
              </Card>
            </SlideUp>

            {/* College snapshot */}
            {colleges.length > 0 && (
              <SlideUp delay={0.12}>
                <Card className="bg-surface-1 border-border-subtle">
                  <CardHeader>
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-primary" />
                      College Snapshot
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {colleges.slice(0, 5).map(college => (
                        <div key={college.id} className="flex items-center gap-3 py-1.5">
                          <div className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: college.primary_color ?? "hsl(var(--primary))" }} />
                          <span className="text-sm text-foreground flex-1 truncate">{college.college_name}</span>
                          <Badge variant={college.is_active ? "default" : "secondary"} className="text-[10px]">
                            {college.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      ))}
                      {colleges.length > 5 && (
                        <p className="text-xs text-muted-foreground pt-1">
                          +{colleges.length - 5} more colleges
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </SlideUp>
            )}
          </TabsContent>

          {/* ── COLLEGES ── */}
          <TabsContent value="colleges" className="mt-6">
            <CollegesTab colleges={colleges as College[]} isLoading={collegesLoading} />
          </TabsContent>

          {/* ── ADMINS ── */}
          <TabsContent value="admins" className="mt-6">
            <AdminManagerTab />
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
