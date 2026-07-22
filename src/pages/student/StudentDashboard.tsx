import { memo, useCallback, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Bell,
  BookOpen,
  CalendarCheck,
  CalendarDays,
  Clock3,
  FileText,
  Flame,
  GraduationCap,
  IdCard,
  LayoutGrid,
  MessageSquare,
  Rocket,
  Scan,
  ShieldAlert,
  Sparkles,
  Star,
  Store,
  TrendingDown,
  TrendingUp,
  Trophy,
  Users,
  Zap,
  Brain,
} from "lucide-react";
import UpcomingEventsStrip from "@/components/student/UpcomingEventsStrip";
import { motion } from "framer-motion";

import { supabase } from "@/integrations/supabase/client";
import { useGrowthInsights } from "@/hooks/use-growth-insights";
import { useStudentIntelligence } from "@/hooks/use-intelligence";
import { TIER_CONFIG } from "@/lib/intelligenceEngine";
import { cn } from "@/lib/utils";
import { QueryErrorState } from "@/components/ui/QueryErrorState";

import { PageContainer } from "@/layout/PageContainer";
import { PageHeader } from "@/layout/PageHeader";
import { PullToRefresh } from "@/components/mobile/PullToRefresh";
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
import { useMetricCountUp } from "@/components/ui/motion";
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

  const handlePullRefresh = useCallback(async () => {
    await Promise.all([
      coreQuery.refetch(),
      secondaryQuery.refetch(),
      queryClient.invalidateQueries({ queryKey: ["student", "growth-insights"] }),
      queryClient.invalidateQueries({ queryKey: ["student", "intelligence"] }),
    ]);
  }, [coreQuery, queryClient, secondaryQuery]);

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
        <QueryErrorState
          onRetry={() => coreQuery.refetch()}
          isRetrying={coreQuery.isFetching}
          error={coreQuery.error as Error}
        />
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
    <PullToRefresh onRefresh={handlePullRefresh}>
      <PageContainer className="space-y-6 md:space-y-8 !px-0 md:!px-4" withBottomNav>
        {/* Desktop-only classic header (keeps ERP context) */}
        <div className="hidden md:block px-page">
          <PageHeader title="Dashboard" subtitle={`${greeting}, ${coreQuery.data.name}`} variant="large" gradient />
        </div>

        <motion.div variants={SECTION_REVEAL_PARENT} initial="hidden" animate="show" className="space-y-6">
          {/* ═══ PREMIUM NATIVE HERO — curved gradient header + overlapping stat cards ═══ */}
          <motion.section variants={SECTION_REVEAL_ITEM} className="md:hidden">
            <div className="relative">
              {/* Gradient header */}
              <div
                className="relative overflow-hidden px-5 pt-6 pb-20 rounded-b-[36px]"
                style={{
                  background:
                    "linear-gradient(180deg, hsl(231 68% 22%) 0%, hsl(231 65% 30%) 55%, hsl(232 62% 36%) 100%)",
                }}
              >
                {/* Decorative glows */}
                <div className="pointer-events-none absolute -top-16 -right-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
                <div className="pointer-events-none absolute top-24 -left-10 h-40 w-40 rounded-full bg-primary-glow/25 blur-3xl" />

                {/* Top row: bell + brand + avatar */}
                <div className="relative z-10 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => navigate("/app/inbox")}
                    aria-label="Notifications"
                    className="p-2.5 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-sm active:scale-95 transition-transform"
                  >
                    <Bell className="h-5 w-5 text-white" strokeWidth={2} />
                  </button>
                  <span className="text-white font-extrabold tracking-[0.22em] text-[13px] uppercase">
                    Campus Connect
                  </span>
                  <button
                    type="button"
                    onClick={() => navigate("/app/settings")}
                    aria-label="Open profile"
                    className="h-10 w-10 rounded-full border-2 border-white/25 bg-white/10 backdrop-blur-sm overflow-hidden active:scale-95 transition-transform flex items-center justify-center text-white font-bold text-sm"
                  >
                    {coreQuery.data.name?.[0]?.toUpperCase() ?? "S"}
                  </button>
                </div>

                {/* Greeting */}
                <div className="relative z-10 mt-7">
                  <h1 className="text-white text-[26px] font-extrabold leading-tight flex items-center gap-2">
                    Hello, {coreQuery.data.name}! <span className="text-2xl">👋</span>
                  </h1>
                  <p className="text-white/70 text-sm mt-1 font-medium">Stay connected. Stay ahead.</p>
                </div>
              </div>

              {/* Overlapping stat cards */}
              <div className="px-5 -mt-12 relative z-10 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => navigate("/app/points")}
                  className="text-left bg-card p-4 rounded-[20px] shadow-[0_10px_24px_-12px_rgba(15,23,42,0.15)] border border-border-subtle active:scale-[0.98] transition-transform"
                >
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                    Your Tier
                  </p>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-foreground text-lg font-extrabold leading-none">
                        {tierConfig.label}
                      </p>
                      <p className="text-[hsl(var(--gold))] text-[11px] font-bold mt-1 tabular-nums">
                        {coreQuery.data.totalPoints.toLocaleString()} Pts
                      </p>
                    </div>
                    <div className="w-9 h-9 bg-[hsl(var(--gold)/0.12)] rounded-full flex items-center justify-center text-[hsl(var(--gold))]">
                      <Star className="w-5 h-5 fill-current" />
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/app/attendance")}
                  className="text-left bg-card p-4 rounded-[20px] shadow-[0_10px_24px_-12px_rgba(15,23,42,0.15)] border border-border-subtle active:scale-[0.98] transition-transform"
                >
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                    Attendance
                  </p>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-foreground text-lg font-extrabold leading-none tabular-nums">
                        {attendancePct}%
                      </p>
                      <p className="text-primary text-[11px] font-bold mt-1">This Month</p>
                    </div>
                    <div className="w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                      <CalendarCheck className="w-5 h-5" strokeWidth={2.25} />
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </motion.section>

          {/* ═══ Desktop-only compact hero (unchanged ERP feel) ═══ */}
          <motion.section variants={SECTION_REVEAL_ITEM} className="hidden md:block px-page">
            <div className="relative overflow-hidden rounded-3xl border border-border-subtle bg-gradient-to-br from-primary/20 via-surface-2 to-surface-1 p-5 shadow-md">
              <div className="pointer-events-none absolute -top-12 -right-12 h-44 w-44 rounded-full bg-primary/30 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-accent/20 blur-3xl" />
              <div className="relative space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1.5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      {greeting} 👋
                    </p>
                    <h1 className="text-[26px] font-black leading-tight text-foreground truncate">
                      {coreQuery.data.name}
                    </h1>
                    <p className="text-sm text-muted-foreground">Ready to make today productive?</p>
                    <StatusBadge status="active" className={cn("mt-1", tierConfig.bg, tierConfig.border, tierConfig.color)}>
                      {tierConfig.label} Tier
                    </StatusBadge>
                  </div>
                  <ProgressRing value={attendancePct} className="shrink-0" size={96} />
                </div>

                <div className="grid grid-cols-3 gap-3 border-t border-border-subtle/60 pt-4">
                  <HeroStat label="Points" value={coreQuery.data.totalPoints} />
                  <HeroStat label="Streak" value={coreQuery.data.currentStreak} suffix="d" />
                  <HeroStat label="Attendance" value={attendancePct} suffix="%" />
                </div>
              </div>
            </div>
          </motion.section>

          {/* ═══ QUICK ACTIONS — pastel icon grid (Google Pay style) ═══ */}
          <motion.section variants={SECTION_REVEAL_ITEM} className="space-y-4 px-5 md:px-page">
            <SectionHeader title="Quick Actions" subtitle="Jump straight in" />
            <div className="grid grid-cols-4 gap-y-5 gap-x-2">
              <QuickTile icon={CalendarCheck} label="Attendance" tint="indigo" onClick={() => navigate("/app/attendance")} />
              <QuickTile icon={Clock3}        label="Timetable"  tint="rose"   onClick={() => navigate("/app/timetable")} />
              <QuickTile icon={BookOpen}      label="Tasks"      tint="amber"  onClick={() => navigate("/app/assignments")} />
              <QuickTile icon={GraduationCap} label="Results"    tint="purple" onClick={() => navigate("/app/results")} />
              <QuickTile icon={CalendarDays}  label="Events"     tint="emerald"onClick={() => navigate("/app/events")} />
              <QuickTile icon={FileText}      label="Docs"       tint="sky"    onClick={() => navigate("/app/documents")} />
              <QuickTile icon={IdCard}        label="ID Card"    tint="orange" onClick={() => navigate("/app/id-card")} />
              <QuickTile icon={LayoutGrid}    label="More"       tint="slate"  onClick={() => navigate("/app/settings")} />
            </div>
          </motion.section>


          {/* UPCOMING EVENTS STRIP */}
          <motion.section variants={SECTION_REVEAL_ITEM}>
            <UpcomingEventsStrip />
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

          {/* E-CELL MINI SECTION */}
          <motion.section variants={SECTION_REVEAL_ITEM} className="space-y-3">
            <SectionHeader title="E-Cell" subtitle="Build. Compete. Grow." />
            <div className="relative overflow-hidden rounded-2xl border border-[hsl(265_85%_65%/0.25)] bg-gradient-to-br from-[hsl(265_85%_55%/0.18)] via-[hsl(245_70%_50%/0.10)] to-surface-1 p-4 shadow-card">
              <div className="pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full bg-[hsl(265_85%_65%/0.30)] blur-3xl" />
              <div className="relative space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-xl bg-[hsl(265_85%_65%/0.20)] text-[hsl(265_85%_70%)] flex items-center justify-center">
                      <Rocket className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">Entrepreneurship Cell</p>
                      <p className="text-[11px] text-muted-foreground">Events · Stalls · Points</p>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate("/app/ecell")}
                    className="text-[11px] font-semibold text-[hsl(265_85%_75%)] hover:underline"
                  >
                    Open →
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => navigate("/app/ecell")}
                    className="rounded-xl border border-border-subtle bg-surface-2/60 p-3 text-left hover:border-[hsl(265_85%_65%/0.45)] transition-colors"
                  >
                    <CalendarDays className="h-4 w-4 text-[hsl(265_85%_70%)] mb-1.5" />
                    <p className="text-xs font-semibold text-foreground">Events</p>
                  </button>
                  <button
                    onClick={() => navigate("/app/ecell/stalls")}
                    className="rounded-xl border border-border-subtle bg-surface-2/60 p-3 text-left hover:border-[hsl(265_85%_65%/0.45)] transition-colors"
                  >
                    <Store className="h-4 w-4 text-[hsl(265_85%_70%)] mb-1.5" />
                    <p className="text-xs font-semibold text-foreground">Stall Registration</p>
                  </button>
                </div>
              </div>
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
    </PullToRefresh>
  );
}

const HeroStat = memo(function HeroStat({ label, value, suffix = "" }: { label: string; value: number; suffix?: string }) {
  const count = useMetricCountUp(value, 800);

  return (
    <div className="rounded-xl border border-border-subtle/60 bg-surface-2/70 p-3 text-center">
      <p className="font-heading text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-1 font-heading text-xl font-black tabular-nums text-foreground">
        {count}
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
        <p className="truncate text-xs text-muted-foreground">{date}</p>
        {activity.note ? <p className="truncate text-[11px] text-muted-foreground/80">{activity.note}</p> : null}
      </div>
      <div className={cn("text-sm font-bold tabular-nums", isPositive ? "text-success" : "text-danger")}>
        {isPositive ? "+" : ""}
        {activity.points}
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground/60" />
    </motion.div>
  );
});

/* ── Pastel Quick-Action Tile (native app grid) ────────────────── */
type Tint = "indigo" | "rose" | "amber" | "purple" | "emerald" | "sky" | "orange" | "slate";

const TINT_CLASSES: Record<Tint, string> = {
  indigo:  "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300",
  rose:    "bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300",
  amber:   "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300",
  purple:  "bg-purple-50 text-purple-600 dark:bg-purple-500/15 dark:text-purple-300",
  emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300",
  sky:     "bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300",
  orange:  "bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300",
  slate:   "bg-slate-100 text-slate-500 dark:bg-slate-500/15 dark:text-slate-300",
};

const QuickTile = memo(function QuickTile({
  icon: Icon,
  label,
  tint,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  tint: Tint;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col items-center gap-2 outline-none active:scale-95 transition-transform"
    >
      <span
        className={cn(
          "w-14 h-14 rounded-2xl flex items-center justify-center",
          "shadow-[0_4px_10px_-4px_rgba(15,23,42,0.08)]",
          "border border-border-subtle/40",
          TINT_CLASSES[tint],
        )}
      >
        <Icon className="w-6 h-6" strokeWidth={2} />
      </span>
      <span className="text-[11px] font-semibold text-foreground/80 leading-none">{label}</span>
    </button>
  );
});

