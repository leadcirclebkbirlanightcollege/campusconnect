import { lazy, Suspense, useEffect, useMemo, useState, memo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { DailyCheckinCard } from "@/components/student/DailyCheckinCard";
import IntelligenceScoreCard from "@/components/student/IntelligenceScoreCard";
import SmartInsightsStrip from "@/components/student/SmartInsightsStrip";
import {
  Flame, Zap, TrendingUp, TrendingDown, Minus,
  Clock, CheckCircle2, ChevronRight, BookOpen,
  Trophy, Shield, Target, BarChart3, Star, Activity,
  CalendarCheck, Award, Sparkles, ArrowRight, Scan,
} from "lucide-react";
import { useStudentIntelligence } from "@/hooks/use-intelligence";
import { useGrowthInsights } from "@/hooks/use-growth-insights";
import { TIER_CONFIG } from "@/lib/intelligenceEngine";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { FadeIn, SlideUp, useMetricCountUp } from "@/components/ui/motion";
import { IntelligenceBar, LiveIndicator } from "@/components/ui/design-system";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

// Phase 2 — lazy-loaded analytics panels
const AcademicRadarChart  = lazy(() => import("@/components/student/AcademicRadarChart"));
const AttendanceTrendChart = lazy(() => import("@/components/student/AttendanceTrendChart"));
const StreakHeatmap        = lazy(() => import("@/components/student/StreakHeatmap"));
const RiskAnalysisPanel    = lazy(() => import("@/components/student/RiskAnalysisPanel"));
const EngagementScorePanel = lazy(() => import("@/components/student/EngagementScorePanel"));
const UpcomingEventsStrip  = lazy(() => import("@/components/student/UpcomingEventsStrip"));

const PanelSkeleton = () => <Skeleton className="h-[180px] w-full rounded-2xl" />;

/* ── Types ─────────────────────────────────────────────────────── */
type UpcomingLecture = {
  id: string; topic: string; lecture_date: string;
  start_time: string; end_time: string; venue: string;
  status?: "scheduled" | "live" | "ended";
};
type RecentPoint = {
  id: string; created_at: string; points: number;
  source: string; note: string | null;
};

const TIER_THRESHOLDS = { bronze: 0, silver: 100, gold: 250, elite: 500 } as const;
const TIER_NEXT = { bronze: "silver", silver: "gold", gold: "elite", elite: null } as const;
type TierKey = keyof typeof TIER_THRESHOLDS;

function getTierProgress(pts: number, tier: TierKey) {
  const next = TIER_NEXT[tier];
  if (!next) return { pct: 100, remaining: 0, nextLabel: "Max Tier" };
  const from = TIER_THRESHOLDS[tier];
  const to = TIER_THRESHOLDS[next as TierKey];
  const pct = Math.min(100, Math.round(((pts - from) / (to - from)) * 100));
  return { pct, remaining: Math.max(0, to - pts), nextLabel: TIER_CONFIG[next as TierKey].label };
}

function getTimeGreeting(now = new Date()) {
  const h = now.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function sourceDisplay(source: string): { label: string; icon: React.ReactNode; color: string } {
  const s = source.toLowerCase();
  if (s.includes("attendance")) return { label: "Attendance", icon: <CalendarCheck className="h-3.5 w-3.5" />, color: "text-success" };
  if (s.includes("checkin")) return { label: "Daily Check-In", icon: <Flame className="h-3.5 w-3.5" />, color: "text-warning" };
  if (s.includes("reward")) return { label: "Daily Reward", icon: <Star className="h-3.5 w-3.5" />, color: "text-premium" };
  if (s.includes("achievement")) return { label: "Achievement", icon: <Award className="h-3.5 w-3.5" />, color: "text-primary" };
  if (s.includes("admin")) return { label: "Admin Bonus", icon: <Zap className="h-3.5 w-3.5" />, color: "text-primary" };
  return { label: source.replace(/_/g, " "), icon: <Activity className="h-3.5 w-3.5" />, color: "text-muted-foreground" };
}

/* ══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════ */
const StudentDashboard = () => {
  const intelligence = useStudentIntelligence();
  const growth = useGrowthInsights();
  const greeting = useMemo(() => getTimeGreeting(), []);

  const [stats, setStats] = useState({ totalPoints: 0, lecturesAttended: 0, totalLectures: 0, currentStreak: 0, longestStreak: 0 });
  const [nextLecture, setNextLecture] = useState<UpcomingLecture | null>(null);
  const [liveNow, setLiveNow] = useState<UpcomingLecture | null>(null);
  const [recentPoints, setRecentPoints] = useState<RecentPoint[]>([]);
  const [name, setName] = useState("Student");
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchDashboardStats(); }, []);

  const fetchDashboardStats = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) return;

      const [{ data: profile }, { data: pointsTotal }, { data: streakRaw }, { data: liveList }] =
        await Promise.all([
          supabase.from("profiles").select("name").eq("user_id", user.id).maybeSingle(),
          supabase.rpc("get_my_points_total"),
          supabase.rpc("get_my_streak"),
          supabase.from("lectures").select("id,topic,lecture_date,start_time,end_time,venue,status").eq("status", "live").limit(1),
        ]);

      setName((profile as any)?.name?.split(" ")[0] || "Student");
      const sk = streakRaw as any;
      setStats(prev => ({ ...prev, totalPoints: Number(pointsTotal ?? 0), currentStreak: sk?.current_streak ?? 0, longestStreak: sk?.longest_streak ?? 0 }));
      setLiveNow(((liveList ?? [])[0] as UpcomingLecture | undefined) ?? null);
      setLoading(false);

      const [{ data: attendanceData }, { data: allLectures }, { data: upcomingList }, { data: recentPts }] =
        await Promise.all([
          supabase.from("attendance").select("id").eq("student_user_id", user.id).eq("status", "present"),
          supabase.from("lectures").select("id"),
          supabase.from("lectures").select("id,topic,lecture_date,start_time,end_time,venue,status")
            .gte("lecture_date", new Date().toISOString().split("T")[0])
            .neq("status", "ended")
            .order("lecture_date", { ascending: true })
            .order("start_time", { ascending: true })
            .limit(1),
          supabase.from("points_ledger").select("id,created_at,points,source,note")
            .eq("user_id", user.id).order("created_at", { ascending: false }).limit(8),
        ]);

      setStats(prev => ({ ...prev, lecturesAttended: attendanceData?.length || 0, totalLectures: allLectures?.length || 0 }));
      setNextLecture(((upcomingList ?? [])[0] as UpcomingLecture | undefined) ?? null);
      setRecentPoints((recentPts ?? []) as RecentPoint[]);
    } catch (e) {
      console.error("Dashboard fetch error:", e);
      setLoading(false);
    }
  };

  const tierKey = (intelligence.data?.tier ?? "bronze") as TierKey;
  const tierData = TIER_CONFIG[tierKey];
  const tierProgress = getTierProgress(stats.totalPoints, tierKey);
  const attendancePct = stats.totalLectures > 0
    ? Math.round((stats.lecturesAttended / stats.totalLectures) * 100) : 0;

  const riskLevel = growth.data?.risk_probability ?? "low";
  const riskColor = riskLevel === "high" ? "text-danger" : riskLevel === "medium" ? "text-warning" : "text-success";
  const riskBg = riskLevel === "high" ? "bg-danger/8 border-danger/20" : riskLevel === "medium" ? "bg-warning/8 border-warning/20" : "bg-success/8 border-success/20";

  return (
    <div className="space-y-4 max-w-2xl mx-auto pb-28 md:pb-8">

      {/* ╔═══════════════════════════════════════════╗
          ║  PREMIUM HERO CARD                        ║
          ╚═══════════════════════════════════════════╝ */}
      <FadeIn>
        <div className="relative rounded-2xl overflow-hidden border border-border-subtle shadow-md">
          {/* Multi-layer gradient bg */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-surface-1 to-surface-1 pointer-events-none" />
          {/* Glow orbs */}
          <div className="absolute top-0 right-0 w-56 h-56 rounded-full bg-primary/8 blur-3xl pointer-events-none -translate-y-16 translate-x-16" />
          <div className="absolute bottom-0 left-0 w-40 h-40 rounded-full bg-primary/5 blur-2xl pointer-events-none translate-y-8 -translate-x-8" />

          {/* Tier accent top bar */}
          <div className="h-[3px] w-full relative z-10"
            style={{ background: `linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary)/0.15))` }} />

          <div className="relative z-10 p-5 sm:p-6">
            {/* Row 1: greeting + attendance ring */}
            <div className="flex items-start justify-between gap-4 mb-5">
              <div className="min-w-0 flex-1 space-y-2">
                <p className="text-[11px] uppercase tracking-[0.14em] font-semibold text-muted-foreground leading-none">
                  {greeting} 👋
                </p>
                <h1 className="text-[28px] sm:text-[32px] font-bold tracking-tight text-foreground leading-none">
                  {name}
                </h1>
                {tierData && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border",
                      tierData.bg, tierData.border, tierData.color,
                    )}
                  >
                    <Star className="h-2.5 w-2.5" />
                    {tierData.label} Tier
                  </motion.span>
                )}
              </div>

              {/* Large attendance ring */}
              <AttendanceRing pct={attendancePct} loading={loading} size={110} />
            </div>

            {/* Row 2: KPI strip — 3 columns */}
            <div className="grid grid-cols-3 gap-2 pt-4 border-t border-border-subtle/50">
              <HeroKpi
                label="Points" value={stats.totalPoints}
                icon={<Zap className="h-4 w-4" />}
                loading={loading} color="text-primary" bg="bg-primary/10"
              />
              <HeroKpi
                label="Streak" value={stats.currentStreak} suffix="d"
                icon={<Flame className="h-4 w-4" />}
                loading={loading} color="text-warning" bg="bg-warning/10"
              />
              <HeroKpi
                label="Classes" value={stats.lecturesAttended}
                icon={<CheckCircle2 className="h-4 w-4" />}
                loading={loading} color="text-success" bg="bg-success/10"
              />
            </div>

            {/* Row 3: Tier progress bar */}
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">
                  {tierData?.label} → {tierProgress.nextLabel}
                </span>
                <span className="text-[11px] font-semibold text-foreground tabular-nums">
                  {tierProgress.remaining > 0 ? `${tierProgress.remaining} pts to go` : "🏆 Max Tier"}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-surface-3 overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary)/0.55))" }}
                  initial={{ width: "0%" }}
                  animate={{ width: `${tierProgress.pct}%` }}
                  transition={{ duration: 1.3, ease: "easeOut", delay: 0.5 }}
                />
              </div>
            </div>
          </div>
        </div>
      </FadeIn>

      {/* ╔═══════════════════════════════════════════╗
          ║  LIVE / UPCOMING LECTURE BANNER           ║
          ╚═══════════════════════════════════════════╝ */}
      <AnimatePresence>
        {liveNow ? (
          <motion.div
            key="live-banner"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="rounded-xl border border-success/30 bg-success/8 overflow-hidden shadow-sm"
          >
            <div className="flex items-center justify-between px-4 py-4 gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <LiveIndicator />
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-foreground truncate leading-tight">{liveNow.topic}</p>
                  <p className="text-[12px] text-muted-foreground mt-0.5">{liveNow.venue} · {liveNow.start_time}</p>
                </div>
              </div>
              <Button asChild size="sm" className="shrink-0 h-10 gap-1.5 rounded-xl px-4">
                <Link to={`/app/lectures/${liveNow.id}`}>
                  <Scan className="h-3.5 w-3.5" />
                  Mark
                </Link>
              </Button>
            </div>
          </motion.div>
        ) : nextLecture ? (
          <motion.div
            key="upcoming-banner"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="rounded-xl border border-border-subtle bg-surface-1 shadow-xs"
          >
            <div className="flex items-center justify-between px-4 py-4 gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-xl bg-primary/8 flex items-center justify-center shrink-0">
                  <Clock className="h-4.5 w-4.5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-0.5">Next Lecture</p>
                  <p className="text-[14px] font-semibold text-foreground truncate leading-tight">{nextLecture.topic}</p>
                  <p className="text-[12px] text-muted-foreground mt-0.5">{nextLecture.lecture_date} · {nextLecture.start_time} · {nextLecture.venue}</p>
                </div>
              </div>
              <Button asChild variant="outline" size="sm" className="shrink-0 h-10 rounded-xl">
                <Link to="/app/lectures">View</Link>
              </Button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* ╔═══════════════════════════════════════════╗
          ║  QUICK ACTIONS — 4-GRID (2×2)             ║
          ╚═══════════════════════════════════════════╝ */}
      <SlideUp delay={20}>
        <div className="grid grid-cols-4 gap-2.5">
          <QuickActionBtn
            label="Check In" icon={<Flame className="h-5 w-5" />}
            color="text-warning" bg="bg-warning/10 group-hover:bg-warning/18"
            onClick={() => document.getElementById("checkin-card")?.scrollIntoView({ behavior: "smooth" })}
          />
          <QuickActionLink label="Attendance" icon={<CalendarCheck className="h-5 w-5" />} color="text-success" bg="bg-success/10 group-hover:bg-success/18" href="/app/attendance" />
          <QuickActionLink label="Leaderboard" icon={<Trophy className="h-5 w-5" />} color="text-premium" bg="bg-premium/10 group-hover:bg-premium/18" href="/app/leaderboard" />
          <QuickActionLink label="Lectures" icon={<BookOpen className="h-5 w-5" />} color="text-primary" bg="bg-primary/10 group-hover:bg-primary/18" href="/app/lectures" />
        </div>
      </SlideUp>

      {/* ╔═══════════════════════════════════════════╗
          ║  DAILY CHECK-IN                           ║
          ╚═══════════════════════════════════════════╝ */}
      <SlideUp delay={35}>
        <div id="checkin-card">
          <DailyCheckinCard />
        </div>
      </SlideUp>

      {/* ╔═══════════════════════════════════════════╗
          ║  SMART INSIGHTS STRIP                     ║
          ╚═══════════════════════════════════════════╝ */}
      <SlideUp delay={45}>
        <SmartInsightsStrip />
      </SlideUp>

      {/* ╔═══════════════════════════════════════════╗
          ║  2-COLUMN: STREAK + RISK                  ║
          ╚═══════════════════════════════════════════╝ */}
      <SlideUp delay={55}>
        <div className="grid grid-cols-2 gap-3">
          {/* Streak */}
          <div className="rounded-2xl border border-border-subtle bg-surface-1 p-4 shadow-xs space-y-3 min-h-[110px]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <motion.div animate={{ scale: [1, 1.18, 1] }} transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}>
                  <Flame className={cn("h-4.5 w-4.5", stats.currentStreak > 0 ? "text-warning" : "text-muted-foreground")} />
                </motion.div>
                <p className="text-[13px] font-semibold text-foreground">Streak</p>
              </div>
              <Trophy className="h-3.5 w-3.5 text-premium opacity-60" />
            </div>
            {loading ? <Skeleton className="h-9 w-20" /> : (
              <>
                <div>
                  <p className="text-[36px] font-black text-foreground tabular-nums leading-none">{stats.currentStreak}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">day streak</p>
                </div>
                <div className="flex items-center gap-1.5 pt-2 border-t border-border-subtle">
                  <Trophy className="h-3 w-3 text-premium" />
                  <span className="text-[11px] text-muted-foreground">Best: </span>
                  <span className="text-[11px] font-bold text-foreground tabular-nums">{stats.longestStreak}d</span>
                </div>
              </>
            )}
          </div>

          {/* Risk Level */}
          <div className={cn("rounded-2xl border p-4 shadow-xs space-y-3 min-h-[110px]", riskBg)}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className={cn("h-4.5 w-4.5", riskColor)} />
                <p className="text-[13px] font-semibold text-foreground">Risk</p>
              </div>
              <span className={cn(
                "text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full border",
                riskLevel === "high" ? "text-danger border-danger/30 bg-danger/10"
                : riskLevel === "medium" ? "text-warning border-warning/30 bg-warning/10"
                : "text-success border-success/30 bg-success/10"
              )}>{riskLevel}</span>
            </div>
            {growth.isLoading || loading ? <Skeleton className="h-9 w-20" /> : (
              <>
                <div>
                  <p className={cn("text-[24px] font-black leading-none capitalize", riskColor)}>
                    {riskLevel}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1">academic risk</p>
                </div>
                <div className="flex items-center gap-1.5 pt-2 border-t border-border-subtle/50">
                  <Target className="h-3 w-3 text-muted-foreground" />
                  <span className="text-[11px] text-muted-foreground capitalize">
                    {riskLevel === "high" ? "Action needed" : riskLevel === "medium" ? "Stay consistent" : "On track 👍"}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </SlideUp>

      {/* ╔═══════════════════════════════════════════╗
          ║  INTELLIGENCE SCORE CARD                  ║
          ╚═══════════════════════════════════════════╝ */}
      <SlideUp delay={65}>
        <IntelligenceScoreCard />
      </SlideUp>

      {/* ╔═══════════════════════════════════════════╗
          ║  ACADEMIC INTELLIGENCE PANEL              ║
          ╚═══════════════════════════════════════════╝ */}
      {(intelligence.data || intelligence.isLoading) && (
        <SlideUp delay={72}>
          <div className="rounded-2xl border border-border-subtle bg-surface-1 overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border-subtle">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
                  <BarChart3 className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-foreground">Academic Intelligence</p>
                  <p className="text-[11px] text-muted-foreground">Performance metrics · Live</p>
                </div>
              </div>
              {intelligence.data && tierData && (
                <div className={cn("px-2.5 py-1 rounded-full text-[11px] font-semibold border", tierData.bg, tierData.border, tierData.color)}>
                  {tierData.label}
                </div>
              )}
            </div>

            <div className="px-5 py-4 space-y-3.5">
              {intelligence.isLoading ? (
                <><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-5/6" /><Skeleton className="h-3 w-4/5" /></>
              ) : intelligence.data ? (
                <>
                  <IntelligenceBar value={intelligence.data.attendanceConsistency} label="Attendance Consistency" />
                  <IntelligenceBar value={intelligence.data.behaviourReliability} label="Behaviour Reliability" />
                  <IntelligenceBar value={intelligence.data.engagementIndex} label="Engagement Index" />
                </>
              ) : null}
            </div>

            {growth.data && (
              <div className="border-t border-border-subtle px-5 py-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
                <GrowthCell label="30-Day Att." value={`${growth.data.last_30_day_attendance_pct}%`} />
                <GrowthCell
                  label="Trend"
                  value={growth.data.trend_direction}
                  icon={
                    growth.data.trend_direction === "improving" ? <TrendingUp className="h-3 w-3 text-success" />
                    : growth.data.trend_direction === "declining" ? <TrendingDown className="h-3 w-3 text-danger" />
                    : <Minus className="h-3 w-3 text-muted-foreground" />
                  }
                />
                <GrowthCell
                  label="Projected Tier"
                  value={TIER_CONFIG[growth.data.projected_tier_next_month as keyof typeof TIER_CONFIG]?.label ?? growth.data.projected_tier_next_month}
                />
                <GrowthCell
                  label="Risk Level"
                  value={growth.data.risk_probability}
                  danger={riskLevel === "high"}
                  warning={riskLevel === "medium"}
                />
              </div>
            )}
          </div>
        </SlideUp>
      )}

      {/* ╔═══════════════════════════════════════════╗
          ║  SMART INSIGHTS PANEL (detailed)          ║
          ╚═══════════════════════════════════════════╝ */}
      {growth.data && !growth.isLoading && (
        <SlideUp delay={80}>
          <InsightsPanel growth={growth.data} tierProgress={tierProgress} attendancePct={attendancePct} currentStreak={stats.currentStreak} />
        </SlideUp>
      )}

      {/* ╔═══════════════════════════════════════════╗
          ║  ACTIVITY TIMELINE                        ║
          ╚═══════════════════════════════════════════╝ */}
      <SlideUp delay={90}>
        <div className="rounded-2xl border border-border-subtle bg-surface-1 overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-surface-3 flex items-center justify-center">
                <Activity className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-foreground">Activity Feed</p>
                <p className="text-[11px] text-muted-foreground">Recent points earned</p>
              </div>
            </div>
            <Button asChild variant="ghost" size="sm" className="h-8 text-[12px] gap-1 text-muted-foreground hover:text-foreground rounded-lg">
              <Link to="/app/attendance">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </div>

          {loading ? (
            <div className="px-5 py-4 space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                  <div className="flex-1 space-y-1.5"><Skeleton className="h-3 w-28" /><Skeleton className="h-2.5 w-20" /></div>
                  <Skeleton className="h-3 w-10" />
                </div>
              ))}
            </div>
          ) : recentPoints.length === 0 ? (
            <div className="px-5 py-12 text-center space-y-2.5">
              <div className="mx-auto h-12 w-12 rounded-2xl bg-surface-3 flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-muted-foreground opacity-50" />
              </div>
              <p className="text-[13px] font-medium text-muted-foreground">No activity yet</p>
              <p className="text-[12px] text-muted-foreground/60">Start by doing your daily check-in!</p>
            </div>
          ) : (
            <div className="divide-y divide-border-subtle">
              {recentPoints.map((p, i) => <ActivityRow key={p.id} item={p} index={i} />)}
            </div>
          )}
        </div>
      </SlideUp>
    </div>
  );
};

/* ══════════════════════════════════════════════
   SUB-COMPONENTS
══════════════════════════════════════════════ */

function AttendanceRing({ pct, loading, size = 110 }: { pct: number; loading: boolean; size?: number }) {
  const sw = 9;
  const r = (size - sw) / 2;
  const circ = 2 * Math.PI * r;
  const filledDash = ((loading ? 0 : pct) / 100) * circ;
  const ringColor = pct >= 75 ? "hsl(var(--success))" : pct >= 50 ? "hsl(var(--warning))" : pct > 0 ? "hsl(var(--danger))" : "hsl(var(--muted))";

  return (
    <div className="relative inline-flex items-center justify-center shrink-0">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={sw} className="stroke-surface-3 fill-none" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} strokeWidth={sw}
          fill="none" strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ - filledDash }}
          transition={{ duration: 1.5, ease: "easeOut", delay: 0.35 }}
          style={{ stroke: ringColor }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
        {loading ? (
          <Skeleton className="h-6 w-10" />
        ) : (
          <>
            <span className="text-[20px] font-black text-foreground tabular-nums leading-none">{pct}%</span>
            <span className="text-[9px] text-muted-foreground uppercase tracking-wider leading-none">Att.</span>
            <span className="text-[10px] text-muted-foreground leading-none mt-0.5 tabular-nums">
              {stats_display(pct)}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

function stats_display(pct: number) {
  if (pct >= 75) return "✓ Good";
  if (pct >= 50) return "⚠ Fair";
  if (pct > 0) return "✗ Low";
  return "—";
}

function HeroKpi({ label, value, suffix = "", icon, loading, color, bg }: {
  label: string; value: number; suffix?: string;
  icon: React.ReactNode; loading: boolean; color: string; bg: string;
}) {
  const counted = useMetricCountUp(loading ? 0 : value, 1000);
  return (
    <div className="flex flex-col items-center gap-2.5 py-3">
      <div className={cn(
        "h-10 w-10 rounded-xl flex items-center justify-center",
        "transition-transform duration-150 active:scale-95",
        bg, color,
      )}>
        {icon}
      </div>
      {loading
        ? <Skeleton className="h-5 w-12" />
        : <p className="text-[17px] font-black text-foreground tabular-nums leading-none">{counted}{suffix}</p>
      }
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground leading-none">{label}</p>
    </div>
  );
}

function QuickActionLink({ label, icon, color, bg, href }: {
  label: string; icon: React.ReactNode; color: string; bg: string; href: string;
}) {
  return (
    <Link to={href} className={cn(
      "flex flex-col items-center gap-2 p-3 rounded-xl border border-border-subtle bg-surface-1",
      "group active:scale-95 transition-all duration-100 cursor-pointer",
      "hover:border-border-strong hover:shadow-xs",
    )}>
      <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center transition-colors duration-150", bg, color)}>
        {icon}
      </div>
      <span className="text-[11px] text-muted-foreground font-medium leading-tight text-center group-hover:text-foreground transition-colors">{label}</span>
    </Link>
  );
}

function QuickActionBtn({ label, icon, color, bg, onClick }: {
  label: string; icon: React.ReactNode; color: string; bg: string; onClick: () => void;
}) {
  return (
    <button onClick={onClick} className={cn(
      "flex flex-col items-center gap-2 p-3 rounded-xl border border-border-subtle bg-surface-1 w-full",
      "group active:scale-95 transition-all duration-100 cursor-pointer",
      "hover:border-border-strong hover:shadow-xs",
    )}>
      <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center transition-colors duration-150", bg, color)}>
        {icon}
      </div>
      <span className="text-[11px] text-muted-foreground font-medium leading-tight text-center group-hover:text-foreground transition-colors">{label}</span>
    </button>
  );
}

const InsightsPanel = memo(({ growth, tierProgress, attendancePct, currentStreak }: {
  growth: any; tierProgress: { remaining: number; nextLabel: string; pct: number };
  attendancePct: number; currentStreak: number;
}) => {
  const insights: Array<{ icon: React.ReactNode; text: string; tag?: string }> = [];

  if (growth.trend_direction === "improving")
    insights.push({ icon: <TrendingUp className="h-4 w-4 shrink-0 text-success" />, text: `Attendance trend is improving — keep it up!`, tag: "Improving" });
  else if (growth.trend_direction === "declining")
    insights.push({ icon: <TrendingDown className="h-4 w-4 shrink-0 text-danger" />, text: `Attendance is declining. Don't miss upcoming lectures`, tag: "Alert" });

  if (tierProgress.remaining > 0)
    insights.push({ icon: <Zap className="h-4 w-4 shrink-0 text-primary" />, text: `${tierProgress.remaining} more points to reach ${tierProgress.nextLabel} tier 🚀`, tag: "Goal" });

  if (currentStreak > 0 && currentStreak < 7)
    insights.push({ icon: <Flame className="h-4 w-4 shrink-0 text-warning" />, text: `${7 - currentStreak} more check-in${7 - currentStreak > 1 ? "s" : ""} to unlock the 7-day streak bonus (+20 pts)`, tag: "Streak" });

  if (currentStreak >= 7)
    insights.push({ icon: <Trophy className="h-4 w-4 shrink-0 text-premium" />, text: `🏆 ${currentStreak}-day streak! Incredible consistency — keep going!`, tag: "Milestone" });

  if (attendancePct >= 90)
    insights.push({ icon: <Star className="h-4 w-4 shrink-0 text-premium" />, text: `Outstanding attendance at ${attendancePct}% — you're in elite territory`, tag: "Elite" });

  if (insights.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border-subtle bg-surface-1 overflow-hidden shadow-sm">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border-subtle">
        <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="text-[14px] font-semibold text-foreground">Smart Insights</p>
          <p className="text-[11px] text-muted-foreground">Personalised recommendations</p>
        </div>
      </div>
      <div className="divide-y divide-border-subtle">
        {insights.map((ins, i) => (
          <FadeIn key={i} delay={i * 40}>
            <div className="flex items-start gap-3 px-5 py-4">
              <div className="mt-0.5 shrink-0">{ins.icon}</div>
              <p className="text-[13px] text-muted-foreground leading-relaxed flex-1">{ins.text}</p>
              {ins.tag && (
                <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 bg-surface-3 px-2 py-0.5 rounded-full">
                  {ins.tag}
                </span>
              )}
            </div>
          </FadeIn>
        ))}
      </div>
    </div>
  );
});
InsightsPanel.displayName = "InsightsPanel";

function GrowthCell({ label, value, icon, danger, warning }: {
  label: string; value: string; icon?: React.ReactNode; danger?: boolean; warning?: boolean;
}) {
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <div className="flex items-center gap-1">
        {icon}
        <p className={cn("text-[12px] font-semibold capitalize", danger ? "text-danger" : warning ? "text-warning" : "text-foreground")}>
          {value}
        </p>
      </div>
    </div>
  );
}

function ActivityRow({ item, index }: { item: RecentPoint; index: number }) {
  const isPositive = item.points > 0;
  const { label, icon, color } = sourceDisplay(item.source);
  const date = new Date(item.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const time = new Date(item.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  return (
    <FadeIn delay={index * 20}>
      <div className="flex items-center gap-3 px-5 py-3.5 group hover:bg-surface-2 transition-colors duration-100">
        <div className={cn(
          "h-9 w-9 rounded-full flex items-center justify-center shrink-0",
          "transition-transform duration-150 group-hover:scale-110",
          isPositive ? "bg-success/10" : "bg-danger/10",
        )}>
          <span className={cn(isPositive ? "text-success" : "text-danger")}>{icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium text-foreground capitalize">{label}</p>
          {item.note && <p className="text-[11px] text-muted-foreground truncate">{item.note}</p>}
          <p className="text-[11px] text-muted-foreground/70">{date} · {time}</p>
        </div>
        <motion.span
          className={cn("text-[13px] font-bold tabular-nums shrink-0", isPositive ? "text-success" : "text-danger")}
          initial={{ opacity: 0, x: 4 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          {isPositive ? `+${item.points}` : item.points}
        </motion.span>
      </div>
    </FadeIn>
  );
}

export default StudentDashboard;
