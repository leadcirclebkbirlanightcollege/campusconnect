/**
 * ActiveChallengesStrip — shows currently running challenges on the student dashboard.
 * Pulls from the `challenges` table filtered to active date range.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Flame, Star, TrendingUp, CheckSquare, Zap, ChevronRight } from "@/components/icons";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { differenceInDays, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

type Challenge = {
  id: string;
  title: string;
  description: string | null;
  challenge_type: string;
  target_value: number;
  bonus_points: number;
  end_date: string;
};

const TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string; unit: string }> = {
  attendance: { icon: TrendingUp,  color: "text-primary",  bg: "bg-primary/15",  unit: "lectures" },
  streak:     { icon: Flame,       color: "text-warning",  bg: "bg-warning/15",  unit: "days" },
  points:     { icon: Star,        color: "text-accent",   bg: "bg-accent/15",   unit: "pts" },
  checkin:    { icon: CheckSquare, color: "text-success",  bg: "bg-success/15",  unit: "check-ins" },
};

export default function ActiveChallengesStrip() {
  const today = new Date().toISOString().split("T")[0];

  const { data: challenges = [], isLoading } = useQuery<Challenge[]>({
    queryKey: ["active_challenges_student"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("challenges")
        .select("id, title, description, challenge_type, target_value, bonus_points, end_date")
        .eq("is_active", true)
        .lte("start_date", today)
        .gte("end_date", today)
        .order("end_date", { ascending: true })
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
  });

  if (isLoading) return (
    <div className="space-y-1.5">
      <Skeleton className="h-4 w-32" />
      <div className="flex gap-2 overflow-hidden">
        {[1,2].map((i) => <Skeleton key={i} className="h-[72px] w-48 rounded-xl shrink-0" />)}
      </div>
    </div>
  );

  if (challenges.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Zap className="h-3.5 w-3.5 text-accent" />
        <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Active Challenges
        </span>
        <Badge variant="secondary" className="text-[10px]">{challenges.length}</Badge>
      </div>

      <div className="flex gap-2.5 overflow-x-auto scrollbar-none pb-1">
        {challenges.map((c, i) => {
          const cfg        = TYPE_CONFIG[c.challenge_type] ?? TYPE_CONFIG.attendance;
          const Icon       = cfg.icon;
          const daysLeft   = differenceInDays(parseISO(c.end_date), new Date());
          const urgency    = daysLeft <= 2;

          return (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.07 }}
              className={cn(
                "shrink-0 w-48 rounded-xl border p-3 space-y-1.5 cursor-default",
                urgency
                  ? "border-warning/30 bg-warning/5"
                  : "border-border-subtle bg-surface-1"
              )}
            >
              <div className="flex items-center justify-between">
                <div className={cn("h-6 w-6 rounded-lg flex items-center justify-center", cfg.bg)}>
                  <Icon className={cn("h-3.5 w-3.5", cfg.color)} />
                </div>
                <span className={cn("text-[10px] font-medium tabular-nums", urgency ? "text-warning" : "text-muted-foreground")}>
                  {daysLeft === 0 ? "Ends today!" : daysLeft === 1 ? "1 day left" : `${daysLeft}d left`}
                </span>
              </div>

              <p className="text-[12px] font-semibold text-foreground leading-tight line-clamp-2">{c.title}</p>

              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">
                  {c.target_value} {cfg.unit}
                </span>
                <span className="text-[10px] font-semibold text-accent flex items-center gap-0.5">
                  <Zap className="h-2.5 w-2.5" />+{c.bonus_points} pts
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
