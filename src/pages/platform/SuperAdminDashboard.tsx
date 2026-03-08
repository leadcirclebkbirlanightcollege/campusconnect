import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Building2, Users, BookOpen, CheckSquare, Coins,
  BarChart3, ShieldCheck, LogOut, Activity, Globe,
  UserCog, Radio, Trophy, Settings2, Shield, TrendingUp,
  History, Sliders, AlertTriangle, Flame, Zap,
  ArrowUpRight, Plus, ChevronRight, Layers, LayoutDashboard,
  ServerCrash, Bell, GraduationCap, Sparkles, Network, MessageSquare,
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
import SAFeedbackTab from "./components/SAFeedbackTab";
import SAMonitoringTab from "./components/SAMonitoringTab";
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

// ── Tab groups ───────────────────────────────────────────────────────────────
type NavItem = { value: string; icon: React.ElementType; label: string };
type NavGroup = { label: string; items: NavItem[] };

const TAB_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { value: "overview",  icon: LayoutDashboard, label: "Command Center" },
      { value: "analytics", icon: BarChart3,        label: "Analytics" },
    ],
  },
  {
    label: "Institutions",
    items: [
      { value: "colleges",  icon: Building2,   label: "Colleges" },
      { value: "admins",    icon: ShieldCheck, label: "Admins" },
      { value: "students",  icon: Users,       label: "Students" },
    ],
  },
  {
    label: "Academic",
    items: [
      { value: "lectures",     icon: BookOpen, label: "Lectures" },
      { value: "achievements", icon: Trophy,   label: "Achievements" },
    ],
  },
  {
    label: "Communications",
    items: [
      { value: "broadcast", icon: Radio,   label: "Broadcast" },
      { value: "activity",  icon: History, label: "Activity" },
    ],
  },
  {
    label: "System",
    items: [
      { value: "settings",  icon: Sliders,  label: "Settings" },
      { value: "platform",  icon: Settings2, label: "Platform Mode" },
      { value: "security",  icon: Shield,   label: "Security" },
      { value: "health",    icon: Activity, label: "Health" },
    ],
  },
];

// ── Hooks ────────────────────────────────────────────────────────────────────
function usePlatformAnalytics() {
  return useQuery<PlatformAnalytics>({
    queryKey: ["super_admin", "analytics"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_platform_analytics" as any);
      if (error) throw error;
      return data as PlatformAnalytics;
    },
    staleTime: 60_000,
  });
}

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
        { count: adminsCount },
      ] = await Promise.all([
        supabase.from("student_streaks").select("user_id", { count: "exact", head: true }).gt("current_streak", 0),
        supabase.from("points_ledger").select("points").gte("created_at", ws + "T00:00:00Z"),
        supabase.from("student_achievements").select("id", { count: "exact", head: true }).gte("awarded_at", ws + "T00:00:00Z"),
        supabase.from("student_intelligence").select("user_id", { count: "exact", head: true }).or("attendance_consistency.lt.50,engagement_index.lt.40"),
        supabase.from("user_roles").select("user_id", { count: "exact", head: true }).in("role", ["admin", "super_admin"]),
      ]);
      return {
        activeStreaks:       streaks ?? 0,
        weeklyPoints:        (pts ?? []).reduce((s, r) => s + (r.points ?? 0), 0),
        weeklyAchievements:  achievements ?? 0,
        riskCount:           risk ?? 0,
        activeAdmins:        adminsCount ?? 0,
      };
    },
    staleTime: 60_000,
  });
}

// ── Live lecture count badge ─────────────────────────────────────────────────
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
    <motion.span
      animate={{ opacity: [1, 0.55, 1] }}
      transition={{ repeat: Infinity, duration: 1.8 }}
      className="ml-1.5 inline-flex items-center gap-0.5 text-[9px] bg-danger/15 text-danger border border-danger/20 rounded-full px-1.5 py-0.5 font-bold"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-danger" />
      {data}
    </motion.span>
  );
}

// ── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({
  label, value, suffix = "", icon: Icon, bgClass, colorClass, sublabel,
  loading, index, trend, danger,
}: {
  label: string; value: number; suffix?: string; icon: React.ElementType;
  bgClass: string; colorClass: string; sublabel?: string;
  loading: boolean; index: number; trend?: string; danger?: boolean;
}) {
  const counted = useMetricCountUp(loading ? 0 : value, 900 + index * 70);
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.05, ease: "easeOut" }}
      className={cn(
        "rounded-2xl border bg-surface-1 p-4 shadow-xs flex flex-col justify-between min-h-[110px] transition-all duration-150 hover:shadow-sm group",
        danger && value > 0 ? "border-danger/30" : "border-border-subtle",
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground leading-none">{label}</p>
        <div className={cn("h-7 w-7 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-150 group-hover:scale-110", bgClass)}>
          <Icon className={cn("h-3.5 w-3.5", colorClass)} />
        </div>
      </div>
      {loading ? (
        <Skeleton className="h-8 w-20" />
      ) : (
        <p className={cn("text-[32px] font-black tracking-tight tabular-nums leading-none", danger && value > 0 ? "text-danger" : "text-foreground")}>
          {counted.toLocaleString()}{suffix}
        </p>
      )}
      {!loading && (sublabel || trend) && (
        <p className={cn("text-[10px] mt-1.5 font-medium", danger && value > 0 ? "text-danger/70" : "text-muted-foreground")}>
          {trend ?? sublabel}
        </p>
      )}
    </motion.div>
  );
}

// ── College Snapshot Row ─────────────────────────────────────────────────────
function CollegeRow({ college, onView }: { college: College; onView: () => void }) {
  return (
    <motion.div
      whileHover={{ x: 2 }}
      transition={{ duration: 0.1 }}
      onClick={onView}
      className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-surface-2 transition-colors cursor-pointer group"
    >
      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: college.primary_color ?? "hsl(var(--primary))" }} />
      <span className="text-[13px] font-medium text-foreground flex-1 truncate">{college.college_name}</span>
      {college.subdomain && (
        <span className="text-[10px] text-muted-foreground hidden sm:block">{college.subdomain}</span>
      )}
      <span className={cn(
        "text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0",
        college.is_active ? "bg-success/10 text-success" : "bg-surface-3 text-muted-foreground",
      )}>
        {college.is_active ? "Active" : "Inactive"}
      </span>
      <ChevronRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-60 transition-opacity shrink-0" />
    </motion.div>
  );
}

// ── Engagement Row ───────────────────────────────────────────────────────────
function EngRow({ icon: Icon, iconBg, iconColor, label, value, loading }: {
  icon: React.ElementType; iconBg: string; iconColor: string;
  label: string; value: number; loading: boolean;
}) {
  const counted = useMetricCountUp(loading ? 0 : value, 800);
  return (
    <div className="flex items-center gap-3 py-3 border-b border-border-subtle last:border-0">
      <div className={cn("h-8 w-8 rounded-xl flex items-center justify-center shrink-0", iconBg)}>
        <Icon className={cn("h-4 w-4", iconColor)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">{label}</p>
        {loading ? <Skeleton className="h-5 w-12 mt-0.5" /> : (
          <p className="text-[20px] font-black text-foreground tabular-nums leading-tight">{counted.toLocaleString()}</p>
        )}
      </div>
    </div>
  );
}

// ── Sidebar Nav ──────────────────────────────────────────────────────────────
function SideNav({ tab, onTab }: { tab: string; onTab: (v: string) => void }) {
  return (
    <nav className="hidden xl:flex flex-col w-[200px] shrink-0 space-y-0.5">
      {TAB_GROUPS.map((group) => (
        <div key={group.label} className="mb-2">
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold px-3 mb-1">{group.label}</p>
          {group.items.map((item) => {
            const Icon = item.icon;
            const isActive = tab === item.value;
            return (
              <button
                key={item.value}
                onClick={() => onTab(item.value)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12px] font-semibold transition-all duration-120 text-left",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-surface-2",
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{item.label}</span>
                {item.value === "lectures" && <LiveCount />}
              </button>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

// ── Mobile top scroll tab bar ────────────────────────────────────────────────
function MobileTabBar({ tab, onTab }: { tab: string; onTab: (v: string) => void }) {
  const allItems = TAB_GROUPS.flatMap((g) => g.items);
  return (
    <div className="xl:hidden overflow-x-auto scrollbar-hide -mx-4 px-4">
      <div className="flex gap-1.5 w-max py-1">
        {allItems.map((item) => {
          const Icon = item.icon;
          const isActive = tab === item.value;
          return (
            <button
              key={item.value}
              onClick={() => onTab(item.value)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold whitespace-nowrap transition-all duration-120",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-surface-2 text-muted-foreground hover:text-foreground border border-border-subtle",
              )}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              {item.label}
              {item.value === "lectures" && <LiveCount />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Section Shell ─────────────────────────────────────────────────────────────
function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-[17px] font-black text-foreground">{title}</h2>
          {subtitle && <p className="text-[12px] text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

// ── Quick Action Button ───────────────────────────────────────────────────────
function QA({ icon: Icon, label, color, bg, onClick }: {
  icon: React.ElementType; label: string; color: string; bg: string; onClick: () => void;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      className="flex flex-col items-center gap-2 p-3 rounded-2xl border border-border-subtle bg-surface-1 hover:bg-surface-2 hover:border-primary/20 transition-all duration-120 cursor-pointer group"
    >
      <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-120", bg)}>
        <Icon className={cn("h-4 w-4", color)} />
      </div>
      <span className="text-[10px] text-muted-foreground font-semibold text-center group-hover:text-foreground transition-colors leading-tight">{label}</span>
    </motion.button>
  );
}

// ── Inner Dashboard ───────────────────────────────────────────────────────────
function DashboardInner() {
  const [tab, setTab] = useState<string>("overview");
  const { colleges, isLoading: collegesLoading } = useCollegeContext();
  const analyticsQ = usePlatformAnalytics();
  const gamStats = usePlatformGamStats();
  const analytics = analyticsQ.data;
  const loading = analyticsQ.isLoading;

  const kpis = [
    {
      label: "Total Colleges",
      value: analytics?.total_colleges ?? 0,
      icon: Building2,
      bgClass: "bg-primary/10",
      colorClass: "text-primary",
      trend: `${analytics?.active_colleges ?? 0} active`,
    },
    {
      label: "Active Admins",
      value: gamStats.data?.activeAdmins ?? 0,
      icon: ShieldCheck,
      bgClass: "bg-purple-500/10",
      colorClass: "text-purple-400",
      trend: "Across all colleges",
    },
    {
      label: "Total Students",
      value: analytics?.total_students ?? 0,
      icon: Users,
      bgClass: "bg-success/10",
      colorClass: "text-success",
      trend: "Registered users",
    },
    {
      label: "Total Lectures",
      value: analytics?.total_lectures ?? 0,
      icon: BookOpen,
      bgClass: "bg-accent/10",
      colorClass: "text-accent",
      trend: "All time",
    },
    {
      label: "Attendance Records",
      value: analytics?.total_attendance ?? 0,
      icon: CheckSquare,
      bgClass: "bg-warning/10",
      colorClass: "text-warning",
      trend: "Present marks",
    },
    {
      label: "Points Awarded",
      value: analytics?.total_points_awarded ?? 0,
      icon: Coins,
      bgClass: "bg-premium/10",
      colorClass: "text-premium",
      trend: "Total economy",
    },
  ];

  return (
    <div className="min-h-screen bg-background">

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-40 border-b border-border-subtle bg-surface-1/90 backdrop-blur-md">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          {/* Brand */}
          <div className="flex items-center gap-3 shrink-0">
            <img src={BRANDING.logo} alt={BRANDING.name} className="w-7 h-7 object-contain" />
            <div className="hidden sm:block">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-bold text-foreground tracking-tight">{BRANDING.name}</span>
                <span className="text-[9px] bg-primary/10 text-primary border border-primary/20 rounded-full px-2 py-0.5 font-black tracking-widest uppercase">
                  Super Admin
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground">Platform Command Center</p>
            </div>
          </div>

          {/* Search */}
          <div className="flex-1 flex justify-center px-2 max-w-sm">
            <SAGlobalSearch />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            <CollegeSwitcher />
            <Button
              variant="ghost" size="sm"
              className="gap-1.5 text-xs text-muted-foreground hidden lg:flex"
              onClick={() => setTab("colleges")}
            >
              <Plus className="w-3.5 h-3.5" /> College
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
              <span className="hidden xl:inline">Admin View</span>
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

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-5">

        {/* Page heading */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18 }}
          className="flex items-center justify-between mb-4"
        >
          <div>
            <h1 className="text-[20px] font-black text-foreground tracking-tight">Enterprise Command Center</h1>
            <p className="text-[11px] text-muted-foreground mt-0.5">Platform-wide visibility · {colleges.length} institution{colleges.length !== 1 ? "s" : ""} registered</p>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span className="text-[11px] text-muted-foreground font-medium">All systems operational</span>
          </div>
        </motion.div>

        {/* Mobile tab bar */}
        <div className="mb-4">
          <MobileTabBar tab={tab} onTab={setTab} />
        </div>

        {/* Layout: sidebar + content */}
        <div className="flex gap-6 items-start">

          {/* Desktop sidebar nav */}
          <SideNav tab={tab} onTab={setTab} />

          {/* Main content area */}
          <div className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={tab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
              >

                {/* ── OVERVIEW ── */}
                {tab === "overview" && (
                  <div className="space-y-5">
                    {/* KPI Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
                      {kpis.map((kpi, i) => (
                        <KpiCard key={kpi.label} index={i} loading={loading} {...kpi} />
                      ))}
                    </div>

                    {/* College Snapshot + Engagement side by side */}
                    <div className="grid gap-4 lg:grid-cols-5">
                      {/* College Snapshot */}
                      <div className="lg:col-span-3 rounded-2xl border border-border-subtle bg-surface-1 shadow-xs overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
                              <Globe className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="text-[13px] font-bold text-foreground">Institutions</p>
                              <p className="text-[11px] text-muted-foreground">{colleges.length} colleges registered</p>
                            </div>
                          </div>
                          <button
                            onClick={() => setTab("colleges")}
                            className="flex items-center gap-1 text-[11px] text-primary font-semibold hover:underline"
                          >
                            Manage <ArrowUpRight className="h-3 w-3" />
                          </button>
                        </div>
                        <div className="px-3 py-2 max-h-[280px] overflow-y-auto">
                          {collegesLoading ? (
                            <div className="space-y-1 p-2">
                              {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full rounded-xl" />)}
                            </div>
                          ) : colleges.length === 0 ? (
                            <div className="py-10 text-center">
                              <Building2 className="h-7 w-7 text-muted-foreground/30 mx-auto mb-2" />
                              <p className="text-[12px] text-muted-foreground">No colleges yet</p>
                            </div>
                          ) : (
                            <div>
                              {colleges.map((college) => (
                                <CollegeRow key={college.id} college={college as College} onView={() => setTab("colleges")} />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Platform Engagement */}
                      <div className="lg:col-span-2 rounded-2xl border border-border-subtle bg-surface-1 shadow-xs overflow-hidden">
                        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border-subtle">
                          <div className="h-8 w-8 rounded-xl bg-warning/10 flex items-center justify-center">
                            <Sparkles className="h-4 w-4 text-warning" />
                          </div>
                          <div>
                            <p className="text-[13px] font-bold text-foreground">Platform Pulse</p>
                            <p className="text-[11px] text-muted-foreground">This week's engagement</p>
                          </div>
                        </div>
                        <div className="px-5 py-1">
                          <EngRow icon={Flame} iconBg="bg-warning/10" iconColor="text-warning" label="Active Streaks" value={gamStats.data?.activeStreaks ?? 0} loading={gamStats.isLoading} />
                          <EngRow icon={Zap} iconBg="bg-primary/10" iconColor="text-primary" label="Points This Week" value={gamStats.data?.weeklyPoints ?? 0} loading={gamStats.isLoading} />
                          <EngRow icon={Trophy} iconBg="bg-premium/10" iconColor="text-premium" label="Achievements Unlocked" value={gamStats.data?.weeklyAchievements ?? 0} loading={gamStats.isLoading} />
                          <div className="flex items-center gap-3 py-3">
                            <div className="h-8 w-8 rounded-xl bg-danger/10 flex items-center justify-center shrink-0">
                              <AlertTriangle className="h-4 w-4 text-danger" />
                            </div>
                            <div className="flex-1">
                              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">At-Risk Students</p>
                              {gamStats.isLoading ? <Skeleton className="h-5 w-10 mt-0.5" /> : (
                                <p className={cn("text-[20px] font-black tabular-nums leading-tight", (gamStats.data?.riskCount ?? 0) > 0 ? "text-danger" : "text-foreground")}>
                                  {gamStats.data?.riskCount ?? 0}
                                </p>
                              )}
                            </div>
                            {(gamStats.data?.riskCount ?? 0) > 0 && (
                              <button onClick={() => setTab("students")} className="text-[10px] text-danger border border-danger/25 rounded-full px-2 py-0.5 hover:bg-danger/10 transition-colors">
                                View →
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Quick Actions Grid */}
                    <div className="rounded-2xl border border-border-subtle bg-surface-1 p-4 shadow-xs">
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-3 px-1">Quick Actions</p>
                      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                        <QA icon={Building2}   label="Colleges"      color="text-primary"      bg="bg-primary/10"       onClick={() => setTab("colleges")} />
                        <QA icon={ShieldCheck} label="Admins"        color="text-purple-400"   bg="bg-purple-500/10"    onClick={() => setTab("admins")} />
                        <QA icon={Users}       label="Students"      color="text-success"      bg="bg-success/10"       onClick={() => setTab("students")} />
                        <QA icon={BookOpen}    label="Lectures"      color="text-accent"       bg="bg-accent/10"        onClick={() => setTab("lectures")} />
                        <QA icon={Radio}       label="Broadcast"     color="text-warning"      bg="bg-warning/10"       onClick={() => setTab("broadcast")} />
                        <QA icon={Settings2}   label="Platform Mode" color="text-muted-foreground" bg="bg-surface-3"   onClick={() => setTab("platform")} />
                        <QA icon={Shield}      label="Security"      color="text-danger"       bg="bg-danger/10"        onClick={() => setTab("security")} />
                      </div>
                    </div>

                    {/* Status footer strip */}
                    <div className="rounded-2xl border border-border-subtle bg-surface-1 px-5 py-3 shadow-xs flex items-center justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-4 flex-wrap">
                        {[
                          { icon: Network,      label: "Database",      status: "Operational", color: "text-success" },
                          { icon: ServerCrash,  label: "Edge Functions", status: "Running",     color: "text-success" },
                          { icon: Activity,     label: "Realtime",       status: "Connected",   color: "text-success" },
                        ].map(({ icon: Icon, label, status, color }) => (
                          <div key={label} className="flex items-center gap-2">
                            <Icon className={cn("h-3.5 w-3.5", color)} />
                            <span className="text-[11px] text-muted-foreground">{label}:</span>
                            <span className={cn("text-[11px] font-semibold", color)}>{status}</span>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => setTab("health")}
                        className="text-[11px] text-primary font-semibold hover:underline flex items-center gap-1"
                      >
                        Full Health Report <ChevronRight className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                )}

                {/* ── ANALYTICS ── */}
                {tab === "analytics" && (
                  <Section title="Platform Analytics" subtitle="Cross-college performance, trends & engagement metrics">
                    <SAAnalyticsTab />
                  </Section>
                )}

                {/* ── COLLEGES ── */}
                {tab === "colleges" && (
                  <Section title="College Management" subtitle="Create, configure, and manage institutions on the platform">
                    <CollegesTab colleges={colleges as College[]} isLoading={collegesLoading} />
                  </Section>
                )}

                {/* ── ADMINS ── */}
                {tab === "admins" && (
                  <Section title="Admin Management" subtitle="Assign admin roles and manage college administrators">
                    <AdminManagerTab />
                  </Section>
                )}

                {/* ── STUDENTS ── */}
                {tab === "students" && (
                  <Section title="Global Student Manager" subtitle="Search, monitor, and manage students across all colleges">
                    <SAStudentsTab />
                  </Section>
                )}

                {/* ── LECTURES ── */}
                {tab === "lectures" && (
                  <Section title="Global Lecture Monitor" subtitle="View and control lectures across all institutions">
                    <SALecturesTab />
                  </Section>
                )}

                {/* ── ACHIEVEMENTS ── */}
                {tab === "achievements" && (
                  <Section title="Achievement Manager" subtitle="Create, edit, and manage student achievement definitions">
                    <SAAchievementsTab />
                  </Section>
                )}

                {/* ── BROADCAST ── */}
                {tab === "broadcast" && (
                  <Section title="Broadcast Center" subtitle="Send platform-wide announcements and emergency alerts">
                    <SABroadcastTab />
                  </Section>
                )}

                {/* ── ACTIVITY ── */}
                {tab === "activity" && (
                  <Section title="Activity Logs" subtitle="Historical record of admin actions and system events">
                    <SAActivityLogsTab />
                  </Section>
                )}

                {/* ── SETTINGS ── */}
                {tab === "settings" && (
                  <Section title="Platform Settings" subtitle="Configure global platform parameters and defaults">
                    <SAPlatformSettingsTab />
                  </Section>
                )}

                {/* ── PLATFORM MODE ── */}
                {tab === "platform" && (
                  <Section title="Platform Mode Switchboard" subtitle="Control system-wide access modes — students affected, admins bypass all modes">
                    <SAPlatformModeTab />
                  </Section>
                )}

                {/* ── SECURITY ── */}
                {tab === "security" && (
                  <Section title="Security Monitor" subtitle="Audit logs, login activity, attendance corrections, and security alerts">
                    <SASecurityTab />
                  </Section>
                )}

                {/* ── HEALTH ── */}
                {tab === "health" && (
                  <Section title="System Health" subtitle="Real-time platform diagnostics — auto-refreshes every 30s">
                    <SystemHealthPanel />
                  </Section>
                )}

              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Export ───────────────────────────────────────────────────────────────
export default function SuperAdminDashboard() {
  return (
    <CollegeProvider>
      <DashboardInner />
    </CollegeProvider>
  );
}
