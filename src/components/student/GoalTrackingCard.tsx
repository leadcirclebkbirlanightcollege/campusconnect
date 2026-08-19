/**
 * GoalTrackingCard — student self-set goals with live progress.
 * Goals: attendance %, tier target, streak days, points total.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import {
  Target, Plus, CheckCircle2, Trash2, ChevronDown, ChevronUp,
  TrendingUp, Flame, Star, Trophy,
} from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Goal = {
  id: string;
  goal_type: string;
  target_value: number;
  deadline: string | null;
  status: string;
  achieved_at: string | null;
  created_at: string;
};

const GOAL_CONFIGS: Record<string, {
  label: string;
  unit: string;
  icon: React.ElementType;
  color: string;
  maxTarget: number;
  defaultTarget: number;
}> = {
  attendance_pct: { label: "Attendance %",   unit: "%",     icon: TrendingUp, color: "text-primary",  maxTarget: 100, defaultTarget: 90 },
  streak_days:    { label: "Streak Days",    unit: " days", icon: Flame,      color: "text-warning",  maxTarget: 365, defaultTarget: 30 },
  points_total:   { label: "Points Target",  unit: " pts",  icon: Star,       color: "text-accent",   maxTarget: 9999, defaultTarget: 500 },
  reach_tier:     { label: "Reach Tier",     unit: " tier", icon: Trophy,     color: "text-premium",  maxTarget: 4, defaultTarget: 3 },
};

const TIER_NAMES = ["—", "Bronze", "Silver", "Gold", "Elite"];

function useGoalProgress(userId: string | null) {
  return useQuery({
    queryKey: ["goal_progress", userId],
    enabled: !!userId,
    staleTime: 30_000,
    queryFn: async () => {
      const [
        { data: insights },
        { data: streak },
        { data: points },
        intelRes,
      ] = await Promise.all([
        supabase.rpc("get_growth_insights"),
        supabase.rpc("get_my_streak"),
        supabase.rpc("get_my_points_total"),
        supabase.from("student_intelligence").select("tier").eq("user_id", userId!).single(),
      ]);

      const intelRow = intelRes.data as { tier?: string } | null;
      const intelTier = intelRow?.tier ?? "bronze";
      const tierIndex = ["bronze", "silver", "gold", "elite"].indexOf(intelTier) + 1;
      return {
        attendance_pct: (insights as any)?.last_30_day_attendance_pct ?? 0,
        streak_days:    (streak as any)?.current_streak ?? 0,
        points_total:   (points as number) ?? 0,
        reach_tier:     tierIndex,
      };
    },
  });
}

export default function GoalTrackingCard({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newType, setNewType]   = useState<string>("attendance_pct");
  const [newTarget, setNewTarget] = useState<string>("");
  const [newDeadline, setNewDeadline] = useState<string>("");

  const { data: goals = [], isLoading: goalsLoading } = useQuery<Goal[]>({
    queryKey: ["student_goals", userId],
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("student_goals")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: progress } = useGoalProgress(userId);

  const createGoal = useMutation({
    mutationFn: async () => {
      const target = parseInt(newTarget);
      if (!target || target <= 0) throw new Error("Invalid target");
      const { error } = await (supabase as any).from("student_goals").insert({
        user_id: userId,
        goal_type: newType,
        target_value: target,
        deadline: newDeadline || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["student_goals"] });
      setShowForm(false);
      setNewTarget("");
      setNewDeadline("");
      toast.success("Goal set! You've got this 🎯");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const abandonGoal = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("student_goals").update({ status: "abandoned" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["student_goals"] }),
  });

  function getProgress(goal: Goal): number {
    if (!progress) return 0;
    const current = (progress as any)[goal.goal_type] ?? 0;
    return Math.min(100, Math.round((current / goal.target_value) * 100));
  }

  function getCurrentValue(goal: Goal): number {
    if (!progress) return 0;
    return (progress as any)[goal.goal_type] ?? 0;
  }

  const defaultTarget = GOAL_CONFIGS[newType]?.defaultTarget ?? 10;

  return (
    <div className="rounded-2xl border border-border-subtle bg-surface-1 overflow-hidden">
      {/* Header */}
      <button
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-2/50 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">My Goals</span>
          {goals.length > 0 && (
            <Badge variant="secondary" className="text-[10px]">{goals.length}</Badge>
          )}
        </div>
        {expanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3 border-t border-border-subtle pt-3">
              {goalsLoading ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
                </div>
              ) : goals.length === 0 && !showForm ? (
                <div className="text-center py-5">
                  <Target className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-[12px] text-muted-foreground">No active goals yet.</p>
                  <p className="text-[11px] text-muted-foreground/60">Set a goal to track your progress.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {goals.map((goal) => {
                    const cfg   = GOAL_CONFIGS[goal.goal_type];
                    const Icon  = cfg?.icon ?? Target;
                    const pct   = getProgress(goal);
                    const curr  = getCurrentValue(goal);
                    const displayCurrent = goal.goal_type === "reach_tier"
                      ? TIER_NAMES[curr] ?? "—"
                      : `${curr}${cfg?.unit ?? ""}`;
                    const displayTarget  = goal.goal_type === "reach_tier"
                      ? TIER_NAMES[goal.target_value] ?? "—"
                      : `${goal.target_value}${cfg?.unit ?? ""}`;

                    return (
                      <motion.div
                        key={goal.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-xl border border-border-subtle bg-surface-2/50 p-3 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Icon className={cn("h-3.5 w-3.5", cfg?.color ?? "text-primary")} />
                            <span className="text-[12px] font-semibold text-foreground">{cfg?.label}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-muted-foreground tabular-nums">
                              {displayCurrent} / {displayTarget}
                            </span>
                            {pct >= 100 && <CheckCircle2 className="h-3.5 w-3.5 text-success" />}
                            <button
                              onClick={() => abandonGoal.mutate(goal.id)}
                              className="text-muted-foreground/50 hover:text-danger transition-colors"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Progress value={pct} className="h-1.5" />
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-muted-foreground">{pct}% complete</span>
                            {goal.deadline && (
                              <span className="text-[10px] text-muted-foreground">
                                by {new Date(goal.deadline).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {/* Add goal form */}
              <AnimatePresence>
                {showForm && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2"
                  >
                    <p className="text-[11px] font-semibold text-foreground">New Goal</p>
                    <Select value={newType} onValueChange={(v) => { setNewType(v); setNewTarget(""); }}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(GOAL_CONFIGS).map(([k, v]) => (
                          <SelectItem key={k} value={k} className="text-xs">{v.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder={`Target (e.g. ${defaultTarget})`}
                        value={newTarget}
                        onChange={(e) => setNewTarget(e.target.value)}
                        className="h-8 text-xs flex-1"
                        min={1}
                        max={GOAL_CONFIGS[newType]?.maxTarget}
                      />
                      <Input
                        type="date"
                        value={newDeadline}
                        onChange={(e) => setNewDeadline(e.target.value)}
                        className="h-8 text-xs w-[130px]"
                        min={new Date().toISOString().split("T")[0]}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="h-7 text-xs flex-1" onClick={() => createGoal.mutate()} disabled={createGoal.isPending || !newTarget}>
                        {createGoal.isPending ? "Saving…" : "Set Goal"}
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowForm(false)}>
                        Cancel
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {!showForm && goals.length < 5 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-7 text-xs gap-1.5 border-dashed"
                  onClick={() => setShowForm(true)}
                >
                  <Plus className="h-3 w-3" /> Add Goal
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
