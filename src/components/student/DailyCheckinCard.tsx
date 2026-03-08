import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Flame, CheckCircle2, Trophy, Zap, Star } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/* ── helpers ─────────────────────────────────────────────────── */
function toLocalISODate(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function getLast7Days() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return toLocalISODate(d);
  });
}
const DAY_LABELS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

const MILESTONES = [
  { days: 7,   bonus: 20,  icon: "🔥", label: "7-Day Streak"   },
  { days: 14,  bonus: 30,  icon: "⚡", label: "2-Week Warrior"  },
  { days: 30,  bonus: 50,  icon: "🏆", label: "Monthly Master"  },
  { days: 100, bonus: 100, icon: "💎", label: "Century Legend"  },
];

function getNextMilestone(streak: number) {
  return MILESTONES.find((m) => streak < m.days) ?? null;
}

/* ── data hook ─────────────────────────────────────────────────── */
function useDailyCheckinData() {
  return useQuery({
    queryKey: ["daily_checkin_status"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) throw new Error("Not authenticated");
      const last7 = getLast7Days();
      const [{ data: checkins }, { data: streakRaw }] = await Promise.all([
        supabase.from("daily_checkins").select("checkin_date")
          .eq("user_id", session.user.id).gte("checkin_date", last7[0])
          .order("checkin_date", { ascending: true }),
        supabase.rpc("get_my_streak"),
      ]);
      const checkinSet = new Set((checkins ?? []).map((c: any) => c.checkin_date));
      const streak = streakRaw as any;
      return {
        checkinDates: checkinSet,
        checkedInToday: checkinSet.has(toLocalISODate()),
        currentStreak: streak?.current_streak ?? 0,
        longestStreak: streak?.longest_streak ?? 0,
        last7Days: last7,
      };
    },
    staleTime: 30_000,
  });
}

/* ── Floating reward animation ─────────────────────────────────── */
function FloatingReward({ pts, visible }: { pts: number; visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="fp"
          initial={{ opacity: 1, y: 0, scale: 1 }}
          animate={{ opacity: 0, y: -56, scale: 1.3 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.8, ease: "easeOut" }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
        >
          <div className="flex items-center gap-1.5 bg-warning text-warning-foreground px-4 py-1.5 rounded-full text-sm font-black shadow-lg">
            <Zap className="h-3.5 w-3.5" />
            +{pts} pts
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ── Main component ─────────────────────────────────────────────── */
export function DailyCheckinCard() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useDailyCheckinData();
  const [justCheckedIn, setJustCheckedIn] = useState(false);
  const [floatingPts, setFloatingPts] = useState<number | null>(null);
  const [milestoneAnim, setMilestoneAnim] = useState(false);

  const checkinMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Not authenticated");
      const { data, error } = await supabase.functions.invoke("daily-checkin", {
        body: {},
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;
      if (!data.success) throw new Error(data.message ?? "Check-in failed");
      return data;
    },
    onSuccess: (result) => {
      if (result.already_checked_in) {
        toast({ title: "Already checked in", description: "Come back tomorrow! 🌟" });
        return;
      }
      setJustCheckedIn(true);
      setFloatingPts(result.points_awarded ?? 10);
      setTimeout(() => setFloatingPts(null), 2000);
      queryClient.invalidateQueries({ queryKey: ["daily_checkin_status"] });
      queryClient.invalidateQueries({ queryKey: ["student", "intelligence"] });
      if (result.milestone) {
        setMilestoneAnim(true);
        setTimeout(() => setMilestoneAnim(false), 3000);
        toast({
          title: `🏆 ${result.milestone.label}`,
          description: `Streak milestone! +${result.milestone.bonus} bonus points 🎉`,
        });
      } else {
        toast({
          title: `+${result.points_awarded} Points! 🔥`,
          description: `Day ${result.current_streak} streak — keep going!`,
        });
      }
    },
    onError: (err: any) => {
      toast({ title: "Check-in failed", description: err?.message ?? "Try again.", variant: "destructive" });
    },
  });

  const handleCheckin = useCallback(() => {
    if (checkinMutation.isPending) return;
    checkinMutation.mutate();
  }, [checkinMutation]);

  const checkedInToday = data?.checkedInToday || justCheckedIn;
  const streak = data?.currentStreak ?? 0;
  const nextMilestone = getNextMilestone(streak);
  const today = toLocalISODate();

  /* flame intensity by streak level */
  const flameColor = streak >= 14 ? "text-red-500" : streak >= 7 ? "text-orange-500" : "text-warning";
  const flameGlow = streak >= 14
    ? "drop-shadow-[0_0_8px_rgba(239,68,68,0.9)]"
    : streak >= 7
    ? "drop-shadow-[0_0_6px_rgba(249,115,22,0.8)]"
    : checkedInToday ? "drop-shadow-[0_0_4px_rgba(234,179,8,0.6)]" : "";

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border-subtle bg-surface-1 p-5 space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <Skeleton className="h-4 w-36" />
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {[...Array(7)].map((_,i) => <Skeleton key={i} className="aspect-square rounded-lg" />)}
        </div>
        <Skeleton className="h-11 w-full rounded-xl" />
      </div>
    );
  }

  if (!data) return null;
  const { last7Days, checkinDates, longestStreak } = data;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="rounded-2xl border border-border-subtle bg-surface-1 overflow-hidden shadow-sm"
    >
      {/* Animated top bar */}
      <motion.div
        className="h-1 w-full"
        style={{ background: "hsl(var(--border-subtle))" }}
        animate={checkedInToday ? {
          background: ["hsl(var(--warning))", "hsl(var(--success))", "hsl(var(--primary))"],
        } : {}}
        transition={{ duration: 1.5, ease: "easeInOut" }}
      />

      <div className="p-5 space-y-4">
        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              animate={checkedInToday ? {
                scale: [1, 1.35, 1.15, 1],
                rotate: [0, -12, 8, 0],
              } : { scale: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="h-10 w-10 rounded-xl bg-warning/10 flex items-center justify-center"
            >
              <Flame className={cn("h-5 w-5 transition-all duration-300", flameColor, flameGlow)} />
            </motion.div>
            <div>
              <p className="text-[14px] font-semibold text-foreground">Daily Check-In</p>
              <p className="text-[11px] text-muted-foreground">+10 pts per day</p>
            </div>
          </div>
          {/* Streak counter */}
          <motion.div
            key={streak}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-end"
          >
            <div className="flex items-center gap-1">
              <Flame className={cn("h-4 w-4", flameColor)} />
              <span className="text-xl font-black text-foreground tabular-nums">{streak}</span>
            </div>
            <span className="text-[10px] text-muted-foreground">day streak</span>
          </motion.div>
        </div>

        {/* ── Streak Stats row ── */}
        <div className="flex items-center gap-4 px-1">
          <div className="flex items-center gap-1.5">
            <Trophy className="h-3.5 w-3.5 text-premium" />
            <span className="text-[11px] text-muted-foreground">Best:</span>
            <span className="text-[12px] font-bold text-foreground tabular-nums">{longestStreak}d</span>
          </div>
          <div className="w-px h-4 bg-border-subtle" />
          <div className="flex items-center gap-1.5">
            <Star className="h-3.5 w-3.5 text-warning" />
            <span className="text-[11px] text-muted-foreground">Status:</span>
            <span className={cn("text-[12px] font-bold", checkedInToday ? "text-success" : "text-muted-foreground")}>
              {checkedInToday ? "Done ✓" : "Not yet"}
            </span>
          </div>
        </div>

        {/* ── 7-day calendar grid ── */}
        <div className="grid grid-cols-7 gap-1.5">
          {last7Days.map((date) => {
            const isToday   = date === today;
            const checked   = checkinDates.has(date) || (isToday && justCheckedIn);
            const dayOfWeek = new Date(`${date}T00:00:00`).getDay();
            const label     = DAY_LABELS[dayOfWeek].slice(0, 1);

            return (
              <motion.div
                key={date}
                animate={checked && isToday && justCheckedIn
                  ? { scale: [1, 1.25, 1], backgroundColor: ["transparent","hsl(var(--success)/0.3)","hsl(var(--success)/0.15)"] }
                  : {}}
                transition={{ duration: 0.45 }}
                className={cn(
                  "flex flex-col items-center justify-center rounded-xl py-2 px-1 text-center border transition-all duration-300",
                  checked && "border-success/40 bg-success/10",
                  !checked && isToday && "border-primary/60 bg-primary/8 ring-1 ring-primary/30",
                  !checked && !isToday && "border-border-subtle bg-surface-2",
                )}
              >
                <span className={cn("text-[9px] font-bold uppercase",
                  checked ? "text-success" : isToday ? "text-primary" : "text-muted-foreground",
                )}>
                  {label}
                </span>
                <span className="mt-1 text-base leading-none">
                  {checked ? "✅" : isToday ? "🔥" : "·"}
                </span>
              </motion.div>
            );
          })}
        </div>

        {/* ── Milestone progress ── */}
        {nextMilestone && (
          <div className="rounded-xl border border-warning/20 bg-warning/5 px-3.5 py-2.5">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="text-base">{nextMilestone.icon}</span>
                <span className="text-[12px] font-semibold text-foreground">{nextMilestone.label}</span>
              </div>
              <span className="text-[11px] font-bold text-warning">+{nextMilestone.bonus} pts</span>
            </div>
            <div className="w-full bg-surface-3 rounded-full h-1.5 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-warning to-orange-400"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, Math.round((streak / nextMilestone.days) * 100))}%` }}
                transition={{ duration: 0.7, ease: "easeOut", delay: 0.2 }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              {nextMilestone.days - streak} more day{nextMilestone.days - streak !== 1 ? "s" : ""} to unlock
            </p>
          </div>
        )}

        {/* ── CTA Button ── */}
        <div className="relative">
          <FloatingReward pts={floatingPts ?? 10} visible={floatingPts !== null} />

          {checkedInToday ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-success/10 border border-success/25 px-4 py-3 text-success text-[14px] font-semibold"
            >
              <CheckCircle2 className="h-4.5 w-4.5" />
              Checked In Today ✓
            </motion.div>
          ) : (
            <motion.div whileTap={{ scale: 0.96 }}>
              <Button
                className="w-full h-11 gap-2 text-[14px] font-semibold rounded-xl"
                onClick={handleCheckin}
                disabled={checkinMutation.isPending}
              >
                {checkinMutation.isPending ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                      className="h-4 w-4 border-2 border-current border-t-transparent rounded-full"
                    />
                    Checking in...
                  </>
                ) : (
                  <>
                    <Flame className="h-4 w-4" />
                    Check In Now
                  </>
                )}
              </Button>
            </motion.div>
          )}
        </div>

        {/* ── Milestone unlock celebration ── */}
        <AnimatePresence>
          {milestoneAnim && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="text-center"
            >
              <motion.p
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 0.4, repeat: 2 }}
                className="text-[13px] font-bold text-warning"
              >
                🏆 Milestone Unlocked! 🏆
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>

        {checkedInToday && !milestoneAnim && (
          <p className="text-center text-[11px] text-muted-foreground">
            Come back tomorrow to keep your streak 🌟
          </p>
        )}
      </div>
    </motion.div>
  );
}
