import { memo, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  ArrowRight,
  BookOpen,
  CalendarCheck,
  CheckCircle2,
  Clock3,
  Flame,
  ShieldAlert,
  Sparkles,
  Trophy,
  User,
  Zap,
  Brain,
  Scan,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { motion } from "framer-motion";

import { supabase } from "@/integrations/supabase/client";
import { useGrowthInsights } from "@/hooks/use-growth-insights";
import { useStudentIntelligence } from "@/hooks/use-intelligence";
import { TIER_CONFIG } from "@/lib/intelligenceEngine";
import { cn } from "@/lib/utils";

import { PageContainer } from "@/layout/PageContainer";
import { PageHeader } from "@/layout/PageHeader";
import { PageSkeleton } from "@/components/skeleton/PageSkeleton";
import { DailyCheckinCard } from "@/components/student/DailyCheckinCard";
import { ActionTile } from "@/components/ui/ActionTile";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlowButton } from "@/components/ui/GlowButton";
import { MetricCard } from "@/components/ui/MetricCard";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  SECTION_REVEAL_ITEM,
  SECTION_REVEAL_PARENT,
} from "@/motion/microInteractions";

type UpcomingLecture = {
  id: string;
  topic: string;
  lecture_date: string;
  start_time: string;
  venue: string;
  status?: "scheduled" | "live" | "ended";
};

type RecentPoint = {
  id: string;
  created_at: string;
  points: number;
  source: string;
  note: string | null;
};

type TierKey = "bronze" | "silver" | "gold" | "elite";

const TIER_THRESHOLDS = { bronze: 0, silver: 100, gold: 250, elite: 500 } as const;
const TIER_NEXT = { bronze: "silver", silver: "gold", gold: "elite", elite: null } as const;

async function fetchDashboardCore() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const user = session?.user;
  if (!user) throw new Error("unauthenticated");

  const [{ data: profile }, { data: pointsTotal }, { data: streakRaw }, { data: liveList }] =
    await Promise.all([
      supabase.from("profiles").select("name").eq("user_id", user.id).maybeSingle(),
      supabase.rpc("get_my_points_total"),
      supabase.rpc("get_my_streak"),
      supabase
        .from("lectures")
        .select("id,topic,lecture_date,start_time,venue,status")
        .eq("status", "live")
        .limit(1),
    ]);

  const streak = streakRaw as { current_streak?: number; longest_streak?: number } | null;

  return {
    userId: user.id,
    name: profile?.name?.split(" ")[0] ?? "Student",
    totalPoints: Number(pointsTotal ?? 0),
    currentStreak: streak?.current_streak ?? 0,
    longestStreak: streak?.longest_streak ?? 0,
    liveNow: ((liveList ?? [])[0] as UpcomingLecture | undefined) ?? null,
  };
}

async function fetchDashboardSecondary(userId: string) {
  const today = new Date().toISOString().split("T")[0];

  const [{ count: attended }, { count: total }, { data: upcoming }, { data: points }] = await Promise.all([
    supabase
      .from("attendance")
      .select("id", { count: "exact", head: true })
      .eq("student_user_id", userId)
      .eq("status", "present"),
    supabase.from("lectures").select("id", { count: "exact", head: true }),
    supabase
      .from("lectures")
      .select("id,topic,lecture_date,start_time,venue,status")
      .gte("lecture_date", today)
      .neq("status", "ended")
      .order("lecture_date", { ascending: true })
      .order("start_time", { ascending: true })
      .limit(1),
    supabase
      .from("points_ledger")
      .select("id,created_at,points,source,note")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  return {
    attended: attended ?? 0,
    total: total ?? 0,
    nextLecture: ((upcoming ?? [])[0] as UpcomingLecture | undefined) ?? null,
    activities: (points ?? []) as RecentPoint[],
  };
}

function getTierProgress(points: number, tier: TierKey) {
  const next = TIER_NEXT[tier];
  if (!next) return { pct: 100, remaining: 0, nextLabel: "Max Tier" };
  const from = TIER_THRESHOLDS[tier];
  const to = TIER_THRESHOLDS[next];
  const pct = Math.min(100, Math.round(((points - from) / (to - from)) * 100));
  return {
    pct,
    remaining: Math.max(0, to - points),
    nextLabel: TIER_CONFIG[next].label,
  };
}

function getGreeting(now = new Date()) {
  const h = now.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function sourceMeta(source: string) {
  const normalized = source.toLowerCase();
  if (normalized.includes("attendance")) return { label: "Attendance marked", icon: CalendarCheck };
  if (normalized.includes("checkin")) return { label: "Daily check-in", icon: Flame };
  if (normalized.includes("achievement")) return { label: "Achievement unlocked", icon: Trophy };
  return { label: source.replace(/_/g, " "), icon: Zap };
}

export default function StudentDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const intelligence = useStudentIntelligence();
  const growth = useGrowthInsights();

  const greeting = useMemo(() => getGreeting(), []);

  const coreQuery = useQuery({
    queryKey: ["dashboard", "core"],
    queryFn: fetchDashboardCore,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const secondaryQuery = useQuery({
    queryKey: ["dashboard", "secondary", coreQuery.data?.userId],
    queryFn: async () => fetchDashboardSecondary(coreQuery.data!.userId),
    enabled: Boolean(coreQuery.data?.userId),
    staleTime: 45_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!coreQuery.data) return;

    void queryClient.prefetchQuery({
      queryKey: ["leaderboard", { verifiedOnly: false }],
      queryFn: async () => {
        const { data, error } = await supabase.rpc("get_leaderboard", {
          p_limit: 100,
          p_verified_only: false,
        });
        if (error) throw error;
        return data ?? [];
      },
      staleTime: 60_000,
    });

    void queryClient.prefetchQuery({
      queryKey: ["student", "attendance", "all"],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("attendance")
          .select("id,lecture_id,status,marked_at,points_earned")
          .eq("student_user_id", coreQuery.data.userId)
          .order("marked_at", { ascending: false })
          .limit(500);
        if (error) throw error;
        return data ?? [];
      },
      staleTime: 45_000,
    });
  }, [coreQuery.data, queryClient]);

  if (coreQuery.isLoading) {
    return (
      <PageContainer>
        <PageSkeleton variant="dashboard" className="px-0" />
      </PageContainer>
    );
  }

  if (coreQuery.isError || !coreQuery.data) {
    return (
      <PageContainer className="space-y-6">
        <PageHeader title="Dashboard" subtitle="Unable to load your dashboard right now" variant="large" />
        <GlassCard>
          <p className="text-sm text-muted-foreground">Please refresh and try again.</p>
        </GlassCard>
      </PageContainer>
    );
  }

  const totalLectures = secondaryQuery.data?.total ?? 0;
  const attended = secondaryQuery.data?.attended ?? 0;
  const attendancePct = totalLectures > 0 ? Math.round((attended / totalLectures) * 100) : 0;

  const tier = (intelligence.data?.tier ?? "bronze") as TierKey;
  const tierConfig = TIER_CONFIG[tier];
  const tierProgress = getTierProgress(coreQuery.data.totalPoints, tier);

  const lecture = coreQuery.data.liveNow ?? secondaryQuery.data?.nextLecture ?? null;
  const lectureIsLive = lecture?.status === "live";
  const riskLevel = growth.data?.risk_probability ?? "low";

  const insightCards = [
    growth.data?.trend_direction === "improving"
      ? { icon: TrendingUp, text: "Attendance is improving this week.", tone: "success" }
      : growth.data?.trend_direction === "declining"
      ? { icon: TrendingDown, text: "Risk is rising — attend your next lecture.", tone: "warning" }
      : null,
    tierProgress.remaining > 0
      ? {
          icon: Sparkles,
          text: `${tierProgress.remaining} points to reach ${tierProgress.nextLabel}.`,
          tone: "primary",
        }
      : null,
    {
      icon: Flame,
      text:
        coreQuery.data.currentStreak > 0
          ? `${coreQuery.data.currentStreak}-day streak active. Keep your momentum.`
          : "Start your streak with today’s check-in.",
      tone: "warning",
    },
  ].filter(Boolean) as Array<{ icon: typeof Sparkles; text: string; tone: "success" | "warning" | "primary" }>;

  return (
    <PageContainer className="space-y-6" withBottomNav>
      <PageHeader title="Dashboard" subtitle={`${greeting}, ${coreQuery.data.name}`} variant="large" gradient />

      <motion.div variants={SECTION_REVEAL_PARENT} initial="hidden" animate="show" className="space-y-6">
        <motion.section variants={SECTION_REVEAL_ITEM}>
          <GlassCard className="space-y-4" padding="lg" elevation="high">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{greeting}</p>
                <h1 className="text-[28px] font-black leading-none text-foreground truncate">{coreQuery.data.name}</h1>
                <StatusBadge status="active" className={cn(tierConfig.bg, tierConfig.border, tierConfig.color)}>
                  {tierConfig.label} Tier
                </StatusBadge>
              </div>
              <ProgressRing value={attendancePct} className="shrink-0" size={104} />
            </div>

            <div className="grid grid-cols-3 gap-3 border-t border-border-subtle pt-4">
              <HeroStat label="Points" value={coreQuery.data.totalPoints} />
              <HeroStat label="Streak" value={coreQuery.data.currentStreak} suffix="d" />
              <HeroStat label="Attendance" value={attendancePct} suffix="%" />
            </div>
          </GlassCard>
        </motion.section>

        <motion.section variants={SECTION_REVEAL_ITEM} className="space-y-3">
          <SectionHeader title="Quick Actions" subtitle="One-tap shortcuts" />
          <div className="grid grid-cols-2 gap-3">
            <ActionTile icon={Flame} label="Daily Check-In" onClick={() => document.getElementById("daily-checkin")?.scrollIntoView({ behavior: "smooth" })} />
            <ActionTile icon={CalendarCheck} label="Attendance" onClick={() => navigate("/app/attendance")} />
            <ActionTile icon={Trophy} label="Leaderboard" onClick={() => navigate("/app/leaderboard")} />
            <ActionTile icon={BookOpen} label="Lectures" onClick={() => navigate("/app/lectures")} />
          </div>
        </motion.section>

        <motion.section variants={SECTION_REVEAL_ITEM} className="space-y-3">
          <SectionHeader title="Lecture" subtitle={lectureIsLive ? "Happening now" : "Up next"} />
          <GlassCard className="space-y-3" hover>
            {lecture ? (
              <>
                <div className="flex items-center justify-between gap-2">
                  <StatusBadge status={lectureIsLive ? "live" : "upcoming"}>{lectureIsLive ? "Live" : "Upcoming"}</StatusBadge>
                  <p className="text-xs text-muted-foreground">{lecture.lecture_date}</p>
                </div>
                <div>
                  <p className="text-base font-bold text-foreground truncate">{lecture.topic}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{lecture.venue} · {lecture.start_time}</p>
                </div>
                <GlowButton className="w-full" onClick={() => navigate(lectureIsLive ? `/app/lectures/${lecture.id}` : "/app/lectures") }>
                  {lectureIsLive ? <Scan className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}
                  {lectureIsLive ? "Mark Attendance" : "View Lecture"}
                </GlowButton>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No upcoming lecture scheduled right now.</p>
            )}
          </GlassCard>
        </motion.section>

        <motion.section id="daily-checkin" variants={SECTION_REVEAL_ITEM} className="space-y-3">
          <SectionHeader title="Daily Check-In" subtitle="Keep your streak alive" />
          <DailyCheckinCard />
        </motion.section>

        <motion.section variants={SECTION_REVEAL_ITEM} className="space-y-3">
          <SectionHeader title="Academic Intelligence" subtitle="Your performance cockpit" />
          {intelligence.isLoading ? (
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-36 rounded-2xl" />
              <Skeleton className="h-36 rounded-2xl" />
              <Skeleton className="h-36 rounded-2xl" />
              <Skeleton className="h-36 rounded-2xl" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <MetricCard icon={CalendarCheck} value={intelligence.data?.attendanceConsistency ?? 0} label="Attendance" suffix="%" />
              <MetricCard icon={Zap} value={intelligence.data?.engagementIndex ?? 0} label="Engagement" suffix="%" />
              <MetricCard
                icon={Brain}
                value={Math.round(
                  ((intelligence.data?.attendanceConsistency ?? 0) +
                    (intelligence.data?.behaviourReliability ?? 0) +
                    (intelligence.data?.engagementIndex ?? 0)) /
                    3,
                )}
                label="Intelligence"
              />
              <GlassCard className="flex flex-col justify-between" hover>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Risk</p>
                  <ShieldAlert className="h-4 w-4 text-warning" />
                </div>
                <p className="text-2xl font-black capitalize text-foreground">{riskLevel}</p>
                <StatusBadge status={riskLevel === "high" ? "upcoming" : "active"}>{riskLevel}</StatusBadge>
              </GlassCard>
            </div>
          )}
        </motion.section>

        <motion.section variants={SECTION_REVEAL_ITEM} className="space-y-3">
          <SectionHeader title="Smart Insights" subtitle="Actionable nudges" />
          <div className="space-y-3">
            {insightCards.map((insight, index) => (
              <GlassCard key={`${insight.text}-${index}`} className="flex items-start gap-3" hover={false}>
                <div className={cn(
                  "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                  insight.tone === "success" && "bg-success/12 text-success",
                  insight.tone === "warning" && "bg-warning/12 text-warning",
                  insight.tone === "primary" && "bg-primary/12 text-primary",
                )}>
                  <insight.icon className="h-4 w-4" />
                </div>
                <p className="text-sm leading-relaxed text-foreground">{insight.text}</p>
              </GlassCard>
            ))}
          </div>
        </motion.section>

        <motion.section variants={SECTION_REVEAL_ITEM} className="space-y-3">
          <SectionHeader title="Activity Feed" subtitle="Latest 8 events" />
          <GlassCard padding="none" className="overflow-hidden" hover={false}>
            {secondaryQuery.isLoading ? (
              <div className="space-y-3 p-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 rounded-xl" />
                ))}
              </div>
            ) : (secondaryQuery.data?.activities.length ?? 0) === 0 ? (
              <div className="p-6 text-center">
                <p className="text-sm text-muted-foreground">No recent activity yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-border-subtle">
                {(secondaryQuery.data?.activities ?? []).map((activity, index) => (
                  <ActivityRow key={activity.id} activity={activity} index={index} />
                ))}
              </div>
            )}
          </GlassCard>
        </motion.section>
      </motion.div>
    </PageContainer>
  );
}

const HeroStat = memo(function HeroStat({ label, value, suffix = "" }: { label: string; value: number; suffix?: string }) {
  return (
    <div className="rounded-xl bg-surface-2/70 p-3 text-center">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-black tabular-nums text-foreground">
        {value}
        {suffix}
      </p>
    </div>
  );
});

const ActivityRow = memo(function ActivityRow({ activity, index }: { activity: RecentPoint; index: number }) {
  const meta = sourceMeta(activity.source);
  const Icon = meta.icon;
  const isPositive = activity.points >= 0;
  const date = new Date(activity.created_at).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="flex items-center gap-3 px-4 py-3"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-3 text-muted-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{meta.label}</p>
        <p className="truncate text-xs text-muted-foreground">{activity.note ?? date}</p>
      </div>
      <div className={cn("text-sm font-bold tabular-nums", isPositive ? "text-success" : "text-danger")}>
        {isPositive ? "+" : ""}
        {activity.points}
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground/60" />
    </motion.div>
  );
});
