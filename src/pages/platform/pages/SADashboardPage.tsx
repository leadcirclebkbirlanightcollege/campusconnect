/**
 * Super Admin — dedicated page wrappers
 * These wrap the existing components for use in route-based navigation.
 */

// Dashboard (overview from original SuperAdminDashboard)
import { Suspense, lazy, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Activity, Building2, CheckSquare, ChevronRight, GraduationCap,
  Megaphone, Plus, Shield, UserCog, Users,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useCollegeContext } from "@/contexts/CollegeContext";
import CollegeSwitcher from "@/pages/platform/components/CollegeSwitcher";
import { useNavigate } from "react-router-dom";

const SAAnalyticsTab = lazy(() => import("@/pages/platform/components/SAAnalyticsTab"));
const SABroadcastTab = lazy(() => import("@/pages/platform/components/SABroadcastTab"));

const SECTION_ANIM = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.18 } };

function SectionFrame({ id, title, subtitle, children }: { id: string; title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <motion.section id={id} {...SECTION_ANIM} className="space-y-3">
      <div><h2 className="text-sm font-bold text-foreground">{title}</h2><p className="text-xs text-muted-foreground">{subtitle}</p></div>
      {children}
    </motion.section>
  );
}

function usePlatformOverview() {
  return useQuery({
    queryKey: ["sa_cmd", "overview"],
    queryFn: async () => {
      const activeSessionThreshold = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      const [{ data: analytics }, { count: adminCount }, { count: activeSessions }] = await Promise.all([
        supabase.rpc("get_platform_analytics" as any),
        supabase.from("user_roles").select("user_id", { count: "exact", head: true }).eq("role", "admin" as any),
        supabase.from("login_activity").select("id", { count: "exact", head: true }).gte("created_at", activeSessionThreshold),
      ]);
      return {
        total_colleges: (analytics as any)?.total_colleges ?? 0,
        total_students: (analytics as any)?.total_students ?? 0,
        total_lectures: (analytics as any)?.total_lectures ?? 0,
        total_attendance: (analytics as any)?.total_attendance ?? 0,
        active_admins: adminCount ?? 0,
        active_sessions: activeSessions ?? 0,
      };
    },
    staleTime: 60_000,
  });
}

export default function SADashboardPage() {
  const navigate = useNavigate();
  const overviewQ = usePlatformOverview();
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
      <PageHeader title="Platform Command Center" subtitle="Mission control for colleges, admins, analytics, health, and security"
        action={<CollegeSwitcher className="max-w-[200px]" />} />

      <SectionFrame id="overview" title="Platform Overview Metrics" subtitle="Live platform-wide command metrics">
        <div className="grid grid-cols-2 gap-3">
          {overviewQ.isLoading
            ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[132px] rounded-2xl" />)
            : overviewMetrics.map((m) => <MetricCard key={m.label} icon={m.icon} value={m.value} label={m.label} />)}
        </div>
      </SectionFrame>

      <SectionFrame id="quick-actions" title="Quick Actions" subtitle="Navigate to key management areas">
        <div className="grid grid-cols-2 gap-3">
          <ActionTile icon={Building2} label="Manage Colleges" onClick={() => navigate("/platform/admin-control/colleges")} />
          <ActionTile icon={UserCog} label="Manage Admins" onClick={() => navigate("/platform/admin-control/admins")} />
          <ActionTile icon={Shield} label="Security Logs" onClick={() => navigate("/platform/admin-control/security")} />
          <ActionTile icon={Megaphone} label="Analytics" onClick={() => navigate("/platform/admin-control/analytics")} />
        </div>
      </SectionFrame>
    </PageContainer>
  );
}
