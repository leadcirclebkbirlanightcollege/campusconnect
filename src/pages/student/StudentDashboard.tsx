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
  CheckCircle2,
  AlertTriangle,
  QrCode,
  MapPin,
} from "@/components/icons";
import UpcomingEventsStrip from "@/components/student/UpcomingEventsStrip";
import { motion } from "framer-motion";

import { supabase } from "@/integrations/supabase/client";
import { useGrowthInsights } from "@/hooks/use-growth-insights";
import { useStudentIntelligence } from "@/hooks/use-intelligence";
import { TIER_CONFIG } from "@/lib/intelligenceEngine";
import { cn } from "@/lib/utils";
import { QueryErrorState } from "@/components/ui/QueryErrorState";
import { useFestivalTheme } from "@/contexts/FestivalThemeContext";
import {
  FestiveBadge,
  FestiveIcon,
  FestiveSparklesBackground,
} from "@/components/festive/FestiveDecorations";

import { PageContainer } from "@/layout/PageContainer";
import { PageHeader } from "@/layout/PageHeader";
import { PullToRefresh } from "@/components/mobile/PullToRefresh";
import { PageSkeleton } from "@/components/skeleton/PageSkeleton";
import { DailyCheckinCard } from "@/components/student/DailyCheckinCard";
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
    fullName: profile?.name ?? "Student",
    totalPoints: Number(pointsTotal ?? 0),
    currentStreak: streak?.current_streak ?? 0,
    longestStreak: streak?.longest_streak ?? 0,
    liveNow: ((liveList ?? [])[0] as UpcomingLecture | undefined) ?? null,
  };
}

async function fetchDashboardSecondary(userId: string) {
  const today = new Date().toISOString().split("T")[0];

  const [{ count: attended }, { count: total }, { data: upcoming }, { data: points }, { data: assignments }] = await Promise.all([
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
    supabase
      .from("assignments" as any)
      .select("id,title,due_date")
      .eq("is_active", true)
      .gte("due_date", today)
      .order("due_date", { ascending: true })
      .limit(3),
  ]);

  return {
    attended: attended ?? 0,
    total: total ?? 0,
    nextLecture: ((upcoming ?? [])[0] as UpcomingLecture | undefined) ?? null,
    activities: (points ?? []) as RecentPoint[],
    pendingAssignments: ((assignments ?? []) as unknown) as Array<{ id: string; title: string; due_date: string }>,
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
  const todayFormatted = useMemo(() => {
    return new Date().toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    }).toUpperCase();
  }, []);

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
  const isAttendanceSafe = attendancePct >= 75;

  const tier = (intelligence.data?.tier ?? "bronze") as TierKey;
  const tierConfig = TIER_CONFIG[tier];
  const tierProgress = getTierProgress(coreQuery.data.totalPoints, tier);

  const { isFestive, isDahiHandi, config: festivalConfig } = useFestivalTheme();
  const liveLecture = coreQuery.data.liveNow;
  const nextLecture = secondaryQuery.data?.nextLecture;
  const pendingAssignments = secondaryQuery.data?.pendingAssignments ?? [];

  return (
    <PullToRefresh onRefresh={handlePullRefresh}>
      <PageContainer className="space-y-5 md:space-y-6 pb-6 md:pb-12" size="wide">
        
        {/* ═══ CLEAN HEADER GREETING ═══ */}
        <div className="flex items-center justify-between pt-1">
          <div>
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                {todayFormatted}
              </p>
              {isFestive && (
                <FestiveBadge label={festivalConfig.badgeLabel} />
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight mt-0.5 flex items-center gap-2 flex-wrap">
              <span>Hi, {coreQuery.data.name} 👋</span>
              {isFestive && (
                <span className={cn(
                  "hidden sm:inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border",
                  isDahiHandi
                    ? "text-amber-600 dark:text-amber-300 bg-amber-500/10 border-amber-500/25"
                    : "text-cyan-600 dark:text-cyan-300 bg-cyan-500/10 border-cyan-500/25"
                )}>
                  <FestiveIcon size={12} />
                  {festivalConfig.greeting} ✨
                </span>
              )}
            </h1>
          </div>
          <button
            type="button"
            onClick={() => navigate("/app/scan")}
            className="h-10 px-3.5 sm:px-4 rounded-xl bg-primary text-primary-foreground font-bold text-xs sm:text-sm flex items-center gap-2 shadow-sm shadow-primary/25 hover:brightness-105 active:scale-95 transition-all"
          >
            <QrCode className="h-4 w-4" />
            <span>Scan QR</span>
          </button>
        </div>

        <motion.div variants={SECTION_REVEAL_PARENT} initial="hidden" animate="show" className="space-y-5 md:space-y-6">

          {/* ═══ 1. DEEP NAVY HERO CARD (Next Class or Live Now) ═══ */}
          <motion.section variants={SECTION_REVEAL_ITEM}>
            {liveLecture ? (
              <div
                className={cn(
                  "relative overflow-hidden rounded-2xl md:rounded-3xl p-5 sm:p-6 text-white shadow-md border",
                  isFestive
                    ? "bg-festive-hero border-amber-400/30"
                    : "bg-gradient-to-br from-navy-deep via-navy-card to-navy-light border-white/10"
                )}
              >
                {/* Decorative glow circles or festive particles */}
                {isFestive ? (
                  <FestiveSparklesBackground />
                ) : (
                  <>
                    <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-danger/25 blur-2xl" />
                    <div aria-hidden="true" className="pointer-events-none absolute right-1/4 -bottom-10 h-32 w-32 rounded-full bg-primary/20 blur-xl" />
                  </>
                )}

                <div className="relative z-10">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-1.5 bg-danger/20 border border-danger/40 px-2.5 py-1 rounded-full text-white text-[11px] font-black uppercase tracking-wider">
                      <span className="h-2 w-2 rounded-full bg-danger animate-ping" />
                      Live Class Now
                    </div>
                    <div className="flex items-center gap-1.5">
                      {isFestive && <FestiveIcon size={14} />}
                      <span className="text-xs font-mono font-semibold text-white/80">{liveLecture.start_time}</span>
                    </div>
                  </div>

                  <h2 className="text-lg sm:text-2xl font-black text-white leading-snug">{liveLecture.topic}</h2>
                  <p className="text-xs sm:text-sm text-white/80 mt-1.5 flex items-center gap-2">
                    <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {liveLecture.venue}</span>
                    <span>·</span>
                    <span className="text-emerald-300 font-semibold">Attendance is open</span>
                  </p>

                  <div className="mt-4 flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => navigate("/app/scan")}
                      className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-primary/30 hover:brightness-105 active:scale-[0.98] transition-all"
                    >
                      <QrCode className="h-4 w-4" />
                      Mark Live Attendance
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate("/app/timetable")}
                      className="h-11 px-4 rounded-xl border border-white/20 bg-white/10 text-white font-semibold text-xs hover:bg-white/15 active:scale-95 transition-all"
                    >
                      Schedule
                    </button>
                  </div>
                </div>
              </div>
            ) : nextLecture ? (
              <div
                className={cn(
                  "relative overflow-hidden rounded-2xl md:rounded-3xl p-5 sm:p-6 text-white shadow-md border",
                  isFestive
                    ? "bg-festive-hero border-amber-400/30"
                    : "bg-gradient-to-br from-navy-deep via-navy-card to-navy-light border-white/10"
                )}
              >
                {/* Decorative glow circles or festive particles */}
                {isFestive ? (
                  <FestiveSparklesBackground />
                ) : (
                  <>
                    <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/25 blur-2xl" />
                    <div aria-hidden="true" className="pointer-events-none absolute right-1/3 -bottom-8 h-32 w-32 rounded-full bg-white/5 blur-xl" />
                  </>
                )}

                <div className="relative z-10">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-1.5 bg-white/15 border border-white/20 px-2.5 py-1 rounded-full text-white text-[11px] font-bold uppercase tracking-wider">
                      <Clock3 className="h-3 w-3 text-primary-glow" />
                      Next Class
                    </div>
                    <div className="flex items-center gap-1.5">
                      {isFestive && <FestiveIcon size={14} />}
                      <span className="text-xs font-mono font-semibold text-white/80">{nextLecture.start_time}</span>
                    </div>
                  </div>

                  <h2 className="text-lg sm:text-2xl font-black text-white leading-snug">{nextLecture.topic}</h2>
                  <p className="text-xs sm:text-sm text-white/80 mt-1.5 flex items-center gap-2">
                    <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {nextLecture.venue}</span>
                    <span>·</span>
                    <span>{nextLecture.lecture_date}</span>
                  </p>

                  <div className="mt-4 flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => navigate("/app/scan")}
                      className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-primary/30 hover:brightness-105 active:scale-[0.98] transition-all"
                    >
                      <QrCode className="h-4 w-4" />
                      Mark Attendance
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate("/app/timetable")}
                      className="h-11 px-4 rounded-xl border border-white/20 bg-white/10 text-white font-semibold text-xs hover:bg-white/15 active:scale-95 transition-all"
                    >
                      Full Schedule
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div
                className={cn(
                  "relative overflow-hidden rounded-2xl md:rounded-3xl p-5 sm:p-6 text-white shadow-md border",
                  isFestive
                    ? "bg-festive-hero border-amber-400/25"
                    : "bg-gradient-to-br from-navy-deep via-navy-card to-navy-light border-white/10"
                )}
              >
                {isFestive && <FestiveSparklesBackground />}
                <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-300">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {isFestive ? "Janmashtami • All Caught Up" : "All Caught Up"}
                    </div>
                    <h2 className="text-lg sm:text-xl font-black text-white">No classes scheduled right now</h2>
                    <p className="text-xs text-white/70">Check your timetable or review study materials</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate("/app/timetable")}
                    className="h-10 px-4 rounded-xl border border-white/20 bg-white/10 text-white font-semibold text-xs hover:bg-white/15 active:scale-95 transition-all"
                  >
                    View Timetable →
                  </button>
                </div>
              </div>
            )}
          </motion.section>

          {/* ═══ 2. KEY METRICS TRIO (Attendance + Streak + Points) ═══ */}
          <motion.section variants={SECTION_REVEAL_ITEM} className="grid grid-cols-3 gap-2.5 sm:gap-4">
            {/* Attendance Metric */}
            <div
              onClick={() => navigate("/app/attendance")}
              className="cursor-pointer rounded-2xl border border-border-subtle bg-surface-1 p-3.5 sm:p-4 text-center hover:border-primary/40 transition-all active:scale-[0.98] shadow-xs hover:shadow-sm"
            >
              <p className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground truncate">Attendance</p>
              <p className={cn("text-xl sm:text-2xl font-black tabular-nums mt-1", isAttendanceSafe ? "text-foreground" : "text-danger")}>
                {attendancePct}%
              </p>
              <div className="mt-1 flex items-center justify-center gap-1 text-[10px] font-semibold truncate">
                {isAttendanceSafe ? (
                  <span className="text-success flex items-center gap-0.5"><CheckCircle2 className="h-3 w-3" /> Safe ≥75%</span>
                ) : (
                  <span className="text-danger flex items-center gap-0.5"><AlertTriangle className="h-3 w-3" /> Risk &lt;75%</span>
                )}
              </div>
            </div>

            {/* Streak Metric */}
            <div
              onClick={() => {
                const el = document.getElementById("daily-checkin");
                el?.scrollIntoView({ behavior: "smooth" });
              }}
              className="cursor-pointer rounded-2xl border border-border-subtle bg-surface-1 p-3.5 sm:p-4 text-center hover:border-warning/40 transition-all active:scale-[0.98] shadow-xs hover:shadow-sm"
            >
              <p className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground truncate">Streak</p>
              <p className="text-xl sm:text-2xl font-black text-foreground tabular-nums mt-1">
                {coreQuery.data.currentStreak}d 🔥
              </p>
              <p className="mt-1 text-[10px] font-semibold text-warning truncate">Daily Check-In</p>
            </div>

            {/* Points Metric */}
            <div
              onClick={() => navigate("/app/points")}
              className={cn(
                "cursor-pointer rounded-2xl border bg-surface-1 p-3.5 sm:p-4 text-center transition-all active:scale-[0.98] shadow-xs hover:shadow-sm",
                isFestive
                  ? "border-amber-400/35 hover:border-amber-400/60 bg-gradient-to-b from-surface-1 to-amber-500/5"
                  : "border-border-subtle hover:border-primary/40"
              )}
            >
              <p className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground truncate">Points</p>
              <p className="text-xl sm:text-2xl font-black text-foreground tabular-nums mt-1">
                {coreQuery.data.totalPoints.toLocaleString()}
              </p>
              <p className={cn(
                "mt-1 text-[10px] font-bold uppercase tracking-wide truncate",
                isFestive ? "text-amber-500 flex items-center justify-center gap-1" : "text-primary"
              )}>
                {isFestive && <PeacockFeatherIcon size={11} />}
                {tierConfig.label} Tier
              </p>
            </div>
          </motion.section>

          {/* ═══ 3. NEEDS YOUR ATTENTION (Action Required) ═══ */}
          {pendingAssignments.length > 0 && (
            <motion.section variants={SECTION_REVEAL_ITEM} className="space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Needs Your Attention</h2>
                <span className="text-[11px] font-semibold text-warning">{pendingAssignments.length} pending</span>
              </div>
              <div className="space-y-2">
                {pendingAssignments.map((a) => (
                  <div
                    key={a.id}
                    onClick={() => navigate("/app/assignments")}
                    className="cursor-pointer flex items-center justify-between gap-3 rounded-2xl border border-border-subtle bg-surface-1 px-4 py-3 hover:border-primary/40 transition-all active:scale-[0.99] shadow-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 border border-amber-500/20">
                        <BookOpen className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-bold text-foreground truncate">{a.title}</p>
                        <p className="text-[11px] text-muted-foreground">Due: {a.due_date}</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-primary shrink-0">Submit →</span>
                  </div>
                ))}
              </div>
            </motion.section>
          )}

          {/* ═══ 4. QUICK ACCESS GRID ═══ */}
          <motion.section variants={SECTION_REVEAL_ITEM} className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Quick Access</h2>
              <button onClick={() => navigate("/app/more")} className="text-[11px] font-semibold text-primary hover:underline">
                All Modules →
              </button>
            </div>
            <div className="grid grid-cols-4 md:grid-cols-8 gap-2 sm:gap-3">
              <QuickTile icon={CalendarCheck} label="Attendance" tint="indigo" onClick={() => navigate("/app/attendance")} />
              <QuickTile icon={Clock3}        label="Timetable"  tint="rose"   onClick={() => navigate("/app/timetable")} />
              <QuickTile icon={BookOpen}      label="Tasks"      tint="amber"  onClick={() => navigate("/app/assignments")} />
              <QuickTile icon={GraduationCap} label="Results"    tint="purple" onClick={() => navigate("/app/results")} />
              <QuickTile icon={IdCard}        label="Digital ID" tint="sky"    onClick={() => navigate("/app/id-card")} />
              <QuickTile icon={Trophy}        label="Ranks"      tint="emerald"onClick={() => navigate("/app/leaderboard")} />
              <QuickTile icon={Rocket}        label="E-Cell"     tint="orange" onClick={() => navigate("/app/ecell")} />
              <QuickTile icon={LayoutGrid}    label="More"       tint="slate"  onClick={() => navigate("/app/more")} />
            </div>
          </motion.section>

          {/* ═══ 5. DAILY CHECK-IN CARD ═══ */}
          <motion.section id="daily-checkin" variants={SECTION_REVEAL_ITEM}>
            <DailyCheckinCard />
          </motion.section>

          {/* ═══ 6. UPCOMING EVENTS STRIP ═══ */}
          <motion.section variants={SECTION_REVEAL_ITEM}>
            <UpcomingEventsStrip />
          </motion.section>

          {/* ═══ 7. RECENT POINTS ACTIVITY FEED ═══ */}
          <motion.section variants={SECTION_REVEAL_ITEM} className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Recent Points Activity</h2>
              <button onClick={() => navigate("/app/points")} className="text-[11px] font-semibold text-primary hover:underline">
                History →
              </button>
            </div>
            <div className="rounded-2xl border border-border-subtle bg-surface-1 divide-y divide-border-subtle overflow-hidden shadow-xs">
              {secondaryQuery.isLoading ? (
                <div className="space-y-3 p-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 rounded-xl" />
                  ))}
                </div>
              ) : (secondaryQuery.data?.activities.length ?? 0) === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  No activity recorded yet. Scan attendance to earn points!
                </div>
              ) : (
                (secondaryQuery.data?.activities ?? []).map((activity, index) => (
                  <ActivityRow key={activity.id} activity={activity} index={index} />
                ))
              )}
            </div>
          </motion.section>
        </motion.div>
      </PageContainer>
    </PullToRefresh>
  );
}

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
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02 }}
      className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-surface-2/60 transition-colors"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-primary border border-border-subtle">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-bold text-foreground">{meta.label}</p>
          <p className="truncate text-[11px] text-muted-foreground">{date} {activity.note ? `· ${activity.note}` : ""}</p>
        </div>
      </div>
      <div className={cn("text-xs font-black tabular-nums shrink-0", isPositive ? "text-success" : "text-danger")}>
        {isPositive ? "+" : ""}
        {activity.points} pts
      </div>
    </motion.div>
  );
});

type Tint = "indigo" | "rose" | "amber" | "purple" | "emerald" | "sky" | "orange" | "slate";

const TINT_CLASSES: Record<Tint, string> = {
  indigo:  "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
  rose:    "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
  amber:   "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  purple:  "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  sky:     "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
  orange:  "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
  slate:   "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
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
      className="flex flex-col items-center justify-center gap-1.5 p-2.5 sm:p-3 rounded-2xl border border-border-subtle bg-surface-1 hover:border-primary/40 hover:shadow-sm active:scale-95 transition-all"
    >
      <div className={cn("w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center border", TINT_CLASSES[tint])}>
        <Icon className="w-5 h-5" />
      </div>
      <span className="text-[11px] sm:text-[12px] font-bold text-foreground leading-tight truncate w-full text-center">{label}</span>
    </button>
  );
});
