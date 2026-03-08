/**
 * AdminChallengesTab — create and manage seasonal challenges.
 * Challenges offer bonus points for attendance/streak/checkin goals.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import {
  Trophy, Plus, Pencil, Trash2, Calendar, Zap, Flame,
  CheckSquare, Star, TrendingUp, X, Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { format, parseISO, isAfter, isBefore } from "date-fns";
import { cn } from "@/lib/utils";

type Challenge = {
  id: string;
  title: string;
  description: string | null;
  challenge_type: string;
  target_value: number;
  bonus_points: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
};

const schema = z.object({
  title:          z.string().min(3).max(80),
  description:    z.string().max(300).optional(),
  challenge_type: z.enum(["attendance", "streak", "points", "checkin"]),
  target_value:   z.number().min(1).max(9999),
  bonus_points:   z.number().min(0).max(9999),
  start_date:     z.string().min(1),
  end_date:       z.string().min(1),
  is_active:      z.boolean(),
});
type FormData = z.infer<typeof schema>;

const TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; unit: string }> = {
  attendance: { label: "Attendance",    icon: TrendingUp,  color: "text-primary",  unit: "lectures" },
  streak:     { label: "Daily Streak",  icon: Flame,       color: "text-warning",  unit: "days" },
  points:     { label: "Points Earned", icon: Star,        color: "text-accent",   unit: "pts" },
  checkin:    { label: "Daily Check-In",icon: CheckSquare, color: "text-success",  unit: "check-ins" },
};

function getChallengeStatus(c: Challenge): "upcoming" | "active" | "ended" {
  const now   = new Date();
  const start = parseISO(c.start_date);
  const end   = parseISO(c.end_date);
  if (isBefore(now, start)) return "upcoming";
  if (isAfter(now, end))    return "ended";
  return "active";
}

const STATUS_STYLE: Record<string, string> = {
  active:   "bg-success/15 text-success border-success/25",
  upcoming: "bg-primary/15 text-primary border-primary/25",
  ended:    "bg-muted/50 text-muted-foreground border-muted",
};

function ChallengeForm({
  initial,
  userId,
  onClose,
}: {
  initial?: Challenge;
  userId: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: initial
      ? {
          title:          initial.title,
          description:    initial.description ?? "",
          challenge_type: initial.challenge_type as "attendance" | "checkin" | "points" | "streak",
          target_value:   initial.target_value,
          bonus_points:   initial.bonus_points,
          start_date:     initial.start_date,
          end_date:       initial.end_date,
          is_active:      initial.is_active,
        }
      : { challenge_type: "attendance" as const, target_value: 5, bonus_points: 50, is_active: true },
  });

  const challengeType = watch("challenge_type");
  const isActive      = watch("is_active");

  const save = useMutation({
    mutationFn: async (data: FormData) => {
      if (initial) {
        const { error } = await (supabase as any).from("challenges").update(data).eq("id", initial.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("challenges").insert({ ...data, created_by: userId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin_challenges"] });
      toast.success(initial ? "Challenge updated" : "Challenge created 🏆");
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const typeUnit = TYPE_CONFIG[challengeType]?.unit ?? "";

  return (
    <motion.form
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={handleSubmit((d) => save.mutate(d))}
      className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-3"
    >
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-semibold text-foreground flex items-center gap-2">
          <Trophy className="h-4 w-4 text-primary" />
          {initial ? "Edit Challenge" : "New Challenge"}
        </p>
        <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      <Input {...register("title")} placeholder="Challenge title" className="h-8 text-xs" />
      {errors.title && <p className="text-[10px] text-destructive">{errors.title.message}</p>}

      <Textarea {...register("description")} placeholder="Short description (optional)" className="text-xs resize-none min-h-[56px]" />

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Type</label>
          <Select value={challengeType} onValueChange={(v) => setValue("challenge_type", v as any)}>
            <SelectTrigger className="h-8 text-xs mt-0.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(TYPE_CONFIG).map(([k, v]) => (
                <SelectItem key={k} value={k} className="text-xs">{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Target ({typeUnit})</label>
          <Input type="number" {...register("target_value", { valueAsNumber: true })} className="h-8 text-xs mt-0.5" min={1} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Bonus Points</label>
          <Input type="number" {...register("bonus_points", { valueAsNumber: true })} className="h-8 text-xs mt-0.5" min={0} />
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Active</label>
          <div className="flex items-center gap-2 mt-1.5">
            <Switch checked={isActive} onCheckedChange={(v) => setValue("is_active", v)} />
            <span className="text-xs text-muted-foreground">{isActive ? "On" : "Off"}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Start Date</label>
          <Input type="date" {...register("start_date")} className="h-8 text-xs mt-0.5" />
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground uppercase tracking-wide">End Date</label>
          <Input type="date" {...register("end_date")} className="h-8 text-xs mt-0.5" />
        </div>
      </div>

      <Button type="submit" size="sm" className="w-full gap-2 h-8" disabled={save.isPending}>
        <Save className="h-3.5 w-3.5" />
        {save.isPending ? "Saving…" : initial ? "Save Changes" : "Create Challenge"}
      </Button>
    </motion.form>
  );
}

export default function AdminChallengesTab() {
  const qc = useQueryClient();
  const [showForm, setShowForm]   = useState(false);
  const [editItem, setEditItem]   = useState<Challenge | null>(null);

  const [userId, setUserId] = useState<string>("");
  // Get current user id
  supabase.auth.getSession().then(({ data }) => {
    if (data.session?.user.id) setUserId(data.session.user.id);
  });

  const { data: challenges = [], isLoading } = useQuery<Challenge[]>({
    queryKey: ["admin_challenges"],
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("challenges")
        .select("*")
        .order("start_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const deleteChallenge = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("challenges").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin_challenges"] });
      toast.success("Challenge removed");
    },
    onError: () => toast.error("Delete failed"),
  });

  const activeCount   = challenges.filter((c) => getChallengeStatus(c) === "active").length;
  const upcomingCount = challenges.filter((c) => getChallengeStatus(c) === "upcoming").length;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Active",    count: activeCount,              color: "text-success",  bg: "bg-success/10" },
          { label: "Upcoming",  count: upcomingCount,            color: "text-primary",  bg: "bg-primary/10" },
          { label: "Total",     count: challenges.length,        color: "text-foreground", bg: "bg-surface-3" },
        ].map(({ label, count, color, bg }) => (
          <div key={label} className={`rounded-xl border border-border-subtle ${bg} p-3 text-center`}>
            <p className={`text-2xl font-black tabular-nums ${color}`}>{count}</p>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Create */}
      {showForm || editItem ? (
        <ChallengeForm
          initial={editItem ?? undefined}
          userId={userId}
          onClose={() => { setShowForm(false); setEditItem(null); }}
        />
      ) : (
        <Button
          onClick={() => setShowForm(true)}
          size="sm"
          className="gap-2 h-8 w-full"
          variant="outline"
        >
          <Plus className="h-3.5 w-3.5" /> Create New Challenge
        </Button>
      )}

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          {[1,2,3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : challenges.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border-subtle p-10 text-center">
          <Trophy className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No challenges yet. Create one to boost engagement!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {challenges.map((c, i) => {
            const cfg    = TYPE_CONFIG[c.challenge_type];
            const Icon   = cfg?.icon ?? Zap;
            const status = getChallengeStatus(c);
            return (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="rounded-xl border border-border-subtle bg-surface-1 p-3.5 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
                      status === "active" ? "bg-success/15" : status === "upcoming" ? "bg-primary/15" : "bg-muted/50"
                    )}>
                      <Icon className={cn("h-4 w-4", cfg?.color ?? "text-primary")} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-foreground truncate">{c.title}</p>
                      {c.description && (
                        <p className="text-[11px] text-muted-foreground truncate">{c.description}</p>
                      )}
                    </div>
                  </div>
                  <Badge className={cn("text-[10px] border shrink-0 capitalize", STATUS_STYLE[status])}>
                    {status}
                  </Badge>
                </div>

                <div className="flex items-center gap-3 flex-wrap text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Icon className="h-3 w-3" /> {c.target_value} {cfg?.unit}
                  </span>
                  <span className="flex items-center gap-1">
                    <Zap className="h-3 w-3 text-accent" /> +{c.bonus_points} bonus pts
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(parseISO(c.start_date), "MMM d")} – {format(parseISO(c.end_date), "MMM d, yyyy")}
                  </span>
                  {!c.is_active && <span className="text-muted-foreground/50">(disabled)</span>}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Button
                    size="sm" variant="outline"
                    className="h-6 text-[10px] px-2 gap-1"
                    onClick={() => { setEditItem(c); setShowForm(false); }}
                  >
                    <Pencil className="h-3 w-3" /> Edit
                  </Button>
                  <Button
                    size="sm" variant="outline"
                    className="h-6 text-[10px] px-2 gap-1 text-danger border-danger/25 hover:bg-danger/10"
                    onClick={() => deleteChallenge.mutate(c.id)}
                    disabled={deleteChallenge.isPending}
                  >
                    <Trash2 className="h-3 w-3" /> Delete
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
