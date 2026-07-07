import { Suspense, lazy, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Activity,
  Building2,
  CheckSquare,
  ChevronRight,
  GraduationCap,
  Megaphone,
  Plus,
  Shield,
  UserCog,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageContainer, PageHeader } from "@/layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MetricCard } from "@/components/ui/MetricCard";
import { ActionTile } from "@/components/ui/ActionTile";
import { GlassCard } from "@/components/ui/GlassCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { CollegeProvider, useCollegeContext } from "@/contexts/CollegeContext";
import CollegeSwitcher from "./components/CollegeSwitcher";

const SAAnalyticsTab = lazy(() => import("./components/SAAnalyticsTab"));
const SABroadcastTab = lazy(() => import("./components/SABroadcastTab"));

type PlatformOverview = {
  total_colleges: number;
  total_students: number;
  total_lectures: number;
  total_attendance: number;
  active_admins: number;
  active_sessions: number;
};

type College = {
  id: string;
  college_name: string;
  subdomain: string | null;
  logo_url: string | null;
  is_active: boolean;
};

type CollegeAdmin = {
  user_id: string;
  college_id: string | null;
  college_name: string | null;
  name: string | null;
  email: string | null;
  created_at: string;
};

type SecurityLog = {
  id: string;
  action: string;
  performed_by: string;
  created_at: string;
  performer_name?: string;
};

const SECTION_ANIM = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.18 },
};

function usePlatformOverview() {
  return useQuery<PlatformOverview>({
    queryKey: ["super_admin", "command_center", "overview"],
    queryFn: async () => {
      const now = new Date();
      const activeSessionThreshold = new Date(now.getTime() - 15 * 60 * 1000).toISOString();

      const [
        { data: analytics, error: analyticsError },
        { count: adminCount, error: adminError },
        { count: activeSessions, error: sessionError },
      ] = await Promise.all([
        supabase.rpc("get_platform_analytics" as any),
        supabase.from("user_roles").select("user_id", { count: "exact", head: true }).eq("role", "admin" as any),
        supabase.from("login_activity").select("id", { count: "exact", head: true }).gte("created_at", activeSessionThreshold),
      ]);

      if (analyticsError) throw analyticsError;
      if (adminError) throw adminError;
      if (sessionError) throw sessionError;

      return {
        total_colleges: analytics?.total_colleges ?? 0,
        total_students: analytics?.total_students ?? 0,
        total_lectures: analytics?.total_lectures ?? 0,
        total_attendance: analytics?.total_attendance ?? 0,
        active_admins: adminCount ?? 0,
        active_sessions: activeSessions ?? 0,
      };
    },
    staleTime: 60_000,
  });
}

function usePaginatedColleges(page: number, pageSize: number) {
  return useQuery({
    queryKey: ["super_admin", "command_center", "colleges", page, pageSize],
    queryFn: async () => {
      const from = page * pageSize;
      const to = from + pageSize - 1;

      const [{ data: colleges, error: collegesError, count: total }, { data: adminsData }, { data: studentsData }] = await Promise.all([
        supabase
          .from("colleges")
          .select("id,college_name,subdomain,logo_url,is_active", { count: "exact" })
          .order("created_at", { ascending: false })
          .range(from, to),
        supabase.from("user_roles").select("college_id,user_id").eq("role", "admin" as any),
        supabase.from("profiles").select("college_id,user_id").eq("is_deleted", false),
      ]);

      if (collegesError) throw collegesError;

      const adminCounts = new Map<string, number>();
      const studentCounts = new Map<string, number>();

      (adminsData ?? []).forEach((row) => {
        if (!row.college_id) return;
        adminCounts.set(row.college_id, (adminCounts.get(row.college_id) ?? 0) + 1);
      });

      (studentsData ?? []).forEach((row) => {
        if (!row.college_id) return;
        studentCounts.set(row.college_id, (studentCounts.get(row.college_id) ?? 0) + 1);
      });

      return {
        rows: (colleges ?? []).map((college) => ({
          ...college,
          student_count: studentCounts.get(college.id) ?? 0,
          admin_count: adminCounts.get(college.id) ?? 0,
        })),
        total: total ?? 0,
      };
    },
    staleTime: 45_000,
  });
}

function useAdminManager() {
  return useQuery<CollegeAdmin[]>({
    queryKey: ["super_admin", "command_center", "admins"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_college_admins" as any);
      if (error) throw error;
      return (data as CollegeAdmin[]) ?? [];
    },
    staleTime: 45_000,
  });
}

function useSystemHealth() {
  return useQuery({
    queryKey: ["super_admin", "command_center", "health"],
    queryFn: async () => {
      const sessionThreshold = new Date(Date.now() - 15 * 60 * 1000).toISOString();

      const dbStart = performance.now();
      const dbResult = await supabase.from("platform_settings").select("key").limit(1);
      const dbLatency = Math.round(performance.now() - dbStart);

      const apiStart = performance.now();
      const { error: apiError } = await supabase.functions.invoke("health-check");
      const apiLatency = Math.round(performance.now() - apiStart);

      const [{ count: activeSessions }, { count: liveLectures }] = await Promise.all([
        supabase.from("login_activity").select("id", { count: "exact", head: true }).gte("created_at", sessionThreshold),
        supabase.from("lectures").select("id", { count: "exact", head: true }).eq("status", "live"),
      ]);

      return {
        db_ok: !dbResult.error,
        db_latency_ms: dbLatency,
        api_ok: !apiError,
        api_latency_ms: apiLatency,
        active_sessions: activeSessions ?? 0,
        live_lectures: liveLectures ?? 0,
      };
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

function useSecurityLogs(page: number, pageSize: number) {
  return useQuery<{ rows: SecurityLog[]; hasMore: boolean }>({
    queryKey: ["super_admin", "command_center", "security_logs", page, pageSize],
    queryFn: async () => {
      const from = page * pageSize;
      const to = from + pageSize - 1;
      const sensitiveActions = ["attendance_corrected", "admin_created", "lecture_created", "announcement_created", "admin_role_updated"];

      const { data, error } = await supabase
        .from("audit_logs")
        .select("id,action,performed_by,created_at")
        .in("action", sensitiveActions)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;

      const rows = (data ?? []) as SecurityLog[];
      const userIds = [...new Set(rows.map((row) => row.performed_by))];
      const { data: profiles } = userIds.length
        ? await supabase.from("profiles").select("user_id,name").in("user_id", userIds)
        : { data: [] as Array<{ user_id: string; name: string | null }> };

      const nameMap = new Map((profiles ?? []).map((p) => [p.user_id, p.name ?? "Unknown User"]));

      return {
        rows: rows.map((row) => ({ ...row, performer_name: nameMap.get(row.performed_by) ?? "System" })),
        hasMore: rows.length === pageSize,
      };
    },
    staleTime: 30_000,
  });
}

function SectionFrame({ id, title, subtitle, children }: { id: string; title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <motion.section id={id} {...SECTION_ANIM} className="space-y-3">
      <div className="space-y-1">
        <h2 className="font-heading text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{title}</h2>
        <p className="font-heading text-[15px] font-bold text-foreground">{subtitle}</p>
      </div>
      {children}
    </motion.section>
  );
}

function HealthBadge({ label, tone }: { label: string; tone: "operational" | "warning" | "critical" }) {
  const status = tone === "operational" ? "active" : tone === "warning" ? "upcoming" : "completed";
  return <StatusBadge status={status}>{label}</StatusBadge>;
}

function DashboardInner() {
  const queryClient = useQueryClient();
  const { activeCollege, setActiveCollegeId, colleges } = useCollegeContext();

  const [collegePage, setCollegePage] = useState(0);
  const [adminPage, setAdminPage] = useState(0);
  const [logsPage, setLogsPage] = useState(0);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showBroadcast, setShowBroadcast] = useState(false);

  const COLLEGE_PAGE_SIZE = 20;
  const ADMIN_PAGE_SIZE = 20;
  const LOGS_PAGE_SIZE = 10;

  const overviewQ = usePlatformOverview();
  const collegeQ = usePaginatedColleges(collegePage, COLLEGE_PAGE_SIZE);
  const adminQ = useAdminManager();
  const healthQ = useSystemHealth();
  const logsQ = useSecurityLogs(logsPage, LOGS_PAGE_SIZE);

  const admins = adminQ.data ?? [];
  const visibleAdmins = useMemo(() => {
    const from = adminPage * ADMIN_PAGE_SIZE;
    const to = from + ADMIN_PAGE_SIZE;
    return admins.slice(from, to);
  }, [admins, adminPage]);

  const reassignCollege = useMutation({
    mutationFn: async ({ userId, collegeId }: { userId: string; collegeId: string }) => {
      const { error } = await supabase
        .from("user_roles")
        .update({ college_id: collegeId })
        .eq("user_id", userId)
        .eq("role", "admin" as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Admin reassigned");
      queryClient.invalidateQueries({ queryKey: ["super_admin", "command_center", "admins"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const removeAdminRole = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "admin" as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Admin role removed");
      queryClient.invalidateQueries({ queryKey: ["super_admin", "command_center", "admins"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deactivateAdmin = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("profiles")
        .update({ is_deleted: true, deleted_at: new Date().toISOString() })
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Admin account deactivated");
      queryClient.invalidateQueries({ queryKey: ["super_admin", "command_center", "admins"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const toggleCollegeStatus = useMutation({
    mutationFn: async ({ collegeId, isActive }: { collegeId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("colleges")
        .update({ is_active: !isActive, updated_at: new Date().toISOString() })
        .eq("id", collegeId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("College status updated");
      queryClient.invalidateQueries({ queryKey: ["super_admin", "command_center", "colleges"] });
      queryClient.invalidateQueries({ queryKey: ["super_admin", "command_center", "overview"] });
      queryClient.invalidateQueries({ queryKey: ["super_admin", "colleges_ctx"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const overviewMetrics = [
    { icon: Building2, value: overviewQ.data?.total_colleges ?? 0, label: "Total Colleges" },
    { icon: Users, value: overviewQ.data?.total_students ?? 0, label: "Total Students" },
    { icon: GraduationCap, value: overviewQ.data?.total_lectures ?? 0, label: "Total Lectures" },
    { icon: CheckSquare, value: overviewQ.data?.total_attendance ?? 0, label: "Attendance Records" },
    { icon: UserCog, value: overviewQ.data?.active_admins ?? 0, label: "Active Admins" },
    { icon: Activity, value: overviewQ.data?.active_sessions ?? 0, label: "Active Sessions" },
  ];

  return (
    <PageContainer size="tablet" withBottomNav={false} className="space-y-6 py-4">
      {/* Premium Platform Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-border-subtle bg-gradient-to-br from-primary/20 via-accent/10 to-surface-1 p-5 shadow-elevated">
        <div className="pointer-events-none absolute -top-16 -right-12 h-48 w-48 rounded-full bg-primary/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-10 h-44 w-44 rounded-full bg-accent/20 blur-3xl" />
        <div className="relative flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-heading text-[11px] font-bold uppercase tracking-[0.16em] text-primary/80">Super Admin</p>
            <h1 className="font-heading text-2xl sm:text-3xl font-black text-foreground mt-1 tracking-tight">Platform Command Center</h1>
            <p className="text-sm text-muted-foreground mt-1.5">Mission control for colleges, admins, analytics, health, and security</p>
          </div>
          <CollegeSwitcher className="max-w-[200px]" />
        </div>
      </div>

      <SectionFrame
        id="platform-overview"
        title="Platform Overview Metrics"
        subtitle="Live platform-wide command metrics"
      >
        <div className="grid grid-cols-2 gap-3">
          {overviewQ.isLoading
            ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[132px] rounded-2xl" />)
            : overviewMetrics.map((metric) => (
                <MetricCard
                  key={metric.label}
                  icon={metric.icon}
                  value={metric.value}
                  label={metric.label}
                />
              ))}
        </div>
      </SectionFrame>

      <SectionFrame
        id="college-context"
        title="College Context Switcher"
        subtitle="Switch platform perspective instantly"
      >
        <GlassCard padding="md" radius="xl" className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {activeCollege?.logo_url ? (
                <img
                  src={activeCollege.logo_url}
                  alt={activeCollege.college_name}
                  className="h-10 w-10 rounded-xl object-cover border border-border-subtle"
                  loading="lazy"
                />
              ) : (
                <div className="h-10 w-10 rounded-xl border border-border-subtle bg-surface-3 flex items-center justify-center">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">
                  {activeCollege?.college_name ?? "All Colleges"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {activeCollege?.subdomain ? `${activeCollege.subdomain}.campusconnect.app` : "Global command scope"}
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="text-[10px]">Context</Badge>
          </div>
          <CollegeSwitcher />
        </GlassCard>
      </SectionFrame>

      <SectionFrame
        id="quick-actions"
        title="Quick Admin Actions"
        subtitle="Fast controls for high-priority platform tasks"
      >
        <div className="grid grid-cols-2 gap-3">
          <ActionTile icon={Plus} label="Create College" onClick={() => scrollToSection("college-manager")} />
          <ActionTile icon={UserCog} label="Create Admin" onClick={() => scrollToSection("admin-manager")} />
          <ActionTile icon={Megaphone} label="Send Platform Announcement" onClick={() => { setShowBroadcast(true); scrollToSection("announcement-control"); }} />
          <ActionTile icon={Shield} label="View Logs" onClick={() => scrollToSection("security-logs")} />
        </div>
      </SectionFrame>

      <SectionFrame
        id="college-manager"
        title="College Manager"
        subtitle="Manage college identity, status, and command jump"
      >
        <div className="space-y-3">
          {collegeQ.isLoading
            ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-2xl" />)
            : collegeQ.data?.rows.map((college) => (
                <GlassCard key={college.id} padding="md" radius="xl" className="space-y-3">
                  <div className="flex items-center gap-3">
                    {college.logo_url ? (
                      <img
                        src={college.logo_url}
                        alt={college.college_name}
                        className="h-10 w-10 rounded-xl object-cover border border-border-subtle"
                        loading="lazy"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-xl border border-border-subtle bg-surface-3 flex items-center justify-center">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground truncate">{college.college_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{college.subdomain ? `${college.subdomain}.campusconnect.app` : "No subdomain"}</p>
                    </div>
                    <StatusBadge status={college.is_active ? "active" : "completed"}>
                      {college.is_active ? "Active" : "Inactive"}
                    </StatusBadge>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl border border-border-subtle bg-surface-2 px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Students</p>
                      <p className="text-base font-bold text-foreground tabular-nums">{college.student_count.toLocaleString()}</p>
                    </div>
                    <div className="rounded-xl border border-border-subtle bg-surface-2 px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Admins</p>
                      <p className="text-base font-bold text-foreground tabular-nums">{college.admin_count.toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <Button variant="outline" className="h-12 text-xs" onClick={() => toast.message("Use College settings in this card to edit details")}>Edit College</Button>
                    <Button
                      variant="outline"
                      className="h-12 text-xs"
                      onClick={() => toggleCollegeStatus.mutate({ collegeId: college.id, isActive: college.is_active })}
                    >
                      {college.is_active ? "Deactivate" : "Activate"}
                    </Button>
                    <Button
                      className="h-12 text-xs"
                      onClick={() => {
                        setActiveCollegeId(college.id);
                        window.location.href = "/platform/admin/dashboard";
                      }}
                    >
                      View Dashboard
                    </Button>
                  </div>
                </GlassCard>
              ))}
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Showing {(collegePage * COLLEGE_PAGE_SIZE) + 1}–{Math.min((collegePage + 1) * COLLEGE_PAGE_SIZE, collegeQ.data?.total ?? 0)} of {(collegeQ.data?.total ?? 0).toLocaleString()}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="h-10 text-xs" disabled={collegePage === 0} onClick={() => setCollegePage((p) => p - 1)}>Previous</Button>
            <Button
              variant="outline"
              className="h-10 text-xs"
              disabled={((collegePage + 1) * COLLEGE_PAGE_SIZE) >= (collegeQ.data?.total ?? 0)}
              onClick={() => setCollegePage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </SectionFrame>

      <SectionFrame
        id="admin-manager"
        title="Admin Manager"
        subtitle="Reassign, deactivate, or remove admin privileges"
      >
        <div className="space-y-3">
          {adminQ.isLoading
            ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-2xl" />)
            : visibleAdmins.map((admin) => (
                <GlassCard key={admin.user_id} padding="md" radius="xl" className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{admin.name ?? "Unknown"}</p>
                      <p className="text-xs text-muted-foreground truncate">{admin.email ?? "—"}</p>
                      <p className="text-xs text-muted-foreground mt-1">{admin.college_name ?? "Unassigned college"}</p>
                    </div>
                    <Badge variant="secondary" className="text-[10px]">Admin</Badge>
                  </div>

                  <Select
                    value={admin.college_id ?? "unassigned"}
                    onValueChange={(value) => {
                      if (value === "unassigned") return;
                      reassignCollege.mutate({ userId: admin.user_id, collegeId: value });
                    }}
                  >
                    <SelectTrigger className="h-12 bg-surface-2 border-border-subtle text-xs">
                      <SelectValue placeholder="Reassign college" />
                    </SelectTrigger>
                    <SelectContent className="bg-surface-1 border-border-subtle">
                      {colleges.map((college) => (
                        <SelectItem key={college.id} value={college.id}>{college.college_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" className="h-12 text-xs" onClick={() => deactivateAdmin.mutate(admin.user_id)}>Deactivate Admin</Button>
                    <Button variant="outline" className="h-12 text-xs" onClick={() => removeAdminRole.mutate(admin.user_id)}>Remove Role</Button>
                  </div>
                </GlassCard>
              ))}
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Showing {(adminPage * ADMIN_PAGE_SIZE) + 1}–{Math.min((adminPage + 1) * ADMIN_PAGE_SIZE, admins.length)} of {admins.length.toLocaleString()}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="h-10 text-xs" disabled={adminPage === 0} onClick={() => setAdminPage((p) => p - 1)}>Previous</Button>
            <Button
              variant="outline"
              className="h-10 text-xs"
              disabled={((adminPage + 1) * ADMIN_PAGE_SIZE) >= admins.length}
              onClick={() => setAdminPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </SectionFrame>

      <SectionFrame
        id="platform-analytics"
        title="Platform Analytics"
        subtitle="Growth, activity, attendance trends, and points distribution"
      >
        {!showAnalytics ? (
          <GlassCard padding="md" radius="xl" className="space-y-3">
            <p className="text-xs text-muted-foreground">Analytics charts are lazy-loaded for faster initial dashboard performance.</p>
            <Button className="h-12" onClick={() => setShowAnalytics(true)}>Load Platform Analytics</Button>
          </GlassCard>
        ) : (
          <Suspense fallback={<Skeleton className="h-80 rounded-2xl" />}>
            <SAAnalyticsTab />
          </Suspense>
        )}
      </SectionFrame>

      <SectionFrame
        id="system-health"
        title="System Health Panel"
        subtitle="Database, API latency, sessions, and live platform state"
      >
        <div className="grid grid-cols-2 gap-3">
          <GlassCard padding="md" radius="xl" className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground">Database Status</p>
              <HealthBadge label={healthQ.data?.db_ok ? "Operational" : "Critical"} tone={healthQ.data?.db_ok ? "operational" : "critical"} />
            </div>
            {healthQ.isLoading ? <Skeleton className="h-6 w-20" /> : <p className="text-lg font-bold text-foreground tabular-nums">{healthQ.data?.db_latency_ms ?? 0}ms</p>}
          </GlassCard>

          <GlassCard padding="md" radius="xl" className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground">API Latency</p>
              <HealthBadge
                label={
                  (healthQ.data?.api_latency_ms ?? 0) > 900
                    ? "Critical"
                    : (healthQ.data?.api_latency_ms ?? 0) > 500
                    ? "Warning"
                    : "Operational"
                }
                tone={
                  (healthQ.data?.api_latency_ms ?? 0) > 900
                    ? "critical"
                    : (healthQ.data?.api_latency_ms ?? 0) > 500
                    ? "warning"
                    : "operational"
                }
              />
            </div>
            {healthQ.isLoading ? <Skeleton className="h-6 w-20" /> : <p className="text-lg font-bold text-foreground tabular-nums">{healthQ.data?.api_latency_ms ?? 0}ms</p>}
          </GlassCard>

          <GlassCard padding="md" radius="xl" className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">Active Sessions</p>
            {healthQ.isLoading ? <Skeleton className="h-6 w-20" /> : <p className="text-lg font-bold text-foreground tabular-nums">{(healthQ.data?.active_sessions ?? 0).toLocaleString()}</p>}
          </GlassCard>

          <GlassCard padding="md" radius="xl" className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">Live Lectures</p>
            {healthQ.isLoading ? <Skeleton className="h-6 w-20" /> : <p className="text-lg font-bold text-foreground tabular-nums">{(healthQ.data?.live_lectures ?? 0).toLocaleString()}</p>}
          </GlassCard>
        </div>
      </SectionFrame>

      <SectionFrame
        id="announcement-control"
        title="Announcement Control"
        subtitle="Broadcast platform-wide announcements instantly"
      >
        {!showBroadcast ? (
          <GlassCard padding="md" radius="xl" className="space-y-3">
            <p className="text-xs text-muted-foreground">Broadcast composer is lazy-loaded to keep the command center fast.</p>
            <Button className="h-12" onClick={() => setShowBroadcast(true)}>Open Broadcast Composer</Button>
          </GlassCard>
        ) : (
          <Suspense fallback={<Skeleton className="h-80 rounded-2xl" />}>
            <SABroadcastTab />
          </Suspense>
        )}
      </SectionFrame>

      <SectionFrame
        id="security-logs"
        title="Security Logs"
        subtitle="Recent sensitive actions across platform operations"
      >
        <GlassCard padding="none" radius="xl" className="overflow-hidden">
          {logsQ.isLoading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
            </div>
          ) : (
            <div className="divide-y divide-border-subtle">
              {(logsQ.data?.rows ?? []).map((log) => (
                <div key={log.id} className="flex items-start gap-3 p-4">
                  <div className="h-9 w-9 rounded-xl bg-surface-3 border border-border-subtle flex items-center justify-center shrink-0">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{log.action.replace(/_/g, " ")}</p>
                    <p className="text-xs text-muted-foreground truncate">{log.performer_name}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleDateString()}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(log.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Latest sensitive actions</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="h-10 text-xs" disabled={logsPage === 0} onClick={() => setLogsPage((p) => p - 1)}>Previous</Button>
            <Button variant="outline" className="h-10 text-xs" disabled={!logsQ.data?.hasMore} onClick={() => setLogsPage((p) => p + 1)}>
              Next <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </SectionFrame>

      <div className="h-6" />
    </PageContainer>
  );
}

export default function SuperAdminDashboard() {
  return (
    <CollegeProvider>
      <DashboardInner />
    </CollegeProvider>
  );
}
