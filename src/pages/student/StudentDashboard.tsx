import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { DailyCheckinCard } from "@/components/student/DailyCheckinCard";
import {
  ArrowRight,
  Flame,
  Zap,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  BookOpen,
} from "lucide-react";

import { useStudentIntelligence } from "@/hooks/use-intelligence";
import { useGrowthInsights } from "@/hooks/use-growth-insights";
import { TIER_CONFIG } from "@/lib/intelligenceEngine";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { FadeIn, SlideUp, useMetricCountUp } from "@/components/ui/motion";
import { IntelligenceBar, LiveIndicator, StatusChip } from "@/components/ui/design-system";
import { cn } from "@/lib/utils";

type UpcomingLecture = {
  id: string;
  topic: string;
  lecture_date: string;
  start_time: string;
  end_time: string;
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

function getTimeGreeting(now = new Date()) {
  const h = now.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

const StudentDashboard = () => {
  const intelligence = useStudentIntelligence();
  const growth = useGrowthInsights();

  const [stats, setStats] = useState({
    totalPoints: 0,
    lecturesAttended: 0,
    totalLectures: 0,
    currentStreak: 0,
  });

  const [nextLecture, setNextLecture] = useState<UpcomingLecture | null>(null);
  const [liveNow, setLiveNow] = useState<UpcomingLecture | null>(null);
  const [recentPoints, setRecentPoints] = useState<RecentPoint[]>([]);
  const [name, setName] = useState("Student");
  const [loading, setLoading] = useState(true);
  const greeting = useMemo(() => getTimeGreeting(), []);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) return;

      const [
        { data: profile },
        { data: pointsTotal },
        { data: streakRaw },
        { data: liveList },
      ] = await Promise.all([
        supabase.from("profiles").select("name").eq("user_id", user.id).maybeSingle(),
        supabase.rpc("get_my_points_total"),
        supabase.rpc("get_my_streak"),
        supabase.from("lectures")
          .select("id, topic, lecture_date, start_time, end_time, venue, status")
          .eq("status", "live")
          .limit(1),
      ]);

      setName((profile as any)?.name?.split(" ")[0] || "Student");
      const streakData = streakRaw as any;
      setStats(prev => ({
        ...prev,
        totalPoints: Number(pointsTotal ?? 0),
        currentStreak: streakData?.current_streak ?? 0,
      }));
      setLiveNow(((liveList ?? [])[0] as UpcomingLecture | undefined) ?? null);
      setLoading(false);

      const [
        { data: attendanceData },
        { data: allLectures },
        { data: upcomingList },
        { data: recentPts },
      ] = await Promise.all([
        supabase.from("attendance").select("id").eq("student_user_id", user.id).eq("status", "present"),
        supabase.from("lectures").select("id"),
        supabase
          .from("lectures")
          .select("id, topic, lecture_date, start_time, end_time, venue, status")
          .gte("lecture_date", new Date().toISOString().split("T")[0])
          .neq("status", "ended")
          .order("lecture_date", { ascending: true })
          .order("start_time", { ascending: true })
          .limit(1),
        supabase
          .from("points_ledger")
          .select("id, created_at, points, source, note")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

      setStats(prev => ({
        ...prev,
        lecturesAttended: attendanceData?.length || 0,
        totalLectures: allLectures?.length || 0,
      }));
      setNextLecture(((upcomingList ?? [])[0] as UpcomingLecture | undefined) ?? null);
      setRecentPoints((recentPts ?? []) as RecentPoint[]);
    } catch (error) {
      console.error("Dashboard fetch error:", error);
      setLoading(false);
    }
  };

  const tierData = intelligence.data ? TIER_CONFIG[intelligence.data.tier] : null;
  const attendancePct = stats.totalLectures > 0
    ? Math.round((stats.lecturesAttended / stats.totalLectures) * 100)
    : 0;

  return (
    <div className="space-y-6 page-enter">

      {/* ── HERO: Greeting + Tier Identity ─────────────────────── */}
      <FadeIn>
        <div className="rounded-xl border border-border-subtle bg-surface-1 shadow-sm overflow-hidden">
          {/* Top bar: tier accent */}
          {tierData && (
            <div
              className="h-1 w-full"
              style={{ background: `hsl(var(--primary))` }}
            />
          )}
          <div className="p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <p className="text-label uppercase tracking-widest text-muted-foreground">
                  {greeting}
                </p>
                <h1 className="text-display text-foreground">{name}</h1>
                {tierData && (
                  <span className="inline-flex items-center gap-1.5 mt-1 text-caption font-medium text-muted-foreground">
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ background: tierData.color ?? "hsl(var(--primary))" }}
                    />
                    {tierData.label} Tier
                  </span>
                )}
              </div>

              {/* Attendance ring */}
              <div className="flex-shrink-0 text-center">
                <AttendanceRing pct={attendancePct} loading={loading} />
              </div>
            </div>

            {/* Points + Streak row */}
            <div className="mt-5 pt-4 border-t border-border-subtle grid grid-cols-2 gap-4">
              <StatPill
                label="Total Points"
                value={stats.totalPoints}
                icon={<Zap className="h-3.5 w-3.5" />}
                loading={loading}
              />
              <StatPill
                label="Day Streak"
                value={stats.currentStreak}
                suffix="d"
                icon={<Flame className="h-3.5 w-3.5 text-warning" />}
                loading={loading}
              />
            </div>
          </div>
        </div>
      </FadeIn>

      {/* ── DAILY CHECK-IN ───────────────────────────────────────── */}
      <SlideUp delay={30}>
        <DailyCheckinCard />
      </SlideUp>

      {/* ── LIVE ACTION ZONE ─────────────────────────────────────── */}
      {liveNow ? (
        <SlideUp delay={40}>
          <div className="rounded-xl border border-success/25 bg-success-soft shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <LiveIndicator />
                <div className="min-w-0">
                  <p className="text-body-lg font-semibold text-foreground truncate">{liveNow.topic}</p>
                  <p className="text-caption text-muted-foreground">{liveNow.venue} · {liveNow.start_time}</p>
                </div>
              </div>
              <Button asChild size="sm" className="shrink-0 shadow-primary">
                <Link to={`/app/lectures/${liveNow.id}`}>
                  Mark Attendance
                  <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Link>
              </Button>
            </div>
          </div>
        </SlideUp>
      ) : nextLecture ? (
        <SlideUp delay={40}>
          <div className="rounded-xl border border-border-subtle bg-surface-1 shadow-xs">
            <div className="flex items-center justify-between px-5 py-4 gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-8 w-8 rounded-lg bg-primary/8 flex items-center justify-center shrink-0">
                  <Clock className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-body font-medium text-foreground truncate">
                    Next: {nextLecture.topic}
                  </p>
                  <p className="text-caption text-muted-foreground">
                    {nextLecture.lecture_date} · {nextLecture.start_time} · {nextLecture.venue}
                  </p>
                </div>
              </div>
              <Button asChild variant="outline" size="sm" className="shrink-0">
                <Link to="/app/lectures">View</Link>
              </Button>
            </div>
          </div>
        </SlideUp>
      ) : null}

      {/* ── INTELLIGENCE STRIP ──────────────────────────────────── */}
      {(intelligence.data || intelligence.isLoading) && (
        <SlideUp delay={80}>
          <div className="rounded-xl border border-border-subtle bg-surface-1 shadow-xs">
            <div className="px-5 pt-4 pb-1">
              <p className="text-label uppercase tracking-widest text-muted-foreground mb-3">
                Performance Intelligence
              </p>
            </div>

            {intelligence.isLoading ? (
              <div className="px-5 pb-5 space-y-3">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-full" />
              </div>
            ) : intelligence.data ? (
              <div className="px-5 pb-5 space-y-3">
                <IntelligenceBar value={intelligence.data.attendanceConsistency} label="Attendance Consistency" />
                <IntelligenceBar value={intelligence.data.behaviourReliability} label="Behaviour Reliability" />
                <IntelligenceBar value={intelligence.data.engagementIndex} label="Engagement Index" />
              </div>
            ) : null}

            {/* Growth summary row */}
            {growth.data && (
              <div className="border-t border-border-subtle px-5 py-3 grid grid-cols-2 sm:grid-cols-4 gap-4">
                <GrowthCell
                  label="30-Day Attendance"
                  value={`${growth.data.last_30_day_attendance_pct}%`}
                />
                <GrowthCell
                  label="Trend"
                  value={growth.data.trend_direction}
                  icon={
                    growth.data.trend_direction === "improving"
                      ? <TrendingUp className="h-3 w-3 text-success" />
                      : growth.data.trend_direction === "declining"
                      ? <TrendingDown className="h-3 w-3 text-danger" />
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
                  danger={growth.data.risk_probability === "high"}
                  warning={growth.data.risk_probability === "medium"}
                />
              </div>
            )}
          </div>
        </SlideUp>
      )}

      {/* ── ACTIVITY TIMELINE ───────────────────────────────────── */}
      <SlideUp delay={120}>
        <div className="rounded-xl border border-border-subtle bg-surface-1 shadow-xs overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              <p className="text-body font-medium text-foreground">Recent Activity</p>
            </div>
            <Button asChild variant="ghost" size="sm" className="h-7 text-caption gap-1 text-muted-foreground">
              <Link to="/app/attendance">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </div>

          {loading ? (
            <div className="px-5 py-4 space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="space-y-1.5">
                    <Skeleton className="h-3 w-28" />
                    <Skeleton className="h-2.5 w-20" />
                  </div>
                  <Skeleton className="h-3 w-10" />
                </div>
              ))}
            </div>
          ) : recentPoints.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-caption text-muted-foreground">No activity yet.</p>
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

/* ── Sub-components ─────────────────────────────────────────────── */

function AttendanceRing({ pct, loading }: { pct: number; loading: boolean }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const dash = ((loading ? 0 : pct) / 100) * circ;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={72} height={72} className="-rotate-90">
        <circle cx={36} cy={36} r={r} strokeWidth={5}
          className="stroke-surface-3 fill-none" />
        <circle cx={36} cy={36} r={r} strokeWidth={5}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          className="stroke-primary fill-none transition-all duration-slow" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[15px] font-bold text-foreground tabular-nums leading-none">
          {loading ? "—" : `${pct}%`}
        </span>
        <span className="text-[9px] text-muted-foreground uppercase tracking-wider leading-none mt-0.5">
          Att.
        </span>
      </div>
    </div>
  );
}

function StatPill({
  label,
  value,
  suffix = "",
  icon,
  loading,
}: {
  label: string;
  value: number;
  suffix?: string;
  icon: React.ReactNode;
  loading: boolean;
}) {
  const counted = useMetricCountUp(loading ? 0 : value, 800);
  return (
    <div className="flex items-center gap-2.5">
      <div className="h-7 w-7 rounded-md bg-surface-3 flex items-center justify-center text-muted-foreground">
        {icon}
      </div>
      <div>
        <p className="text-label uppercase tracking-widest text-muted-foreground">{label}</p>
        {loading ? (
          <Skeleton className="h-4 w-12 mt-0.5" />
        ) : (
          <p className="text-body font-semibold text-foreground tabular-nums">
            {counted}{suffix}
          </p>
        )}
      </div>
    </div>
  );
}

function GrowthCell({
  label,
  value,
  icon,
  danger,
  warning,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  danger?: boolean;
  warning?: boolean;
}) {
  return (
    <div className="space-y-0.5">
      <p className="text-label uppercase tracking-widest text-muted-foreground">{label}</p>
      <div className="flex items-center gap-1">
        {icon}
        <p
          className={cn(
            "text-caption font-semibold capitalize",
            danger  && "text-danger",
            warning && "text-warning",
            !danger && !warning && "text-foreground",
          )}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function ActivityRow({ item, index }: { item: RecentPoint; index: number }) {
  const isPositive = item.points > 0;
  const label = item.source.replace(/_/g, " ");
  const date = new Date(item.created_at).toLocaleDateString("en-GB", {
    day: "numeric", month: "short",
  });

  return (
    <FadeIn delay={index * 25}>
      <div className="flex items-center gap-3 px-5 py-3">
        {/* Timeline dot */}
        <div className={cn(
          "h-7 w-7 rounded-full flex items-center justify-center shrink-0",
          isPositive ? "bg-success-soft" : "bg-danger-soft",
        )}>
          {isPositive
            ? <CheckCircle2 className="h-3.5 w-3.5 text-success" />
            : <AlertTriangle className="h-3.5 w-3.5 text-danger" />
          }
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-caption font-medium text-foreground capitalize">{label}</p>
          <p className="text-[11px] text-muted-foreground">{date}</p>
        </div>

        <span className={cn(
          "text-caption font-semibold tabular-nums shrink-0",
          isPositive ? "text-success" : "text-danger",
        )}>
          {isPositive ? `+${item.points}` : item.points}
        </span>
      </div>
    </FadeIn>
  );
}

export default StudentDashboard;
