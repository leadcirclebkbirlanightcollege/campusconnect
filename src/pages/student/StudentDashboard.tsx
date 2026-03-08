import { useEffect, useMemo, useState, memo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { DailyCheckinCard } from "@/components/student/DailyCheckinCard";
import IntelligenceScoreCard from "@/components/student/IntelligenceScoreCard";
import SmartInsightsStrip from "@/components/student/SmartInsightsStrip";
import {
  Flame, Zap, TrendingUp, TrendingDown, Minus,
  Clock, CheckCircle2, ChevronRight, BookOpen,
  Trophy, Shield, Target, BarChart3, Star, Activity,
  CalendarCheck, Award, Sparkles,
} from "lucide-react";
import { useStudentIntelligence } from "@/hooks/use-intelligence";
import { useGrowthInsights } from "@/hooks/use-growth-insights";
import { TIER_CONFIG } from "@/lib/intelligenceEngine";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { FadeIn, SlideUp, useMetricCountUp } from "@/components/ui/motion";
import { IntelligenceBar, LiveIndicator } from "@/components/ui/design-system";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

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

/* ── Tier point thresholds ─────────────────────────────────────── */
const TIER_THRESHOLDS = { bronze: 0, silver: 100, gold: 250, elite: 500 } as const;
const TIER_NEXT = { bronze: "silver", silver: "gold", gold: "elite", elite: null } as const;
type TierKey = keyof typeof TIER_THRESHOLDS;

function getTierProgress(pts: number, tier: TierKey) {
  const next = TIER_NEXT[tier];
  if (!next) return { pct: 100, remaining: 0, nextLabel: "Max Tier" };
  const from = TIER_THRESHOLDS[tier];
  const to   = TIER_THRESHOLDS[next as TierKey];
  const pct  = Math.min(100, Math.round(((pts - from) / (to - from)) * 100));
  return { pct, remaining: Math.max(0, to - pts), nextLabel: TIER_CONFIG[next as TierKey].label };
}

function getTimeGreeting(now = new Date()) {
  const h = now.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

/* ── Source → display label + icon ────────────────────────────── */
function sourceDisplay(source: string): { label: string; icon: React.ReactNode; color: string } {
  const s = source.toLowerCase();
  if (s.includes("attendance")) return { label: "Attendance", icon: <CalendarCheck className="h-3.5 w-3.5" />, color: "text-success" };
  if (s.includes("checkin"))   return { label: "Daily Check-In", icon: <Flame className="h-3.5 w-3.5" />, color: "text-warning" };
  if (s.includes("reward"))    return { label: "Daily Reward", icon: <Star className="h-3.5 w-3.5" />, color: "text-premium" };
  if (s.includes("achievement")) return { label: "Achievement", icon: <Award className="h-3.5 w-3.5" />, color: "text-primary" };
  if (s.includes("admin"))     return { label: "Admin Bonus", icon: <Zap className="h-3.5 w-3.5" />, color: "text-primary" };
  return { label: source.replace(/_/g, " "), icon: <Activity className="h-3.5 w-3.5" />, color: "text-muted-foreground" };
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════ */
const StudentDashboard = () => {
  const intelligence = useStudentIntelligence();
  const growth = useGrowthInsights();
  const greeting = useMemo(() => getTimeGreeting(), []);

  const [stats, setStats] = useState({ totalPoints: 0, lecturesAttended: 0, totalLectures: 0, currentStreak: 0, longestStreak: 0 });
  const [nextLecture, setNextLecture] = useState<UpcomingLecture | null>(null);
  const [liveNow, setLiveNow]         = useState<UpcomingLecture | null>(null);
  const [recentPoints, setRecentPoints] = useState<RecentPoint[]>([]);
  const [name, setName]               = useState("Student");
  const [loading, setLoading]         = useState(true);

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

  const tierKey   = (intelligence.data?.tier ?? "bronze") as TierKey;
  const tierData  = TIER_CONFIG[tierKey];
  const tierProgress = getTierProgress(stats.totalPoints, tierKey);
  const attendancePct = stats.totalLectures > 0
    ? Math.round((stats.lecturesAttended / stats.totalLectures) * 100) : 0;

  const riskLevel = growth.data?.risk_probability ?? "low";
  const riskColor = riskLevel === "high" ? "text-danger" : riskLevel === "medium" ? "text-warning" : "text-success";
  const riskBg    = riskLevel === "high" ? "bg-danger/10 border-danger/20" : riskLevel === "medium" ? "bg-warning/10 border-warning/20" : "bg-success/10 border-success/20";

  return (
    <div className="space-y-5 page-enter max-w-2xl mx-auto pb-8">

      {/* ╔═══════════════════════════════════════════╗
          ║  HERO — COMMAND IDENTITY CARD             ║
          ╚═══════════════════════════════════════════╝ */}
      <FadeIn>
        <div className="rounded-2xl border border-border-subtle bg-surface-1 overflow-hidden dashboard-panel shadow-sm">
          {/* Tier accent bar */}
          <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary) / 0.4))` }} />

          <div className="p-5 sm:p-6">
            {/* Top row: greeting + attendance ring */}
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1 min-w-0">
                <p className="text-label uppercase tracking-widest text-muted-foreground">{greeting}</p>
                <h1 className="text-display text-foreground">{name}</h1>
                {tierData && (
                  <TierBadge label={tierData.label} color={tierData.color} bg={tierData.bg} border={tierData.border} />
                )}
              </div>
              <div className="shrink-0">
                <AttendanceRing pct={attendancePct} loading={loading} />
              </div>
            </div>

            {/* Stats row */}
            <div className="mt-5 pt-4 border-t border-border-subtle grid grid-cols-3 gap-3">
              <StatMini label="Points" value={stats.totalPoints} icon={<Zap className="h-3.5 w-3.5" />} loading={loading} accent="text-primary" />
              <StatMini label="Streak" value={stats.currentStreak} suffix="d" icon={<Flame className="h-3.5 w-3.5" />} loading={loading} accent="text-warning" />
              <StatMini label="Attended" value={stats.lecturesAttended} icon={<CheckCircle2 className="h-3.5 w-3.5" />} loading={loading} accent="text-success" />
            </div>

            {/* Tier progress bar */}
            <div className="mt-4 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground uppercase tracking-widest">
                  {tierData?.label} → {tierProgress.nextLabel}
                </span>
                <span className="text-[11px] font-semibold text-foreground tabular-nums">
                  {tierProgress.remaining > 0 ? `${tierProgress.remaining} pts to go` : "Max Tier 🏆"}
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-surface-3 overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: "hsl(var(--primary))" }}
                  initial={{ width: "0%" }}
                  animate={{ width: `${tierProgress.pct}%` }}
                  transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
                />
              </div>
            </div>
          </div>
        </div>
      </FadeIn>

      {/* ╔═══════════════════════════════════════════╗
          ║  QUICK ACTIONS                            ║
          ╚═══════════════════════════════════════════╝ */}
      <SlideUp delay={20}>
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Check In",     icon: <Flame className="h-5 w-5" />,        href: "#checkin",          color: "text-warning" },
            { label: "Attendance",   icon: <CalendarCheck className="h-5 w-5" />, href: "/app/attendance",   color: "text-success" },
            { label: "Leaderboard",  icon: <Trophy className="h-5 w-5" />,        href: "/app/leaderboard",  color: "text-premium" },
            { label: "Lectures",     icon: <BookOpen className="h-5 w-5" />,      href: "/app/lectures",     color: "text-primary" },
          ].map((a) => (
            a.href === "#checkin"
              ? <QuickActionBtn key={a.label} label={a.label} icon={a.icon} color={a.color} onClick={() => document.getElementById("checkin-card")?.scrollIntoView({ behavior: "smooth" })} />
              : <QuickActionLink key={a.label} label={a.label} icon={a.icon} color={a.color} href={a.href} />
          ))}
        </div>
      </SlideUp>

      {/* ╔═══════════════════════════════════════════╗
          ║  LIVE / UPCOMING LECTURE BANNER           ║
          ╚═══════════════════════════════════════════╝ */}
      <AnimatePresence>
        {liveNow ? (
          <SlideUp delay={30}>
            <div className="rounded-xl border border-success/30 bg-success/8 overflow-hidden dashboard-panel">
              <div className="flex items-center justify-between px-5 py-4 gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <LiveIndicator />
                  <div className="min-w-0">
                    <p className="text-body-lg font-semibold text-foreground truncate">{liveNow.topic}</p>
                    <p className="text-caption text-muted-foreground">{liveNow.venue} · {liveNow.start_time}</p>
                  </div>
                </div>
                <Button asChild size="sm" className="shrink-0">
                  <Link to={`/app/lectures/${liveNow.id}`}>
                    Mark Attendance <ChevronRight className="h-3.5 w-3.5 ml-1" />
                  </Link>
                </Button>
              </div>
            </div>
          </SlideUp>
        ) : nextLecture ? (
          <SlideUp delay={30}>
            <div className="rounded-xl border border-border-subtle bg-surface-1 dashboard-panel shadow-xs">
              <div className="flex items-center justify-between px-5 py-4 gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-xl bg-primary/8 flex items-center justify-center shrink-0">
                    <Clock className="h-4.5 w-4.5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-caption text-muted-foreground uppercase tracking-widest">Next Lecture</p>
                    <p className="text-body font-semibold text-foreground truncate">{nextLecture.topic}</p>
                    <p className="text-caption text-muted-foreground">{nextLecture.lecture_date} · {nextLecture.start_time} · {nextLecture.venue}</p>
                  </div>
                </div>
                <Button asChild variant="outline" size="sm" className="shrink-0">
                  <Link to="/app/lectures">View</Link>
                </Button>
              </div>
            </div>
          </SlideUp>
        ) : null}
      </AnimatePresence>

      {/* ╔═══════════════════════════════════════════╗
          ║  DAILY CHECK-IN                           ║
          ╚═══════════════════════════════════════════╝ */}
      <SlideUp delay={40}>
        <div id="checkin-card">
          <DailyCheckinCard />
        </div>
      </SlideUp>

      {/* ╔═══════════════════════════════════════════╗
          ║  INTELLIGENCE SCORE & GOAL TRACKER        ║
          ╚═══════════════════════════════════════════╝ */}
      <SlideUp delay={55}>
        <IntelligenceScoreCard />
      </SlideUp>

      {/* ╔═══════════════════════════════════════════╗
          ║  ACADEMIC INTELLIGENCE PANEL              ║
          ╚═══════════════════════════════════════════╝ */}
      {(intelligence.data || intelligence.isLoading) && (
        <SlideUp delay={60}>
          <div className="rounded-2xl border border-border-subtle bg-surface-1 overflow-hidden dashboard-panel shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border-subtle">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <BarChart3 className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-body font-semibold text-foreground">Academic Intelligence</p>
                  <p className="text-[11px] text-muted-foreground">Performance metrics · Updated live</p>
                </div>
              </div>
              {intelligence.data && (
                <div className={cn("px-2.5 py-1 rounded-full text-[11px] font-semibold border", tierData.bg, tierData.border, tierData.color)}>
                  {tierData.label}
                </div>
              )}
            </div>

            {/* Intelligence bars */}
            <div className="px-5 py-4 space-y-4">
              {intelligence.isLoading ? (
                <>
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-5/6" />
                  <Skeleton className="h-3 w-4/5" />
                </>
              ) : intelligence.data ? (
                <>
                  <IntelligenceBar value={intelligence.data.attendanceConsistency} label="Attendance Consistency" />
                  <IntelligenceBar value={intelligence.data.behaviourReliability} label="Behaviour Reliability" />
                  <IntelligenceBar value={intelligence.data.engagementIndex} label="Engagement Index" />
                </>
              ) : null}
            </div>

            {/* Growth summary */}
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
          ║  2-COLUMN: STREAK + RISK                  ║
          ╚═══════════════════════════════════════════╝ */}
      <SlideUp delay={80}>
        <div className="grid grid-cols-2 gap-4">

          {/* Streak panel */}
          <div className="rounded-2xl border border-border-subtle bg-surface-1 p-4 dashboard-panel shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}>
                <Flame className={cn("h-5 w-5", stats.currentStreak > 0 ? "streak-flame text-warning" : "text-muted-foreground")} />
              </motion.div>
              <p className="text-body font-semibold text-foreground">Streak</p>
            </div>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div>
                  <p className="text-[28px] font-bold text-foreground tabular-nums leading-none">{stats.currentStreak}</p>
                  <p className="text-caption text-muted-foreground mt-0.5">day streak</p>
                </div>
                <div className="flex items-center gap-1.5 pt-1 border-t border-border-subtle">
                  <Trophy className="h-3.5 w-3.5 text-premium" />
                  <span className="text-[11px] text-muted-foreground">Best:</span>
                  <span className="text-[11px] font-semibold text-foreground tabular-nums">{stats.longestStreak}d</span>
                </div>
              </>
            )}
          </div>

          {/* Risk panel */}
          <div className={cn("rounded-2xl border p-4 dashboard-panel shadow-xs space-y-3", riskBg)}>
            <div className="flex items-center gap-2">
              <Shield className={cn("h-5 w-5", riskColor)} />
              <p className="text-body font-semibold text-foreground">Risk</p>
            </div>
            {growth.isLoading || loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div>
                  <p className={cn("text-[20px] font-bold leading-none capitalize tabular-nums", riskColor)}>
                    {riskLevel}
                  </p>
                  <p className="text-caption text-muted-foreground mt-0.5">risk level</p>
                </div>
                <div className="flex items-center gap-1.5 pt-1 border-t border-border-subtle/50">
                  <Target className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-[11px] text-muted-foreground capitalize">
                    {riskLevel === "high" ? "Action needed" : riskLevel === "medium" ? "Stay consistent" : "On track"}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </SlideUp>

      {/* ╔═══════════════════════════════════════════╗
          ║  SMART INSIGHTS                           ║
          ╚═══════════════════════════════════════════╝ */}
      {growth.data && !growth.isLoading && (
        <SlideUp delay={90}>
          <InsightsPanel growth={growth.data} tierProgress={tierProgress} attendancePct={attendancePct} currentStreak={stats.currentStreak} />
        </SlideUp>
      )}

      {/* ╔═══════════════════════════════════════════╗
          ║  ACTIVITY TIMELINE                        ║
          ╚═══════════════════════════════════════════╝ */}
      <SlideUp delay={100}>
        <div className="rounded-2xl border border-border-subtle bg-surface-1 overflow-hidden dashboard-panel shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-surface-3 flex items-center justify-center">
                <Activity className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-body font-semibold text-foreground">Activity Feed</p>
            </div>
            <Button asChild variant="ghost" size="sm" className="h-7 text-caption gap-1 text-muted-foreground">
              <Link to="/app/attendance">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </div>

          {loading ? (
            <div className="px-5 py-4 space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-28" />
                    <Skeleton className="h-2.5 w-20" />
                  </div>
                  <Skeleton className="h-3 w-10" />
                </div>
              ))}
            </div>
          ) : recentPoints.length === 0 ? (
            <div className="px-5 py-10 text-center space-y-2">
              <Sparkles className="h-8 w-8 text-muted-foreground mx-auto opacity-40" />
              <p className="text-caption text-muted-foreground">No activity yet. Start by checking in!</p>
            </div>
          ) : (
            <div className="divide-y divide-border-subtle">
              {recentPoints.map((p, i) => (
                <ActivityRow key={p.id} item={p} index={i} />
              ))}
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

function TierBadge({ label, color, bg, border }: { label: string; color: string; bg: string; border: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 mt-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border", bg, border, color)}>
      <Star className="h-2.5 w-2.5" />
      {label} Tier
    </span>
  );
}

function AttendanceRing({ pct, loading }: { pct: number; loading: boolean }) {
  const size = 80; const sw = 6; const r = (size - sw) / 2;
  const circ = 2 * Math.PI * r;
  const dash = ((loading ? 0 : pct) / 100) * circ;
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} strokeWidth={sw} className="stroke-surface-3 fill-none" />
        <circle cx={size/2} cy={size/2} r={r} strokeWidth={sw}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          className="stroke-primary fill-none transition-all duration-slow" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-base font-bold text-foreground tabular-nums leading-none">
          {loading ? "—" : `${pct}%`}
        </span>
        <span className="text-[9px] text-muted-foreground uppercase tracking-wider leading-none mt-0.5">Att.</span>
      </div>
    </div>
  );
}

function StatMini({ label, value, suffix = "", icon, loading, accent }: {
  label: string; value: number; suffix?: string;
  icon: React.ReactNode; loading: boolean; accent: string;
}) {
  const counted = useMetricCountUp(loading ? 0 : value, 900);
  return (
    <div className="flex flex-col items-center gap-1 py-1">
      <div className={cn("h-6 w-6 flex items-center justify-center", accent)}>{icon}</div>
      {loading
        ? <Skeleton className="h-4 w-10" />
        : <p className="text-body font-bold text-foreground tabular-nums">{counted}{suffix}</p>
      }
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
    </div>
  );
}

function QuickActionLink({ label, icon, color, href }: { label: string; icon: React.ReactNode; color: string; href: string }) {
  return (
    <Link to={href} className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border-subtle bg-surface-1 quick-action cursor-pointer group">
      <div className={cn("h-9 w-9 rounded-xl bg-surface-3 flex items-center justify-center group-hover:bg-primary/10 transition-colors duration-150", color)}>
        {icon}
      </div>
      <span className="text-[11px] text-muted-foreground font-medium leading-tight text-center">{label}</span>
    </Link>
  );
}

function QuickActionBtn({ label, icon, color, onClick }: { label: string; icon: React.ReactNode; color: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border-subtle bg-surface-1 quick-action cursor-pointer group w-full">
      <div className={cn("h-9 w-9 rounded-xl bg-surface-3 flex items-center justify-center group-hover:bg-primary/10 transition-colors duration-150", color)}>
        {icon}
      </div>
      <span className="text-[11px] text-muted-foreground font-medium leading-tight text-center">{label}</span>
    </button>
  );
}

const InsightsPanel = memo(({ growth, tierProgress, attendancePct, currentStreak }: {
  growth: any; tierProgress: { remaining: number; nextLabel: string; pct: number };
  attendancePct: number; currentStreak: number;
}) => {
  const insights: Array<{ icon: React.ReactNode; text: string; color: string }> = [];

  if (growth.trend_direction === "improving")
    insights.push({ icon: <TrendingUp className="h-4 w-4 shrink-0 text-success" />, text: `Attendance is improving — up ${Math.abs(growth.last_30_day_attendance_pct - attendancePct)}% vs last period`, color: "text-success" });
  else if (growth.trend_direction === "declining")
    insights.push({ icon: <TrendingDown className="h-4 w-4 shrink-0 text-danger" />, text: `Attendance trend declining. Try not to miss upcoming lectures`, color: "text-danger" });

  if (tierProgress.remaining > 0)
    insights.push({ icon: <Zap className="h-4 w-4 shrink-0 text-primary" />, text: `${tierProgress.remaining} more points to reach ${tierProgress.nextLabel} tier 🚀`, color: "text-primary" });

  if (currentStreak > 0 && currentStreak < 7)
    insights.push({ icon: <Flame className="h-4 w-4 shrink-0 text-warning" />, text: `${7 - currentStreak} more check-in${7 - currentStreak > 1 ? "s" : ""} to unlock the 7-day streak bonus (+20 pts)`, color: "text-warning" });

  if (currentStreak >= 7)
    insights.push({ icon: <Trophy className="h-4 w-4 shrink-0 text-premium" />, text: `🏆 ${currentStreak}-day streak! Amazing consistency — keep it up!`, color: "text-premium" });

  if (attendancePct >= 90)
    insights.push({ icon: <Star className="h-4 w-4 shrink-0 text-premium" />, text: `Outstanding attendance at ${attendancePct}% — you're in the top tier`, color: "text-premium" });

  if (insights.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border-subtle bg-surface-1 overflow-hidden dashboard-panel shadow-sm">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border-subtle">
        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        <p className="text-body font-semibold text-foreground">Smart Insights</p>
      </div>
      <div className="divide-y divide-border-subtle">
        {insights.map((ins, i) => (
          <FadeIn key={i} delay={i * 40}>
            <div className="flex items-start gap-3 px-5 py-3.5">
              <div className="mt-0.5">{ins.icon}</div>
              <p className="text-caption text-muted-foreground leading-relaxed">{ins.text}</p>
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
      <p className="text-label uppercase tracking-widest text-muted-foreground">{label}</p>
      <div className="flex items-center gap-1">
        {icon}
        <p className={cn("text-caption font-semibold capitalize", danger ? "text-danger" : warning ? "text-warning" : "text-foreground")}>
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
      <div className="flex items-center gap-3 px-5 py-3.5 group">
        <div className={cn("h-8 w-8 rounded-full flex items-center justify-center shrink-0 transition-transform duration-150 group-hover:scale-110", isPositive ? "bg-success/10" : "bg-danger/10")}>
          <span className={cn(isPositive ? "text-success" : "text-danger")}>{icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-caption font-medium text-foreground capitalize">{label}</p>
          {item.note && <p className="text-[11px] text-muted-foreground truncate">{item.note}</p>}
          <p className="text-[11px] text-muted-foreground">{date} · {time}</p>
        </div>
        <motion.span
          className={cn("text-caption font-bold tabular-nums shrink-0", isPositive ? "text-success" : "text-danger")}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          {isPositive ? `+${item.points}` : item.points}
        </motion.span>
      </div>
    </FadeIn>
  );
}

export default StudentDashboard;
