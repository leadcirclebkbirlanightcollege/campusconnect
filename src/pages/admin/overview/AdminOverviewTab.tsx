import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  AlarmClock,
  Bell,
  BookOpen,
  CheckSquare,
  Megaphone,
  PlayCircle,
  Radio,
  Sparkles,
  TriangleAlert,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { ActionTile } from "@/components/ui/ActionTile";
import { GlassCard } from "@/components/ui/GlassCard";
import { MetricCard } from "@/components/ui/MetricCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MetricCountUp } from "@/components/ui/motion";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { PageContainer } from "@/layout/PageContainer";
import { PageHeader } from "@/layout/PageHeader";
import { SECTION_REVEAL_ITEM, SECTION_REVEAL_PARENT } from "@/motion/microInteractions";

type CommandMetrics = {
  totalStudents: number;
  lecturesConducted: number;
  attendanceToday: number;
  activeLectures: number;
};

type LiveLecture = {
  id: string;
  topic: string;
  venue: string;
  start_time: string;
  lecture_date: string;
  presentCount: number;
};

type AnalyticsMetrics = {
  averageAttendance: number;
  totalPoints: number;
  studentsAtRisk: number;
  topStudentName: string;
  topStudentPoints: number;
};

type ActivityItem = {
  id: string;
  action: string;
  target_entity: string;
  created_at: string;
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function activityIcon(action: string) {
  const normalized = action.toLowerCase();
  if (normalized.includes("lecture")) return BookOpen;
  if (normalized.includes("attendance")) return CheckSquare;
  if (normalized.includes("announce")) return Megaphone;
  if (normalized.includes("notification")) return Bell;
  return Sparkles;
}

export default function AdminOverviewTab({ onNavigateTab }: { onNavigateTab: (tab: string) => void }) {
  const qc = useQueryClient();
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementBody, setAnnouncementBody] = useState("");
  const announcementRef = useRef<HTMLDivElement>(null);

  const { startIso, endIso } = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { startIso: start.toISOString(), endIso: end.toISOString() };
  }, []);

  const commandMetricsQuery = useQuery({
    queryKey: ["admin", "command-center", "metrics", startIso],
    queryFn: async (): Promise<CommandMetrics> => {
      const [studentsRes, lecturesRes, todayAttendanceRes, activeLecturesRes] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_deleted", false),
        supabase.from("lectures").select("id", { count: "exact", head: true }).eq("status", "ended"),
        supabase
          .from("attendance")
          .select("id", { count: "exact", head: true })
          .gte("marked_at", startIso)
          .lt("marked_at", endIso),
        supabase.from("lectures").select("id", { count: "exact", head: true }).eq("status", "live"),
      ]);

      return {
        totalStudents: studentsRes.count ?? 0,
        lecturesConducted: lecturesRes.count ?? 0,
        attendanceToday: todayAttendanceRes.count ?? 0,
        activeLectures: activeLecturesRes.count ?? 0,
      };
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const liveLecturesQuery = useQuery({
    queryKey: ["admin", "command-center", "live-lectures"],
    queryFn: async (): Promise<LiveLecture[]> => {
      const { data, error } = await supabase
        .from("lectures")
        .select("id,topic,venue,start_time,lecture_date")
        .eq("status", "live")
        .order("start_time", { ascending: true })
        .limit(4);

      if (error) throw error;

      const liveRows = data ?? [];
      const presentCounts = await Promise.all(
        liveRows.map(async (row) => {
          const { count } = await supabase
            .from("attendance")
            .select("id", { count: "exact", head: true })
            .eq("lecture_id", row.id)
            .eq("status", "present");
          return { lectureId: row.id, count: count ?? 0 };
        }),
      );

      const presentMap = new Map(presentCounts.map((entry) => [entry.lectureId, entry.count]));

      return liveRows.map((row) => ({
        ...row,
        presentCount: presentMap.get(row.id) ?? 0,
      }));
    },
    staleTime: 15_000,
    refetchInterval: 20_000,
    refetchOnWindowFocus: false,
  });

  const analyticsQuery = useQuery({
    queryKey: ["admin", "command-center", "student-analytics"],
    queryFn: async (): Promise<AnalyticsMetrics> => {
      const [attendedRes, totalAttendanceRes, riskRes, platformStatsRes, topStudentRes] = await Promise.all([
        supabase
          .from("attendance")
          .select("id", { count: "exact", head: true })
          .in("status", ["present", "late"]),
        supabase.from("attendance").select("id", { count: "exact", head: true }),
        supabase
          .from("student_intelligence")
          .select("id", { count: "exact", head: true })
          .or("attendance_consistency.lt.50,engagement_index.lt.40"),
        supabase.rpc("get_platform_analytics"),
        supabase.rpc("get_leaderboard", { p_limit: 1, p_verified_only: false }),
      ]);

      const attended = attendedRes.count ?? 0;
      const totalAttendance = totalAttendanceRes.count ?? 0;
      const averageAttendance = totalAttendance > 0 ? Math.round((attended / totalAttendance) * 100) : 0;
      const platformStats = platformStatsRes.data as any;
      const topStudent = ((topStudentRes.data as any[]) ?? [])[0];

      return {
        averageAttendance,
        totalPoints: Number(platformStats?.total_points_awarded ?? 0),
        studentsAtRisk: riskRes.count ?? 0,
        topStudentName: topStudent?.name ?? "—",
        topStudentPoints: Number(topStudent?.points_total ?? 0),
      };
    },
    staleTime: 45_000,
    refetchOnWindowFocus: false,
  });

  const activityQuery = useQuery({
    queryKey: ["admin", "command-center", "recent-activity"],
    queryFn: async (): Promise<ActivityItem[]> => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("id,action,target_entity,created_at")
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      return (data ?? []) as ActivityItem[];
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const announcementMutation = useMutation({
    mutationFn: async () => {
      const trimmedTitle = announcementTitle.trim();
      const trimmedBody = announcementBody.trim();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Not authenticated");

      const { error } = await supabase.from("announcements").insert({
        title: trimmedTitle,
        description: trimmedBody,
        priority: "normal",
        target: "all",
        target_class: null,
        created_by: auth.user.id,
      });
      if (error) throw error;

      const { error: notifyError } = await supabase.functions.invoke("send-notification", {
        body: {
          title: trimmedTitle,
          message: trimmedBody,
          kind: "announcement",
          target_type: "college_students",
          target_value: null,
        },
      });

      if (notifyError) throw notifyError;
    },
    onSuccess: () => {
      toast.success("Announcement sent");
      setAnnouncementTitle("");
      setAnnouncementBody("");
      qc.invalidateQueries({ queryKey: ["admin", "command-center", "recent-activity"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to send announcement"),
  });

  const commandMetrics = commandMetricsQuery.data;
  const analytics = analyticsQuery.data;

  return (
    <PageContainer className="space-y-6" withBottomNav>
      <PageHeader
        title="Admin Command Center"
        subtitle="Control lectures, attendance, students, and announcements"
        variant="large"
        gradient
      />

      <motion.div variants={SECTION_REVEAL_PARENT} initial="hidden" animate="show" className="space-y-6">
        <motion.section variants={SECTION_REVEAL_ITEM} className="space-y-3">
          <SectionHeader title="Command Overview" subtitle="Real-time command metrics" />
          {commandMetricsQuery.isLoading ? (
            <div className="grid grid-cols-2 gap-3">
              {[...Array(4)].map((_, index) => (
                <Skeleton key={index} className="h-[124px] rounded-2xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <MetricCard icon={Users} value={commandMetrics?.totalStudents ?? 0} label="Total Students" />
              <MetricCard icon={BookOpen} value={commandMetrics?.lecturesConducted ?? 0} label="Lectures Conducted" />
              <MetricCard icon={CheckSquare} value={commandMetrics?.attendanceToday ?? 0} label="Attendance Today" />
              <MetricCard icon={Radio} value={commandMetrics?.activeLectures ?? 0} label="Active Lectures" />
            </div>
          )}
        </motion.section>

        <motion.section variants={SECTION_REVEAL_ITEM} className="space-y-3">
          <SectionHeader title="Quick Actions" subtitle="Execute admin tasks faster" />
          <div className="grid grid-cols-2 gap-3">
            <ActionTile icon={BookOpen} label="Create Lecture" onClick={() => onNavigateTab("lectures")} />
            <ActionTile icon={PlayCircle} label="Start Lecture" onClick={() => onNavigateTab("lectures")} />
            <ActionTile icon={CheckSquare} label="Mark Attendance" onClick={() => onNavigateTab("attendance")} />
            <ActionTile
              icon={Megaphone}
              label="Send Announcement"
              onClick={() => announcementRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
            />
          </div>
        </motion.section>

        <motion.section variants={SECTION_REVEAL_ITEM} className="space-y-3">
          <SectionHeader title="Live Lecture Monitor" subtitle="Track active sessions instantly" />
          {liveLecturesQuery.isLoading ? (
            <div className="space-y-3">
              {[...Array(2)].map((_, index) => (
                <Skeleton key={index} className="h-36 rounded-2xl" />
              ))}
            </div>
          ) : liveLecturesQuery.data && liveLecturesQuery.data.length > 0 ? (
            <div className="space-y-3">
              {liveLecturesQuery.data.map((lecture) => (
                <GlassCard key={lecture.id} className="space-y-3 border-primary/35 bg-gradient-to-br from-primary/10 to-surface-1" hover={false}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="mb-1">
                        <StatusBadge status="live">LIVE</StatusBadge>
                      </div>
                      <p className="line-clamp-1 text-sm font-semibold text-foreground">{lecture.topic}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {lecture.venue} • {lecture.start_time}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Present</p>
                      <p className="text-xl font-black text-primary tabular-nums">
                        <MetricCountUp value={lecture.presentCount} duration={800} />
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button className="h-12" variant="secondary" onClick={() => onNavigateTab("attendance")}>
                      View Attendance
                    </Button>
                    <Button className="h-12" onClick={() => onNavigateTab("lectures")}>End Lecture</Button>
                  </div>
                </GlassCard>
              ))}
            </div>
          ) : (
            <GlassCard hover={false}>
              <p className="text-sm text-muted-foreground">No active lectures right now.</p>
            </GlassCard>
          )}
        </motion.section>

        <motion.section variants={SECTION_REVEAL_ITEM} className="space-y-3">
          <SectionHeader title="Student Analytics" subtitle="Performance snapshot" />
          {analyticsQuery.isLoading ? (
            <div className="grid grid-cols-2 gap-3">
              {[...Array(4)].map((_, index) => (
                <Skeleton key={index} className="h-[124px] rounded-2xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <MetricCard icon={AlarmClock} value={analytics?.averageAttendance ?? 0} suffix="%" label="Average Attendance" />
              <MetricCard icon={Sparkles} value={analytics?.totalPoints ?? 0} label="Points Distributed" />
              <MetricCard icon={TriangleAlert} value={analytics?.studentsAtRisk ?? 0} label="Students At Risk" />
              <GlassCard className="space-y-1" hover={false}>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Top Performing Student</p>
                <p className="line-clamp-1 text-sm font-semibold text-foreground">{analytics?.topStudentName ?? "—"}</p>
                <p className="text-xl font-black text-primary tabular-nums">
                  <MetricCountUp value={analytics?.topStudentPoints ?? 0} duration={800} />
                </p>
              </GlassCard>
            </div>
          )}
        </motion.section>

        <motion.section ref={announcementRef} variants={SECTION_REVEAL_ITEM} className="space-y-3">
          <SectionHeader title="Announcement Shortcut" subtitle="Broadcast quickly to all students" />
          <GlassCard className="space-y-3" hover={false}>
            <Input
              value={announcementTitle}
              onChange={(event) => setAnnouncementTitle(event.target.value)}
              placeholder="Announcement title"
              className="h-12"
            />
            <Textarea
              value={announcementBody}
              onChange={(event) => setAnnouncementBody(event.target.value)}
              placeholder="Write announcement..."
              rows={3}
            />
            <Button
              className="h-12 w-full"
              onClick={() => announcementMutation.mutate()}
              disabled={!announcementTitle.trim() || !announcementBody.trim() || announcementMutation.isPending}
            >
              {announcementMutation.isPending ? "Sending..." : "Send to All Students"}
            </Button>
          </GlassCard>
        </motion.section>

        <motion.section variants={SECTION_REVEAL_ITEM} className="space-y-3">
          <SectionHeader title="Recent Admin Activity" subtitle="Latest 10 actions" />
          {activityQuery.isLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, index) => (
                <Skeleton key={index} className="h-16 rounded-2xl" />
              ))}
            </div>
          ) : activityQuery.data && activityQuery.data.length > 0 ? (
            <div className="space-y-3">
              {activityQuery.data.map((item) => {
                const Icon = activityIcon(item.action);
                return (
                  <GlassCard key={item.id} className="flex items-start gap-3" hover={false}>
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground line-clamp-1">
                        {item.action.replaceAll("_", " ")} • {item.target_entity}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(item.created_at)}</p>
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          ) : (
            <GlassCard hover={false}>
              <p className="text-sm text-muted-foreground">No recent admin activity.</p>
            </GlassCard>
          )}
        </motion.section>
      </motion.div>
    </PageContainer>
  );
}
