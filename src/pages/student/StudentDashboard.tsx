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
  Megaphone,
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
  JanmashtamiHeroIllustration,
  DahiHandiHeroIllustration,
  JanmashtamiQuoteDecoration,
  DahiHandiQuoteDecoration,
  PeacockFeatherIcon,
  DahiHandiIcon,
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

  const festivalDateStr = useMemo(() => {
    if (isDahiHandi) return "Sat, 5 Sep";
    if (isFestive) return "Fri, 4 Sep";
    return new Date().toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" });
  }, [isDahiHandi, isFestive]);

  const festivalPillLabel = useMemo(() => {
    if (isDahiHandi) return "🪔 Dahi Handi 🏺";
    if (isFestive) return "🕉️ Janmashtami ✨";
    return "";
  }, [isDahiHandi, isFestive]);

  return (
    <PullToRefresh onRefresh={handlePullRefresh}>
      <PageContainer className="space-y-4 md:space-y-5 pb-6 md:pb-12" size="wide">
        
        {/* ═══ 1. TOP BRANDING & INSTITUTIONAL HEADER (Matches reference) ═══ */}
        <div className="flex items-center justify-between pt-1 pb-0.5">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-2xl bg-navy-deep text-white flex items-center justify-center font-black text-lg shadow-xs shrink-0 border border-white/10">
              C
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-[15px] sm:text-base font-black text-foreground tracking-tight leading-none truncate">
                  Campus Connect
                </h1>
                {isFestive && (
                  <FestiveBadge label={festivalConfig.badgeLabel} className="hidden sm:inline-flex" />
                )}
              </div>
              <p className="text-[11px] font-medium text-muted-foreground leading-tight truncate mt-0.5">
                B. K. Birla Night College, Kalyan
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => navigate("/app/scan")}
              aria-label="Scan QR Attendance"
              className="h-9 px-3 rounded-xl bg-primary text-primary-foreground font-bold text-xs flex items-center gap-1.5 shadow-sm shadow-primary/20 hover:brightness-105 active:scale-95 transition-all"
            >
              <QrCode className="h-4 w-4" />
              <span className="hidden sm:inline">Scan QR</span>
            </button>
            <button
              type="button"
              onClick={() => navigate("/app/profile")}
              aria-label="Student Profile"
              className="h-9 w-9 rounded-xl border border-border-subtle bg-surface-2 flex items-center justify-center text-xs font-bold text-primary hover:border-border-strong active:scale-95 transition-all overflow-hidden"
            >
              {coreQuery.data.name[0]?.toUpperCase() ?? "S"}
            </button>
          </div>
        </div>

        <motion.div variants={SECTION_REVEAL_PARENT} initial="hidden" animate="show" className="space-y-4 md:space-y-5">

          {/* ═══ 2. FESTIVE HERO CARD (Janmashtami & Dahi Handi) ═══ */}
          {isFestive && (
            <motion.section variants={SECTION_REVEAL_ITEM}>
              <div
                className={cn(
                  "relative overflow-hidden rounded-3xl p-5 sm:p-6 text-white shadow-lg border transition-all duration-300",
                  isDahiHandi
                    ? "bg-gradient-to-br from-[#271507] via-[#432107] to-[#180A02] border-amber-400/35 shadow-[0_8px_32px_-4px_rgba(245,158,11,0.22)]"
                    : "bg-gradient-to-br from-[#091738] via-[#0C2456] to-[#081530] border-sky-400/30 shadow-[0_8px_32px_-4px_rgba(14,165,233,0.20)]"
                )}
              >
                {/* Background ambient sparkles and glows */}
                <FestiveSparklesBackground />

                {/* Vector Artwork on Right Side */}
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-32 sm:w-44 h-full flex items-center justify-end pr-2 sm:pr-5 pointer-events-none opacity-90 sm:opacity-100">
                  {isDahiHandi ? (
                    <DahiHandiHeroIllustration className="w-28 sm:w-36 h-36 sm:h-44" />
                  ) : (
                    <JanmashtamiHeroIllustration className="w-28 sm:w-36 h-36 sm:h-44" />
                  )}
                </div>

                {/* Left Content Area */}
                <div className="relative z-10 max-w-[70%] sm:max-w-[65%] space-y-3.5">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-white/75 tracking-wide">
                      {greeting},
                    </p>
                    <h2 className="text-lg sm:text-2xl font-black text-white leading-tight tracking-tight mt-1">
                      {isDahiHandi
                        ? "Teamwork builds stronger tomorrows."
                        : "Krishna reminds us that brighter days always follow."}
                    </h2>
                  </div>

                  {/* Date and Festival Pills Row */}
                  <div className="flex items-center gap-2 flex-wrap pt-0.5">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/12 border border-white/20 text-white text-[11px] font-semibold backdrop-blur-md shadow-xs">
                      <span>{festivalDateStr}</span>
                    </div>

                    <div
                      className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold backdrop-blur-md shadow-xs border",
                        isDahiHandi
                          ? "bg-amber-500/20 text-amber-200 border-amber-400/40 shadow-[0_0_12px_rgba(245,158,11,0.25)]"
                          : "bg-cyan-500/20 text-cyan-200 border-cyan-400/40 shadow-[0_0_12px_rgba(14,165,233,0.25)]"
                      )}
                    >
                      <span>{festivalPillLabel}</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.section>
          )}

          {/* ═══ 3. QUICK ACTIONS GRID (8 cards, 4x2 mobile layout matching reference) ═══ */}
          <motion.section variants={SECTION_REVEAL_ITEM} className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                Quick Actions
              </h2>
              <button
                type="button"
                onClick={() => navigate("/app/more")}
                className="text-[11px] font-semibold text-primary hover:underline"
              >
                All Modules →
              </button>
            </div>

            <div className="grid grid-cols-4 md:grid-cols-8 gap-2 sm:gap-3">
              <QuickActionCard
                icon={CalendarCheck}
                label="Attendance"
                tint="sky"
                onClick={() => navigate("/app/attendance")}
              />
              <QuickActionCard
                icon={GraduationCap}
                label="Academics"
                tint="indigo"
                onClick={() => navigate("/app/academics")}
              />
              <QuickActionCard
                icon={CalendarDays}
                label="Events"
                tint="amber"
                onClick={() => navigate("/app/events")}
              />
              <QuickActionCard
                icon={Rocket}
                label="E-Cell"
                tint="emerald"
                onClick={() => navigate("/app/ecell")}
              />
              <QuickActionCard
                icon={Megaphone}
                label="Announcements"
                tint="orange"
                onClick={() => navigate("/app/announcements")}
              />
              <QuickActionCard
                icon={Clock3}
                label="Timetable"
                tint="blue"
                onClick={() => navigate("/app/timetable")}
              />
              <QuickActionCard
                icon={BookOpen}
                label="Assignments"
                tint="purple"
                onClick={() => navigate("/app/assignments")}
              />
              <QuickActionCard
                icon={LayoutGrid}
                label="More"
                tint="slate"
                onClick={() => navigate("/app/more")}
              />
            </div>
          </motion.section>

          {/* ═══ 4. INSPIRATIONAL FESTIVE QUOTE CARD (Matches reference) ═══ */}
          {isFestive && (
            <motion.section variants={SECTION_REVEAL_ITEM}>
              <div
                className={cn(
                  "relative overflow-hidden rounded-2xl border p-4 sm:p-5 transition-all shadow-xs flex items-center justify-between gap-4",
                  isDahiHandi
                    ? "bg-gradient-to-r from-surface-1 via-amber-500/[0.04] to-surface-1 border-amber-500/25 dark:border-amber-400/20"
                    : "bg-gradient-to-r from-surface-1 via-cyan-500/[0.04] to-surface-1 border-cyan-500/25 dark:border-cyan-400/20"
                )}
              >
                <div className="space-y-1 z-10 max-w-[78%]">
                  <p className="text-[13px] sm:text-[14px] font-medium text-foreground leading-relaxed italic">
                    {isDahiHandi
                      ? "“Higher we lift each other, stronger we grow together.”"
                      : "“Do your duty with devotion, and let the divine handle the rest.”"}
                  </p>
                  <p className="text-[11px] font-semibold text-muted-foreground">
                    {isDahiHandi ? "— Dahi Handi Spirit" : "— Lord Krishna"}
                  </p>
                </div>

                <div className="shrink-0 flex items-center justify-center opacity-85">
                  {isDahiHandi ? (
                    <DahiHandiQuoteDecoration className="w-14 h-14 sm:w-16 sm:h-16" />
                  ) : (
                    <JanmashtamiQuoteDecoration className="w-14 h-14 sm:w-16 sm:h-16" />
                  )}
                </div>
              </div>
            </motion.section>
          )}

          {/* ═══ 5. REAL LECTURE BANNER (Next Class or Live Now) ═══ */}
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
                      {isFestive ? `${festivalConfig.name} • All Caught Up` : "All Caught Up"}
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
                {isFestive && <FestiveIcon size={11} />}
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

type QuickTint = "sky" | "indigo" | "amber" | "emerald" | "orange" | "blue" | "purple" | "slate";

const QUICK_TINT_CLASSES: Record<QuickTint, { box: string; icon: string }> = {
  sky:     { box: "bg-sky-500/10 border-sky-500/20", icon: "text-sky-600 dark:text-sky-400" },
  indigo:  { box: "bg-indigo-500/10 border-indigo-500/20", icon: "text-indigo-600 dark:text-indigo-400" },
  amber:   { box: "bg-amber-500/10 border-amber-500/20", icon: "text-amber-600 dark:text-amber-400" },
  emerald: { box: "bg-emerald-500/10 border-emerald-500/20", icon: "text-emerald-600 dark:text-emerald-400" },
  orange:  { box: "bg-orange-500/10 border-orange-500/20", icon: "text-orange-600 dark:text-orange-400" },
  blue:    { box: "bg-blue-500/10 border-blue-500/20", icon: "text-blue-600 dark:text-blue-400" },
  purple:  { box: "bg-purple-500/10 border-purple-500/20", icon: "text-purple-600 dark:text-purple-400" },
  slate:   { box: "bg-slate-500/10 border-slate-500/20", icon: "text-slate-600 dark:text-slate-400" },
};

const QuickActionCard = memo(function QuickActionCard({
  icon: Icon,
  label,
  tint,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  tint: QuickTint;
  onClick: () => void;
}) {
  const styling = QUICK_TINT_CLASSES[tint];
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-1.5 p-2.5 sm:p-3 rounded-2xl border border-border-subtle/80 bg-surface-1 hover:border-primary/40 hover:shadow-xs active:scale-95 transition-all text-center group"
    >
      <div className={cn("w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center border transition-transform group-hover:scale-105", styling.box, styling.icon)}>
        <Icon className="w-5 h-5" />
      </div>
      <span className="text-[11px] sm:text-[11.5px] font-medium text-foreground tracking-tight leading-tight truncate w-full text-center">
        {label}
      </span>
    </button>
  );
});
