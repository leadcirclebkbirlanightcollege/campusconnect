/**
 * StudentPointsPage — Phase 5 redesign
 *
 * Goal: increase daily engagement, simple gamified UX.
 * Sections:
 *  1. Hero — total points, tier, sparkles
 *  2. Stats trio — Total / Pending / Approved
 *  3. Quick CTAs — Leaderboard · Achievements
 *  4. Activity feed (recent claims, status pill, time)
 *  5. Floating "Claim Points" CTA + modal
 */
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import {
  Coins,
  Plus,
  Trophy,
  CheckCircle2,
  XCircle,
  Clock,
  Award,
  Sparkles,
  ArrowRight,
  Zap,
} from "@/components/icons";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { Link } from "react-router-dom";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const ACTIVITY_OPTIONS = [
  { value: "event_attendance", label: "Event Attendance", emoji: "🎟️" },
  { value: "participation", label: "Participation", emoji: "🤝" },
  { value: "winning", label: "Winning", emoji: "🏆" },
  { value: "idea_submission", label: "Idea Submission", emoji: "💡" },
  { value: "other", label: "Other", emoji: "✨" },
] as const;

const claimSchema = z.object({
  activity_type: z.enum([
    "event_attendance",
    "participation",
    "winning",
    "idea_submission",
    "other",
  ]),
  points: z.coerce.number().int().min(1, "Min 1 point").max(1000, "Max 1000"),
  description: z.string().trim().min(4, "Add a short description").max(400),
  evidence_url: z.string().trim().url("Invalid URL").optional().or(z.literal("")),
});

const STATUS_META = {
  approved: {
    icon: CheckCircle2,
    label: "Approved",
    color: "hsl(var(--success))",
    bg: "hsl(var(--success) / 0.12)",
    border: "hsl(var(--success) / 0.30)",
  },
  pending: {
    icon: Clock,
    label: "Pending",
    color: "hsl(var(--warning))",
    bg: "hsl(var(--warning) / 0.12)",
    border: "hsl(var(--warning) / 0.30)",
  },
  rejected: {
    icon: XCircle,
    label: "Rejected",
    color: "hsl(var(--destructive))",
    bg: "hsl(var(--destructive) / 0.12)",
    border: "hsl(var(--destructive) / 0.30)",
  },
} as const;

function tierFor(total: number) {
  if (total >= 500) return { label: "Elite", emoji: "👑", color: "hsl(280 80% 60%)" };
  if (total >= 250) return { label: "Gold", emoji: "🥇", color: "hsl(45 95% 55%)" };
  if (total >= 100) return { label: "Silver", emoji: "🥈", color: "hsl(220 8% 75%)" };
  return { label: "Bronze", emoji: "🥉", color: "hsl(28 75% 55%)" };
}

const ACTIVITY_ICON: Record<string, string> = {
  event_attendance: "🎟️",
  participation: "🤝",
  winning: "🏆",
  idea_submission: "💡",
  attendance: "📚",
  daily_checkin: "🔥",
  other: "✨",
};

export default function StudentPointsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    activity_type: "event_attendance" as (typeof ACTIVITY_OPTIONS)[number]["value"],
    points: 10,
    description: "",
    evidence_url: "",
  });

  const totalQuery = useQuery({
    queryKey: ["student", "points-total", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_my_points_total");
      if (error) throw error;
      return Number(data ?? 0);
    },
  });

  const claimsQuery = useQuery({
    queryKey: ["student", "claims", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("point_claims")
        .select("id,activity_type,points,description,status,created_at,reviewed_at,review_note")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const parsed = claimSchema.safeParse(form);
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid form");
      const { error } = await supabase.from("point_claims").insert({
        user_id: user!.id,
        activity_type: parsed.data.activity_type,
        points: parsed.data.points,
        description: parsed.data.description,
        evidence_url: parsed.data.evidence_url || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Claim submitted — awaiting review");
      setOpen(false);
      setForm({ activity_type: "event_attendance", points: 10, description: "", evidence_url: "" });
      qc.invalidateQueries({ queryKey: ["student", "claims"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to submit"),
  });

  const total = totalQuery.data ?? 0;
  const claims = claimsQuery.data ?? [];
  const pending = claims.filter((c) => c.status === "pending").length;
  const approved = claims.filter((c) => c.status === "approved").length;
  const tier = useMemo(() => tierFor(total), [total]);
  const nextThreshold = total >= 500 ? null : total >= 250 ? 500 : total >= 100 ? 250 : 100;
  const progressPct = nextThreshold
    ? Math.min(100, Math.round((total / nextThreshold) * 100))
    : 100;

  return (
    <div className="mx-auto w-full max-w-[420px] space-y-4 px-4 pt-2 pb-[calc(96px+env(safe-area-inset-bottom,0px))]">

      {/* ── Hero ──────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[24px] border border-border-subtle p-5 shadow-[0_16px_40px_-20px_hsl(var(--warning)/0.35)]"
        style={{
          background: `
            radial-gradient(80% 100% at 100% 0%, hsl(var(--warning) / 0.18), transparent 60%),
            linear-gradient(135deg, hsl(var(--surface-2)), hsl(var(--surface-1)))
          `,
        }}
      >
        <motion.div
          aria-hidden
          animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.6, 0.4] }}
          transition={{ duration: 6, repeat: Infinity }}
          className="absolute -top-16 -right-12 h-44 w-44 rounded-full blur-3xl pointer-events-none"
          style={{ background: "hsl(var(--warning) / 0.30)" }}
        />

        <div className="relative flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Total points
            </p>
            <div className="mt-1 flex items-baseline gap-2">
              {totalQuery.isLoading ? (
                <Skeleton className="h-9 w-24" />
              ) : (
                <motion.h1
                  key={total}
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-[34px] font-black tabular-nums leading-none text-foreground"
                >
                  {total.toLocaleString()}
                </motion.h1>
              )}
              <Coins className="h-5 w-5 text-warning" />
            </div>
          </div>

          <div
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 border"
            style={{
              background: `${tier.color}20`,
              borderColor: `${tier.color}55`,
            }}
          >
            <span className="text-base leading-none">{tier.emoji}</span>
            <span className="text-[12px] font-bold" style={{ color: tier.color }}>
              {tier.label}
            </span>
          </div>
        </div>

        {/* Tier progress */}
        <div className="relative mt-4">
          <div className="flex justify-between text-[10.5px] text-muted-foreground mb-1.5">
            <span className="font-semibold uppercase tracking-wider">{tier.label}</span>
            <span>
              {nextThreshold ? `${nextThreshold - total} pts to next` : "Max tier reached"}
            </span>
          </div>
          <div className="h-2 rounded-full bg-surface-3 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
              className="h-full rounded-full"
              style={{
                background: `linear-gradient(90deg, ${tier.color}, hsl(var(--warning)))`,
              }}
            />
          </div>
        </div>
      </motion.section>

      {/* ── Stats trio ───────────────────────────────────── */}
      <section className="grid grid-cols-3 gap-2">
        {[
          { label: "Approved", value: approved, color: "hsl(var(--success))", icon: CheckCircle2 },
          { label: "Pending", value: pending, color: "hsl(var(--warning))", icon: Clock },
          { label: "Total Claims", value: claims.length, color: "hsl(var(--primary))", icon: Zap },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 + i * 0.05 }}
            className="rounded-xl border border-border-subtle bg-surface-1 p-3"
          >
            <div className="flex items-center gap-1.5 mb-1">
              <s.icon className="h-3 w-3" style={{ color: s.color }} />
              <p className="text-[9.5px] uppercase tracking-wider text-muted-foreground font-semibold">
                {s.label}
              </p>
            </div>
            <p
              className="text-[20px] font-black tabular-nums leading-none"
              style={{ color: s.color }}
            >
              {s.value}
            </p>
          </motion.div>
        ))}
      </section>

      {/* ── Quick CTAs ───────────────────────────────────── */}
      <section className="grid grid-cols-2 gap-2">
        <QuickCta to="/app/leaderboard" icon={Trophy} title="Leaderboard" subtitle="Your ranking" tint="warning" />
        <QuickCta to="/app/achievements" icon={Award} title="Achievements" subtitle="Badges & XP" tint="primary" />
      </section>

      {/* ── Activity feed ────────────────────────────────── */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <h2 className="text-[12px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              Activity Feed
            </h2>
          </div>
          <Button
            size="sm"
            onClick={() => setOpen(true)}
            className="h-8 gap-1.5 text-xs"
          >
            <Plus className="h-3 w-3" /> Claim
          </Button>
        </div>

        {claimsQuery.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-16 rounded-xl" />
            <Skeleton className="h-16 rounded-xl" />
          </div>
        ) : claims.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border-subtle p-8 text-center">
            <div className="text-3xl mb-2">🪙</div>
            <p className="text-[14px] font-semibold text-foreground">No claims yet</p>
            <p className="text-[12px] text-muted-foreground mt-1 mb-3">
              Submit your first activity to start earning points.
            </p>
            <Button size="sm" onClick={() => setOpen(true)} className="gap-1.5">
              <Plus className="h-3 w-3" /> Submit claim
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence initial={false}>
              {claims.map((c, i) => {
                const meta = STATUS_META[c.status as keyof typeof STATUS_META] ?? STATUS_META.pending;
                const SIcon = meta.icon;
                return (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.03, 0.3) }}
                    className="rounded-xl border border-border-subtle bg-surface-1 p-3 flex items-start gap-3"
                  >
                    <div className="h-9 w-9 rounded-lg bg-surface-2 flex items-center justify-center text-base shrink-0">
                      {ACTIVITY_ICON[c.activity_type] ?? "✨"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[13.5px] font-semibold text-foreground capitalize truncate">
                          {c.activity_type.replace(/_/g, " ")}
                        </p>
                        <span className="text-[14px] font-black text-warning tabular-nums shrink-0">
                          +{c.points}
                        </span>
                      </div>
                      {c.description && (
                        <p className="text-[12px] text-muted-foreground line-clamp-1 mt-0.5">
                          {c.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1.5">
                        <span
                          className="inline-flex items-center gap-1 text-[10px] font-semibold rounded-full px-1.5 py-0.5 border"
                          style={{
                            color: meta.color,
                            background: meta.bg,
                            borderColor: meta.border,
                          }}
                        >
                          <SIcon className="h-2.5 w-2.5" />
                          {meta.label}
                        </span>
                        <span className="text-[10px] text-muted-foreground/70">
                          {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      {c.review_note && c.status === "rejected" && (
                        <p className="text-[10.5px] text-destructive mt-1">
                          Reason: {c.review_note}
                        </p>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </section>

      {/* ── Claim dialog ─────────────────────────────────── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Coins className="h-4 w-4 text-warning" /> Claim Points
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3.5">
            <div>
              <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Activity
              </Label>
              <div className="mt-1.5 grid grid-cols-5 gap-1.5">
                {ACTIVITY_OPTIONS.map((o) => {
                  const active = form.activity_type === o.value;
                  return (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, activity_type: o.value }))}
                      className={cn(
                        "flex flex-col items-center gap-0.5 rounded-lg border py-2 text-[10px] font-semibold transition-all active:scale-95",
                        active
                          ? "border-warning/50 bg-warning/12 text-warning"
                          : "border-border-subtle bg-surface-2 text-muted-foreground hover:border-border-strong",
                      )}
                    >
                      <span className="text-base leading-none">{o.emoji}</span>
                      <span className="leading-none text-center text-[9px]">
                        {o.label.split(" ")[0]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1">
              <Label>Points</Label>
              <Input
                type="number"
                min={1}
                max={1000}
                value={form.points}
                onChange={(e) => setForm((p) => ({ ...p, points: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea
                rows={3}
                placeholder="What did you do?"
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Evidence URL (optional)</Label>
              <Input
                type="url"
                placeholder="https://…"
                value={form.evidence_url}
                onChange={(e) => setForm((p) => ({ ...p, evidence_url: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
              className="gap-1.5"
            >
              {createMutation.isPending ? (
                "Submitting…"
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" /> Submit Claim
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── QuickCta ────────────────────────────────────────────── */
function QuickCta({
  to,
  icon: Icon,
  title,
  subtitle,
  tint,
}: {
  to: string;
  icon: typeof Trophy;
  title: string;
  subtitle: string;
  tint: "warning" | "primary";
}) {
  const color = tint === "warning" ? "hsl(var(--warning))" : "hsl(var(--primary))";
  return (
    <Link
      to={to}
      className="group relative overflow-hidden rounded-xl border border-border-subtle bg-surface-1 p-3 transition-all hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]"
    >
      <div className="flex items-center gap-2.5">
        <div
          className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: `${color}1F`, boxShadow: `inset 0 0 0 1px ${color}33` }}
        >
          <Icon className="h-4 w-4" style={{ color }} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-foreground truncate">{title}</p>
          <p className="text-[11px] text-muted-foreground truncate">{subtitle}</p>
        </div>
        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}
