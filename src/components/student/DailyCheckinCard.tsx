import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Flame, CheckCircle2, Trophy, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/* ── helpers ─────────────────────────────────────────────────── */
function toLocalISODate(d = new Date()) {
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, "0");
  const dd   = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function getLast7Days() {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(toLocalISODate(d));
  }
  return days;
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/* ── data hooks ─────────────────────────────────────────────── */
function useDailyCheckinData() {
  return useQuery({
    queryKey: ["daily_checkin_status"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) throw new Error("Not authenticated");

      const last7 = getLast7Days();
      const since = last7[0];

      const [{ data: checkins }, { data: streakRaw }] = await Promise.all([
        supabase
          .from("daily_checkins")
          .select("checkin_date")
          .eq("user_id", userId)
          .gte("checkin_date", since)
          .order("checkin_date", { ascending: true }),
        supabase.rpc("get_my_streak"),
      ]);

      const checkinSet = new Set((checkins ?? []).map((c: any) => c.checkin_date));
      const today = toLocalISODate();
      const streak = streakRaw as any;

      return {
        checkinDates: checkinSet,
        checkedInToday: checkinSet.has(today),
        currentStreak: streak?.current_streak ?? 0,
        longestStreak: streak?.longest_streak ?? 0,
        last7Days: last7,
      };
    },
    staleTime: 30_000,
  });
}

/* ── main component ─────────────────────────────────────────── */
export function DailyCheckinCard() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useDailyCheckinData();
  const [justCheckedIn, setJustCheckedIn] = useState(false);
  const [floatingPoints, setFloatingPoints] = useState<number | null>(null);

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
        toast({
          title: "Already checked in",
          description: "You've already claimed today's check-in. Come back tomorrow! 🌟",
        });
        return;
      }

      setJustCheckedIn(true);
      setFloatingPoints(result.points_awarded);
      setTimeout(() => setFloatingPoints(null), 1800);

      // Invalidate caches
      queryClient.invalidateQueries({ queryKey: ["daily_checkin_status"] });
      queryClient.invalidateQueries({ queryKey: ["student", "intelligence"] });

      const milestone = result.milestone;
      if (milestone) {
        toast({
          title: `🏆 ${milestone.label}`,
          description: `Streak milestone unlocked! +${milestone.bonus} bonus points 🎉`,
        });
      } else {
        toast({
          title: `+${result.points_awarded} points! 🔥`,
          description: `Daily check-in successful — ${result.current_streak} day streak!`,
        });
      }
    },
    onError: (err: any) => {
      toast({
        title: "Check-in failed",
        description: err?.message ?? "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCheckin = useCallback(() => {
    if (checkinMutation.isPending) return;
    checkinMutation.mutate();
  }, [checkinMutation]);

  const checkedInToday = data?.checkedInToday || justCheckedIn;

  /* ── skeleton ── */
  if (isLoading) {
    return (
      <div className="rounded-xl border border-border-subtle bg-surface-1 shadow-xs p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded-full" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="flex gap-2">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-3 w-16" />)}
        </div>
        <div className="flex gap-1.5">
          {[...Array(7)].map((_, i) => <Skeleton key={i} className="flex-1 aspect-square rounded-md" />)}
        </div>
        <Skeleton className="h-9 w-full rounded-md" />
      </div>
    );
  }

  if (error || !data) return null;

  const { last7Days, checkinDates, currentStreak, longestStreak } = data;
  const today = toLocalISODate();

  return (
    <div className="rounded-xl border border-border-subtle bg-surface-1 shadow-xs overflow-hidden relative">
      {/* Streak top accent */}
      <div
        className="h-1 w-full transition-all duration-500"
        style={{
          background: checkedInToday
            ? "linear-gradient(90deg, hsl(var(--success)), hsl(var(--primary)))"
            : "hsl(var(--border-subtle))",
        }}
      />

      <div className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <motion.div
              animate={checkedInToday ? { scale: [1, 1.3, 1] } : {}}
              transition={{ duration: 0.4 }}
            >
              <Flame
                className={cn(
                  "h-5 w-5 transition-colors duration-300",
                  checkedInToday ? "text-warning" : "text-muted-foreground",
                )}
              />
            </motion.div>
            <p className="text-body font-semibold text-foreground">Daily Check-In</p>
          </div>
          <span className="text-caption text-muted-foreground">+10 pts</span>
        </div>

        {/* Streak stats */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Flame className="h-3.5 w-3.5 text-warning" />
            <span className="text-body-lg font-bold text-foreground tabular-nums">
              {currentStreak}
            </span>
            <span className="text-caption text-muted-foreground">day streak</span>
          </div>
          <div className="w-px h-4 bg-border-subtle" />
          <div className="flex items-center gap-1.5">
            <Trophy className="h-3.5 w-3.5 text-premium" />
            <span className="text-caption text-muted-foreground">Best:</span>
            <span className="text-caption font-semibold text-foreground tabular-nums">
              {longestStreak}d
            </span>
          </div>
        </div>

        {/* 7-day calendar grid */}
        <div className="grid grid-cols-7 gap-1.5">
          {last7Days.map((date) => {
            const isToday   = date === today;
            const checked   = checkinDates.has(date) || (isToday && justCheckedIn);
            const dayOfWeek = new Date(`${date}T00:00:00`).getDay();
            const label     = DAY_LABELS[dayOfWeek].charAt(0);

            return (
              <motion.div
                key={date}
                initial={false}
                animate={
                  checked
                    ? { scale: [1, 1.15, 1], backgroundColor: "hsl(var(--success) / 0.2)" }
                    : {}
                }
                transition={{ duration: 0.3 }}
                className={cn(
                  "flex flex-col items-center justify-center aspect-square rounded-md text-center",
                  "border transition-all duration-300 select-none",
                  checked && "border-success/40 bg-success/10",
                  !checked && isToday && "border-primary/50 bg-primary/5",
                  !checked && !isToday && "border-border-subtle bg-surface-2",
                )}
              >
                <span
                  className={cn(
                    "text-[10px] font-semibold leading-none",
                    checked ? "text-success" : isToday ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {label}
                </span>
                <span className="mt-1 text-[13px] leading-none">
                  {checked ? "✓" : isToday ? "🔥" : "·"}
                </span>
              </motion.div>
            );
          })}
        </div>

        {/* Check-in button */}
        <div className="relative">
          {/* Floating points animation */}
          <AnimatePresence>
            {floatingPoints !== null && (
              <motion.div
                key="floating-pts"
                initial={{ opacity: 1, y: 0, scale: 1 }}
                animate={{ opacity: 0, y: -40, scale: 1.2 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.6, ease: "easeOut" }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
              >
                <div className="flex items-center gap-1 bg-success text-success-foreground px-3 py-1 rounded-full text-caption font-bold shadow-md">
                  <Zap className="h-3 w-3" />
                  +{floatingPoints} pts
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {checkedInToday ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full flex items-center justify-center gap-2 rounded-md bg-success/10 border border-success/25 px-4 py-2.5 text-success text-[14px] font-medium"
            >
              <CheckCircle2 className="h-4 w-4" />
              Checked In Today ✓
            </motion.div>
          ) : (
            <Button
              className="w-full gap-2"
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
                  Check In
                </>
              )}
            </Button>
          )}
        </div>

        {/* Post check-in message */}
        <AnimatePresence>
          {checkedInToday && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="text-center text-caption text-muted-foreground"
            >
              Come back tomorrow to keep your streak! 🌟
            </motion.p>
          )}
        </AnimatePresence>

        {/* Milestone hint */}
        {!checkedInToday && currentStreak > 0 && (
          <p className="text-center text-[11px] text-muted-foreground">
            {7 - currentStreak > 0
              ? `${7 - currentStreak} more day${7 - currentStreak > 1 ? "s" : ""} to earn the 7-day streak bonus (+20 pts 🏆)`
              : currentStreak >= 7
              ? "Amazing streak! Keep it up! 🏆"
              : ""}
          </p>
        )}
      </div>
    </div>
  );
}
