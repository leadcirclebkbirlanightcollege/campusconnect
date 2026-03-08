import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Building2, Users, BookOpen, CheckSquare, Coins,
  BarChart3, ShieldCheck, LogOut, Activity, Globe,
  UserCog, Radio, Trophy, Settings2, Shield, TrendingUp,
  History, Sliders, AlertTriangle, Flame, Zap,
  ArrowUpRight, Plus,
} from "lucide-react";
import { BRANDING } from "@/config/branding";
import { CollegeProvider, useCollegeContext } from "@/contexts/CollegeContext";
import CollegeSwitcher from "./components/CollegeSwitcher";
import { CollegesTab, AdminManagerTab } from "./components/CollegeManagement";
import SAStudentsTab from "./components/SAStudentsTab";
import SALecturesTab from "./components/SALecturesTab";
import SAAchievementsTab from "./components/SAAchievementsTab";
import SAPlatformModeTab from "./components/SAPlatformModeTab";
import SAAnalyticsTab from "./components/SAAnalyticsTab";
import SASecurityTab from "./components/SASecurityTab";
import SABroadcastTab from "./components/SABroadcastTab";
import SAActivityLogsTab from "./components/SAActivityLogsTab";
import SAPlatformSettingsTab from "./components/SAPlatformSettingsTab";
import SAGlobalSearch from "./components/SAGlobalSearch";
import SystemHealthPanel from "@/pages/admin/system/SystemHealthPanel";
import { useMetricCountUp } from "@/components/ui/motion";
import { cn } from "@/lib/utils";

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

// ── Platform-wide gamification stats ────────────────────────────────────────
function usePlatformGamStats() {
  return useQuery({
    queryKey: ["sa_gam_stats"],
    queryFn: async () => {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const ws = weekStart.toISOString().slice(0, 10);
      const [
        { count: streaks },
        { data: pts },
        { count: achievements },
        { count: risk },
      ] = await Promise.all([
        supabase.from("student_streaks").select("user_id", { count: "exact", head: true }).gt("current_streak", 0),
        supabase.from("points_ledger").select("points").gte("created_at", ws + "T00:00:00Z"),
        supabase.from("student_achievements").select("id", { count: "exact", head: true }).gte("awarded_at", ws + "T00:00:00Z"),
        supabase.from("student_intelligence").select("user_id", { count: "exact", head: true }).or("attendance_consistency.lt.50,engagement_index.lt.40"),
      ]);
      return {
        activeStreaks: streaks ?? 0,
        weeklyPoints: (pts ?? []).reduce((s, r) => s + (r.points ?? 0), 0),
        weeklyAchievements: achievements ?? 0,
        riskCount: risk ?? 0,
      };
    },
    staleTime: 60_000,
  });
}

// ── Premium KPI Card ─────────────────────────────────────────────────────────
function KpiCard({
  label, value, suffix = "", icon: Icon, bgClass, colorClass, sublabel, loading, index,
}: {
  label: string; value: number; suffix?: string; icon: React.ElementType;
  bgClass: string; colorClass: string; sublabel?: string; loading: boolean; index: number;
}) {
  const counted = useMetricCountUp(loading ? 0 : value, 900 + index * 80);
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay: index * 0.055, ease: "easeOut" }}
      className="rounded-2xl border border-border-subtle bg-surface-1 p-5 shadow-xs dashboard-panel group"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1 min-w-0">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">{label}</p>
          {loading ? (
            <Skeleton className="h-8 w-20 mt-1" />
          ) : (
            <p className="text-[28px] font-bold tracking-tight text-foreground tabular-nums leading-none mt-1">
              {counted.toLocaleString()}{suffix}
            </p>
          )}
          {sublabel && !loading && (
            <p className="text-[11px] text-muted-foreground mt-1">{sublabel}</p>
          )}
        </div>
        <div className={cn("rounded-xl p-2.5 shrink-0 transition-transform duration-150 group-hover:scale-110", bgClass)}>
          <Icon className={cn("h-5 w-5", colorClass)} />
        </div>
      </div>
    </motion.div>
  );
}

// ── Live Lectures count badge ───────────────────────────────────────────────
function LiveCount() {
  const { data } = useQuery({
    queryKey: ["sa_live_count"],
    queryFn: async () => {
      const { count } = await supabase.from("lectures").select("id", { count: "exact", head: true }).eq("status", "live");
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

// ── College Snapshot Row ────────────────────────────────────────────────────
function CollegeSnapshotRow({ college, onView }: { college: College; onView: () => void }) {
  return (
    <motion.div
      whileHover={{ x: 2 }}
      transition={{ duration: 0.12 }}
      className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-surface-2 transition-colors cursor-pointer group"
      onClick={onView}
    >
      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: college.primary_color ?? "hsl(var(--primary))" }} />
      <span className="text-[13px] text-foreground flex-1 truncate font-medium">{college.college_name}</span>
      {college.subdomain && (
        <span className="text-[10px] text-muted-foreground hidden sm:block">{college.subdomain}</span>
      )}
      <Badge
        variant={college.is_active ? "default" : "secondary"}
        className={cn("text-[10px] shrink-0", college.is_active ? "bg-success/15 text-success border-0" : "")}
      >
        {college.is_active ? "Active" : "Inactive"}
      </Badge>
      <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
    </motion.div>
  );
}

// ── Gamification Stat Row ───────────────────────────────────────────────────
function GamRow({ icon, label, value, accent, loading }: {
  icon: React.ReactNode; label: string; value: number; accent: string; loading: boolean;
}) {
  const counted = useMetricCountUp(loading ? 0 : value, 800);
  return (
    <div className="flex items-center gap-3 py-3">
      <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0", accent)}>{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
        {loading ? <Skeleton className="h-5 w-12 mt-0.5" /> : (
          <p className="text-[18px] font-bold text-foreground tabular-nums leading-tight">{counted.toLocaleString()}</p>
        )}
      </div>
    </div>
  );
}

// ── Tab Nav definition ───────────────────────────────────────────────────────
const TABS = [
  { value: "overview",       icon: BarChart3,   label: "Overview" },
  { value: "analytics",      icon: TrendingUp,  label: "Analytics" },
  { value: "colleges",       icon: Building2,   label: "Colleges" },
  { value: "admins",         icon: ShieldCheck, label: "Admins" },
  { value: "students",       icon: Users,       label: "Students" },
  { value: "lectures",       icon: BookOpen,    label: "Lectures" },
  { value: "achievements",   icon: Trophy,      label: "Achievements" },
  { value: "broadcast",      icon: Radio,       label: "Broadcast" },
  { value: "activity",       icon: History,     label: "Activity Logs" },
  { value: "settings",       icon: Sliders,     label: "Settings" },
  { value: "platform",       icon: Settings2,   label: "Platform Mode" },
  { value: "security",       icon: Shield,      label: "Security" },
  { value: "health",         icon: Activity,    label: "Health" },
] as const;

// ── Inner Dashboard ──────────────────────────────────────────────────────────
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

  const gamStats = usePlatformGamStats();
  const analytics = analyticsQuery.data;
  const loading = analyticsQuery.isLoading;

  return (
    <div className="min-h-screen bg-background">
      {/* ── Header ── */}
      <header className="sticky top-0 z-40 border-b border-border-subtle bg-surface-1/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          {/* Brand */}
          <div className="flex items-center gap-3 min-w-0 shrink-0">
            <img src={BRANDING.logo} alt={BRANDING.name} className="w-7 h-7 object-contain shrink-0" />
            <div className="hidden sm:block">
              <span className="text-sm font-semibold text-foreground">Platform Control</span>
              <Badge variant="secondary" className="ml-2 text-[10px] px-1.5 py-0">SUPER ADMIN</Badge>
            </div>
          </div>

          {/* Global search */}
          <div className="flex-1 flex justify-center px-2">
            <SAGlobalSearch />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <CollegeSwitcher />
            {/* Quick actions */}
            <Button
              variant="ghost" size="sm"
              className="gap-1.5 text-xs text-muted-foreground hidden xl:flex"
              onClick={() => setTab("colleges")}
            >
              <Plus className="w-3.5 h-3.5" />
              College
            </Button>
            <Button
              variant="ghost" size="sm"
              className="gap-1.5 text-xs text-muted-foreground hidden lg:flex"
              onClick={async () => {
                const { data } = await supabase.auth.getSession();
                if (data.session) window.location.href = "/app/admin/dashboard";
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
              <span className="hidden sm:inline text-xs">Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Page heading */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-xl font-semibold text-foreground">Platform Overview</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Multi-college management &amp; platform analytics</p>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span className="text-xs text-muted-foreground">All systems operational</span>
          </div>
        </motion.div>

        <Tabs value={tab} onValueChange={setTab}>
          {/* Scrollable tab list */}
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
            <TabsList className="bg-surface-2 border border-border-subtle h-auto p-1 flex w-max gap-0">
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
            {/* KPI Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              <KpiCard index={0} loading={loading} label="Total Colleges" value={analytics?.total_colleges ?? 0}
                icon={Building2} bgClass="bg-primary/10" colorClass="text-primary"
                sublabel={`${analytics?.active_colleges ?? 0} active`} />
              <KpiCard index={1} loading={loading} label="Total Students" value={analytics?.total_students ?? 0}
                icon={Users} bgClass="bg-success/10" colorClass="text-success"
                sublabel="Across all colleges" />
              <KpiCard index={2} loading={loading} label="Total Lectures" value={analytics?.total_lectures ?? 0}
                icon={BookOpen} bgClass="bg-accent/10" colorClass="text-accent"
                sublabel="All time conducted" />
              <KpiCard index={3} loading={loading} label="Attendance Records" value={analytics?.total_attendance ?? 0}
                icon={CheckSquare} bgClass="bg-warning/10" colorClass="text-warning"
                sublabel="Present marks" />
              <KpiCard index={4} loading={gamStats.isLoading} label="Active Streaks" value={gamStats.data?.activeStreaks ?? 0}
                icon={Flame} bgClass="bg-warning/10" colorClass="text-warning"
                sublabel="Students on streak" />
              <KpiCard index={5} loading={loading} label="Points Awarded" value={analytics?.total_points_awarded ?? 0}
                icon={Coins} bgClass="bg-premium/10" colorClass="text-premium"
                sublabel="Total economy" />
            </div>

            {/* College Snapshot + Gamification side by side */}
            <div className="grid gap-5 lg:grid-cols-5">
              {/* College Snapshot */}
              <div className="lg:col-span-3 rounded-2xl border border-border-subtle bg-surface-1 overflow-hidden dashboard-panel shadow-sm">
                <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Globe className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-foreground">College Snapshot</p>
                      <p className="text-[11px] text-muted-foreground">{colleges.length} institutions registered</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="text-[11px] gap-1 text-muted-foreground" onClick={() => setTab("colleges")}>
                    Manage <ArrowUpRight className="h-3 w-3" />
                  </Button>
                </div>
                <div className="px-3 py-2">
                  {collegesLoading ? (
                    <div className="space-y-1">
                      {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full rounded-xl" />)}
                    </div>
                  ) : colleges.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-6 text-center">No colleges yet.</p>
                  ) : (
                    <div>
                      {colleges.slice(0, 7).map((college) => (
                        <CollegeSnapshotRow key={college.id} college={college as College} onView={() => setTab("colleges")} />
                      ))}
                      {colleges.length > 7 && (
                        <button className="text-xs text-primary hover:underline px-3 pt-1 pb-2" onClick={() => setTab("colleges")}>
                          +{colleges.length - 7} more → View all
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Gamification & Risk panel */}
              <div className="lg:col-span-2 rounded-2xl border border-border-subtle bg-surface-1 overflow-hidden dashboard-panel shadow-sm">
                <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border-subtle">
                  <div className="h-8 w-8 rounded-lg bg-warning/10 flex items-center justify-center">
                    <Flame className="w-4 h-4 text-warning" />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-foreground">Platform Engagement</p>
                    <p className="text-[11px] text-muted-foreground">This week's activity</p>
                  </div>
                </div>
                <div className="px-5 divide-y divide-border-subtle">
                  <GamRow icon={<Flame className="h-4 w-4 text-warning" />} label="Active Streaks" value={gamStats.data?.activeStreaks ?? 0} accent="bg-warning/10" loading={gamStats.isLoading} />
                  <GamRow icon={<Zap className="h-4 w-4 text-primary" />} label="Points This Week" value={gamStats.data?.weeklyPoints ?? 0} accent="bg-primary/10" loading={gamStats.isLoading} />
                  <GamRow icon={<Trophy className="h-4 w-4 text-premium" />} label="Achievements Unlocked" value={gamStats.data?.weeklyAchievements ?? 0} accent="bg-premium/10" loading={gamStats.isLoading} />
                  <div className="flex items-center gap-3 py-3">
                    <div className="h-8 w-8 rounded-lg bg-danger/10 flex items-center justify-center shrink-0">
                      <AlertTriangle className="h-4 w-4 text-danger" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">At-Risk Students</p>
                      {gamStats.isLoading ? <Skeleton className="h-5 w-12 mt-0.5" /> : (
                        <p className="text-[18px] font-bold text-foreground tabular-nums leading-tight">{gamStats.data?.riskCount ?? 0}</p>
                      )}
                    </div>
                    {(gamStats.data?.riskCount ?? 0) > 0 && (
                      <span className="text-[10px] bg-danger/10 text-danger border border-danger/20 rounded-full px-2 py-0.5 font-semibold">flagged</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick actions row */}
            <div className="rounded-2xl border border-border-subtle bg-surface-1 p-4 dashboard-panel shadow-sm">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold mb-3 px-1">Quick Platform Actions</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                {[
                  { label: "Colleges",      icon: Building2,   tab: "colleges" },
                  { label: "Admins",        icon: ShieldCheck, tab: "admins" },
                  { label: "Students",      icon: Users,       tab: "students" },
                  { label: "Lectures",      icon: BookOpen,    tab: "lectures" },
                  { label: "Broadcast",     icon: Radio,       tab: "broadcast" },
                  { label: "Platform Mode", icon: Settings2,   tab: "platform" },
                  { label: "Security",      icon: Shield,      tab: "security" },
                ].map((a) => {
                  const Icon = a.icon;
                  return (
                    <motion.button
                      key={a.tab}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setTab(a.tab)}
                      className="flex flex-col items-center gap-2 p-3 rounded-xl border border-transparent hover:border-border-subtle hover:bg-surface-2 transition-all duration-120 cursor-pointer group"
                    >
                      <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-120">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <span className="text-[10px] text-muted-foreground font-medium text-center group-hover:text-foreground transition-colors">{a.label}</span>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </TabsContent>

          {/* ── ANALYTICS ── */}
          <TabsContent value="analytics" className="mt-6"><SAAnalyticsTab /></TabsContent>

          {/* ── COLLEGES ── */}
          <TabsContent value="colleges" className="mt-6">
            <CollegesTab colleges={colleges as College[]} isLoading={collegesLoading} />
          </TabsContent>

          {/* ── ADMINS ── */}
          <TabsContent value="admins" className="mt-6"><AdminManagerTab /></TabsContent>

          {/* ── STUDENTS ── */}
          <TabsContent value="students" className="mt-6"><SAStudentsTab /></TabsContent>

          {/* ── LECTURES ── */}
          <TabsContent value="lectures" className="mt-6"><SALecturesTab /></TabsContent>

          {/* ── ACHIEVEMENTS ── */}
          <TabsContent value="achievements" className="mt-6"><SAAchievementsTab /></TabsContent>

          {/* ── BROADCAST ── */}
          <TabsContent value="broadcast" className="mt-6"><SABroadcastTab /></TabsContent>

          {/* ── ACTIVITY LOGS ── */}
          <TabsContent value="activity" className="mt-6"><SAActivityLogsTab /></TabsContent>

          {/* ── PLATFORM SETTINGS ── */}
          <TabsContent value="settings" className="mt-6"><SAPlatformSettingsTab /></TabsContent>

          {/* ── PLATFORM MODE ── */}
          <TabsContent value="platform" className="mt-6"><SAPlatformModeTab /></TabsContent>

          {/* ── SECURITY ── */}
          <TabsContent value="security" className="mt-6"><SASecurityTab /></TabsContent>

          {/* ── SYSTEM HEALTH ── */}
          <TabsContent value="health" className="mt-6">
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-semibold text-foreground">System Health</h2>
                <p className="text-xs text-muted-foreground">Real-time platform diagnostics — auto-refreshes every 30s</p>
              </div>
              <SystemHealthPanel />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// ── Main Export ──────────────────────────────────────────────────────────────
export default function SuperAdminDashboard() {
  return (
    <CollegeProvider>
      <DashboardInner />
    </CollegeProvider>
  );
}
