import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera, Save, KeyRound, ShieldAlert, Monitor, LogOutIcon,
  Sparkles, BarChart3, Award, Trophy, Flame, CheckCircle2,
  Star, Crown, Zap, CalendarDays, Clock, ChevronDown, ChevronUp,
  BadgeCheck, Target, TrendingUp, Lock, Filter,
} from "lucide-react";
import WhatsNewModal from "@/components/whats-new/WhatsNewModal";
import PwaStatusCard from "@/components/pwa/PwaStatusCard";
import { cn } from "@/lib/utils";
import { useStudentIntelligence } from "@/hooks/use-intelligence";
import { useGrowthInsights } from "@/hooks/use-growth-insights";
import { TIER_CONFIG } from "@/lib/intelligenceEngine";
import { IntelligenceBar } from "@/components/ui/design-system";
import { APP_VERSION } from "@/config/version";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

/* ─── Zod schemas ─────────────────────────────────────────── */
const profileSchema = z.object({
  name:       z.string().trim().min(2, "Name required").max(100),
  phone:      z.string().trim().max(30).optional(),
  student_id: z.string().trim().max(50).optional(),
  department: z.string().trim().max(100).optional(),
  class_name: z.string().trim().max(50).optional(),
});
const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Required"),
  newPassword:     z.string().min(8, "Min 8 chars").max(72),
  confirmPassword: z.string().min(1, "Required"),
}).refine((v) => v.newPassword === v.confirmPassword, { message: "Passwords don't match", path: ["confirmPassword"] });

type ProfileForm  = z.infer<typeof profileSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;

/* ─── Tier helpers ────────────────────────────────────────── */
const TIERS = [
  { key: "bronze",   min: 0,   max: 99,       label: "Bronze",   emoji: "🥉", color: "text-[hsl(22_60%_55%)]",  bg: "bg-[hsl(22_60%_55%/0.12)]",  border: "border-[hsl(22_60%_55%/0.3)]",  glow: "" },
  { key: "silver",   min: 100, max: 249,       label: "Silver",   emoji: "🥈", color: "text-[hsl(215_15%_65%)]", bg: "bg-[hsl(215_15%_65%/0.12)]", border: "border-[hsl(215_15%_65%/0.3)]", glow: "" },
  { key: "gold",     min: 250, max: 499,       label: "Gold",     emoji: "🥇", color: "text-gold",                bg: "bg-gold/10",                  border: "border-gold/30",                 glow: "shadow-[0_0_20px_hsl(var(--gold)/0.25)]" },
  { key: "platinum", min: 500, max: 999,       label: "Platinum", emoji: "💎", color: "text-premium",             bg: "bg-premium/10",               border: "border-premium/30",              glow: "shadow-[0_0_24px_hsl(var(--premium)/0.3)]" },
  { key: "elite",    min: 1000, max: Infinity, label: "Elite",    emoji: "👑", color: "text-[hsl(280_80%_70%)]",  bg: "bg-[hsl(280_80%_70%/0.12)]", border: "border-[hsl(280_80%_70%/0.3)]", glow: "shadow-[0_0_28px_hsl(280_80%_70%/0.35)]" },
] as const;
function getTier(pts: number) { return [...TIERS].reverse().find((t) => pts >= t.min) ?? TIERS[0]; }

function TierBadge({ pts }: { pts: number }) {
  const t = getTier(pts);
  return (
    <span className={cn("inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-full border", t.color, t.bg, t.border)}>
      {t.emoji} {t.label}
    </span>
  );
}

/* ─── Mini progress bar ───────────────────────────────────── */
function MiniBar({ value, max = 100, color = "bg-primary" }: { value: number; max?: number; color?: string }) {
  const pct = Math.min(100, Math.round((value / Math.max(max, 1)) * 100));
  return (
    <div className="h-2 rounded-full bg-surface-3 overflow-hidden">
      <motion.div
        className={cn("h-full rounded-full", color)}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.7, ease: "easeOut" }}
      />
    </div>
  );
}

/* ─── Stat card ───────────────────────────────────────────── */
function StatCard({ icon: Icon, label, value, accent, sub }: {
  icon: React.ElementType; label: string; value: string | number; accent: string; sub?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border-subtle bg-surface-1 p-4 shadow-xs"
    >
      <div className={cn("h-8 w-8 rounded-xl flex items-center justify-center mb-2.5", accent)}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-[22px] font-black text-foreground tabular-nums leading-none">{value}</p>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">{label}</p>
      {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
    </motion.div>
  );
}

/* ─── Section header ──────────────────────────────────────── */
function SectionHeader({ icon: Icon, title, sub, iconBg }: {
  icon: React.ElementType; title: string; sub?: string; iconBg: string;
}) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <div className={cn("h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0", iconBg)}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-[14px] font-bold text-foreground">{title}</p>
        {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}

/* ─── 7-day calendar dots ─────────────────────────────────── */
function WeekCalendar({ checkins }: { checkins: string[] }) {
  const days = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (6 - i));
      const iso = d.toISOString().split("T")[0];
      const isToday = i === 6;
      const checked = checkins.includes(iso);
      return { iso, label: d.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 1), isToday, checked };
    });
  }, [checkins]);

  return (
    <div className="flex items-center gap-1.5">
      {days.map((d) => (
        <div key={d.iso} className="flex flex-col items-center gap-1 flex-1">
          <span className="text-[9px] text-muted-foreground font-medium">{d.label}</span>
          <div className={cn(
            "h-7 w-full rounded-lg border flex items-center justify-center transition-all",
            d.checked ? "bg-success/20 border-success/40" : d.isToday ? "bg-primary/10 border-primary/30 border-dashed" : "bg-surface-3 border-border-subtle",
          )}>
            {d.checked ? <CheckCircle2 className="h-3.5 w-3.5 text-success" /> : d.isToday ? <span className="text-[9px] font-black text-primary">•</span> : <span className="text-[9px] text-muted-foreground/40">—</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
export default function StudentProfile() {
  const navigate = useNavigate();
  const fileRef  = useRef<HTMLInputElement | null>(null);

  const [form, setForm]             = useState<ProfileForm>({ name: "", phone: "", student_id: "", department: "", class_name: "" });
  const [pwForm, setPwForm]         = useState<PasswordForm>({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [deleteReason, setDeleteReason] = useState("");
  const [ptFilter, setPtFilter]     = useState<"7d" | "30d" | "all">("30d");
  const [showSettings, setShowSettings] = useState(false);

  /* ── Base queries ── */
  const meQuery = useQuery({
    queryKey: ["student", "me"],
    queryFn: async () => { const { data, error } = await supabase.auth.getUser(); if (error) throw error; return data.user ?? null; },
  });

  const profileQuery = useQuery({
    queryKey: ["student", "profile", meQuery.data?.id],
    enabled: Boolean(meQuery.data?.id),
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles")
        .select("name,email,phone,student_id,department,class_name,avatar_url,is_verified")
        .eq("user_id", meQuery.data!.id).maybeSingle();
      if (error) throw error;
      return data as { name:string;email:string;phone:string|null;student_id:string|null;department:string|null;class_name:string|null;avatar_url:string|null;is_verified:boolean } | null;
    },
  });

  const sessionQuery = useQuery({
    queryKey: ["student", "session"],
    queryFn: async () => { const { data, error } = await supabase.auth.getSession(); if (error) throw error; return data.session ?? null; },
  });

  const deletionQ = useQuery({
    queryKey: ["student", "deletion_request", meQuery.data?.id],
    enabled: Boolean(meQuery.data?.id),
    queryFn: async () => {
      const { data, error } = await supabase.from("account_deletion_requests")
        .select("id,status,created_at,reason,admin_note").eq("user_id", meQuery.data!.id)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (error) throw error;
      return data as { id:string;status:string;created_at:string;reason:string|null;admin_note:string|null } | null;
    },
  });

  /* ── Gamification queries ── */
  const intel      = useStudentIntelligence();
  const growth     = useGrowthInsights();

  const streakQ = useQuery({
    queryKey: ["student", "my-streak-profile"],
    queryFn: async () => { const { data } = await supabase.rpc("get_my_streak"); return (data as any) ?? null; },
  });

  const totalPtsQ = useQuery({
    queryKey: ["student", "points-total-profile"],
    queryFn: async () => { const { data } = await supabase.rpc("get_my_points_total"); return Number(data ?? 0); },
  });

  const achieveQ = useQuery({
    queryKey: ["student", "my-achievements-profile"],
    queryFn: async () => { const { data } = await supabase.rpc("get_my_achievements", { p_limit: 50 }); return ((data as any[]) ?? []); },
  });

  const allAchievementsQ = useQuery({
    queryKey: ["achievements", "all"],
    queryFn: async () => {
      const { data } = await supabase.from("achievements").select("id,code,title,description,icon,points_reward").eq("is_active", true);
      return (data ?? []) as { id:string;code:string;title:string;description:string;icon:string;points_reward:number }[];
    },
  });

  const pointsLedgerQ = useQuery({
    queryKey: ["student", "points-ledger-profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase.from("points_ledger")
        .select("id,points,source,note,created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }).limit(100);
      return (data ?? []) as { id:string;points:number;source:string;note:string|null;created_at:string }[];
    },
  });

  const attendanceQ = useQuery({
    queryKey: ["student", "attendance-summary-profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { total: 0, present: 0 };
      const { data } = await supabase.from("attendance")
        .select("status").eq("student_user_id", user.id);
      const rows = data ?? [];
      return { total: rows.length, present: rows.filter((r) => r.status === "present").length };
    },
  });

  const leaderboardQ = useQuery({
    queryKey: ["leaderboard", { verifiedOnly: false }],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_leaderboard", { p_limit: 100, p_verified_only: false });
      return (data ?? []) as any[];
    },
    staleTime: 60_000,
  });

  const checkinsQ = useQuery({
    queryKey: ["student", "checkins-profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const since = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
      const { data } = await supabase.from("daily_checkins")
        .select("checkin_date").eq("user_id", user.id).gte("checkin_date", since);
      return (data ?? []).map((r) => r.checkin_date as string);
    },
  });

  const activityQ = useQuery({
    queryKey: ["student", "activity-timeline"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const [pts, att, ach] = await Promise.all([
        supabase.from("points_ledger").select("id,source,note,created_at,points").eq("user_id", user.id).order("created_at", { ascending: false }).limit(8),
        supabase.from("attendance").select("id,status,marked_at").eq("student_user_id", user.id).order("marked_at", { ascending: false }).limit(5),
        supabase.from("daily_checkins").select("id,checkin_date,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
      ]);
      type Event = { id: string; type: "points" | "attendance" | "checkin"; label: string; ts: string; pts?: number };
      const events: Event[] = [
        ...(pts.data ?? []).map((r) => ({ id: `pt-${r.id}`, type: "points" as const, label: r.note ?? r.source, ts: r.created_at, pts: r.points })),
        ...(att.data ?? []).map((r) => ({ id: `at-${r.id}`, type: "attendance" as const, label: r.status === "present" ? "Attendance marked" : "Marked absent", ts: r.marked_at })),
        ...(ach.data ?? []).map((r) => ({ id: `ck-${r.id}`, type: "checkin" as const, label: "Daily check-in", ts: r.created_at })),
      ];
      return events.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime()).slice(0, 12);
    },
  });

  /* ── Derived values ── */
  useEffect(() => {
    const p = profileQuery.data;
    if (!p) return;
    setForm({ name: p.name ?? "", phone: p.phone ?? "", student_id: p.student_id ?? "", department: p.department ?? "", class_name: p.class_name ?? "" });
  }, [profileQuery.data]);

  const totalPts    = totalPtsQ.data ?? 0;
  const myTier      = getTier(totalPts);
  const myRank      = useMemo(() => {
    if (!meQuery.data?.id) return null;
    return leaderboardQ.data?.find((r) => r.user_id === meQuery.data!.id) ?? null;
  }, [leaderboardQ.data, meQuery.data?.id]);
  const pointsToNextRank = useMemo(() => {
    if (!myRank) return null;
    const above = leaderboardQ.data?.find((r) => r.rank === myRank.rank - 1);
    return above ? above.points_total - myRank.points_total + 1 : null;
  }, [leaderboardQ.data, myRank]);

  const currentStreak = streakQ.data?.current_streak ?? 0;
  const longestStreak = streakQ.data?.longest_streak ?? 0;
  const attPct        = attendanceQ.data?.total ? Math.round((attendanceQ.data.present / attendanceQ.data.total) * 100) : 0;

  const unlockedCodes = useMemo(() => new Set((achieveQ.data ?? []).map((a: any) => a.code)), [achieveQ.data]);
  const lockedAchievements = useMemo(() =>
    (allAchievementsQ.data ?? []).filter((a) => !unlockedCodes.has(a.code)),
    [allAchievementsQ.data, unlockedCodes]
  );

  const filteredPoints = useMemo(() => {
    const all = pointsLedgerQ.data ?? [];
    if (ptFilter === "all") return all;
    const days = ptFilter === "7d" ? 7 : 30;
    const cutoff = new Date(Date.now() - days * 86400000).toISOString();
    return all.filter((r) => r.created_at >= cutoff);
  }, [pointsLedgerQ.data, ptFilter]);

  /* ── Mutations ── */
  const saveMutation = useMutation({
    mutationFn: async () => {
      const parsed = profileSchema.safeParse(form);
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message);
      const uid = meQuery.data?.id;
      if (!uid) throw new Error("Not logged in");
      const { error } = await supabase.from("profiles").update({
        name: parsed.data.name, phone: parsed.data.phone?.trim() || null,
        student_id: parsed.data.student_id?.trim() || null,
        department: parsed.data.department?.trim() || null,
        class_name: parsed.data.class_name?.trim() || null,
        updated_at: new Date().toISOString(),
      }).eq("user_id", uid);
      if (error) throw error;
    },
    onSuccess: async () => { toast.success("Profile updated"); await profileQuery.refetch(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const uid = meQuery.data?.id;
      if (!uid) throw new Error("Not logged in");
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const path = `${uid}/avatar-${Date.now()}.${ext}`;
      const { error: up } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
      if (up) throw up;
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const { error: upd } = await supabase.from("profiles").update({ avatar_url: pub.publicUrl, updated_at: new Date().toISOString() }).eq("user_id", uid);
      if (upd) throw upd;
    },
    onSuccess: async () => { toast.success("Photo updated"); await profileQuery.refetch(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Upload failed"),
  });

  const changePwMutation = useMutation({
    mutationFn: async () => {
      const parsed = passwordSchema.safeParse(pwForm);
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message);
      const email = profileQuery.data?.email;
      if (!email) throw new Error("Email unavailable");
      const { error: re } = await supabase.auth.signInWithPassword({ email, password: parsed.data.currentPassword });
      if (re) throw new Error("Current password incorrect");
      const { error: upd } = await supabase.auth.updateUser({ password: parsed.data.newPassword });
      if (upd) throw upd;
    },
    onSuccess: () => { toast.success("Password updated"); setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const logoutEverywhereM = useMutation({
    mutationFn: async () => { const { error } = await (supabase.auth.signOut as any)({ scope: "global" }); if (error) throw error; },
    onSuccess: () => { toast.success("Logged out everywhere"); navigate("/auth", { replace: true }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const deletionM = useMutation({
    mutationFn: async () => {
      const uid = meQuery.data?.id;
      if (!uid) throw new Error("Not logged in");
      const reason = deleteReason.trim();
      if (reason.length > 500) throw new Error("Reason too long");
      const { error } = await supabase.from("account_deletion_requests").insert({ user_id: uid, reason: reason || null });
      if (error) throw error;
    },
    onSuccess: async () => { toast.success("Request submitted"); setDeleteReason(""); await deletionQ.refetch(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const loading = meQuery.isLoading || profileQuery.isLoading;
  if (loading) {
    return (
      <div className="space-y-4 pb-20">
        <Skeleton className="h-48 rounded-2xl" />
        <div className="grid grid-cols-2 gap-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    );
  }

  const profile  = profileQuery.data;
  const tierData = TIER_CONFIG[(intel.data?.tier ?? "bronze") as keyof typeof TIER_CONFIG];

  /* ── Activity helpers ── */
  const activityIcon = (type: string) => {
    if (type === "points")     return <Zap className="h-3.5 w-3.5 text-warning" />;
    if (type === "attendance") return <CheckCircle2 className="h-3.5 w-3.5 text-success" />;
    return <Flame className="h-3.5 w-3.5 text-orange-400" />;
  };
  const activityBg = (type: string) => {
    if (type === "points")     return "bg-warning/10";
    if (type === "attendance") return "bg-success/10";
    return "bg-orange-400/10";
  };
  const timeAgo = (ts: string) => {
    const diff = (Date.now() - new Date(ts).getTime()) / 1000;
    if (diff < 60)         return "just now";
    if (diff < 3600)       return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400)      return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div className="space-y-5 max-w-2xl mx-auto pb-20">

      {/* ══ HERO CARD ══════════════════════════════════════════ */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        <div className={cn(
          "rounded-2xl border overflow-hidden shadow-sm",
          myTier.glow,
          totalPts >= 250 ? "border-gold/30" : "border-border-subtle",
        )}>
          {/* Gradient top bar */}
          <div className="h-1.5 bg-gradient-to-r from-primary via-premium to-gold" />

          <div className="p-5">
            <div className="flex items-start gap-4 flex-wrap">
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div className={cn("p-0.5 rounded-full", totalPts >= 250 ? "bg-gradient-to-br from-gold to-premium" : "bg-gradient-to-br from-primary to-primary/40")}>
                  <Avatar className="h-16 w-16 ring-2 ring-surface-1">
                    <AvatarImage src={profile?.avatar_url ?? undefined} />
                    <AvatarFallback className="text-[20px] font-black bg-primary/10 text-primary">
                      {(profile?.name ?? "U").slice(0, 1)}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) { uploadMutation.mutate(f); e.currentTarget.value = ""; } }} />
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploadMutation.isPending}
                  className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-surface-1 border border-border-subtle flex items-center justify-center hover:bg-surface-2 transition-colors shadow-sm"
                >
                  <Camera className="h-3 w-3 text-muted-foreground" />
                </button>
              </div>

              {/* Name + meta */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h1 className="text-[20px] font-black text-foreground tracking-tight">{profile?.name ?? "Student"}</h1>
                  {profile?.is_verified && <BadgeCheck className="h-4.5 w-4.5 text-primary flex-shrink-0" />}
                </div>
                {(profile?.department || profile?.class_name) && (
                  <p className="text-[12px] text-muted-foreground mb-2">
                    {[profile.department, profile.class_name].filter(Boolean).join(" · ")}
                  </p>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  <TierBadge pts={totalPts} />
                  {myRank && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-1 rounded-full">
                      <Trophy className="h-3 w-3" /> Rank #{myRank.rank}
                    </span>
                  )}
                  {currentStreak > 0 && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-warning bg-warning/10 border border-warning/20 px-2 py-1 rounded-full">
                      <Flame className="h-3 w-3" /> {currentStreak}d streak
                    </span>
                  )}
                </div>
              </div>

              {/* Points big */}
              <div className="text-right flex-shrink-0">
                <p className="text-[28px] font-black text-foreground tabular-nums leading-none">{totalPts.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest">points</p>
              </div>
            </div>

            {/* Leaderboard progress bar */}
            {myRank && pointsToNextRank !== null && pointsToNextRank > 0 && (
              <div className="mt-4 pt-4 border-t border-border-subtle/60">
                <div className="flex items-center justify-between text-[10px] mb-1.5">
                  <span className="text-muted-foreground flex items-center gap-1"><Target className="h-2.5 w-2.5" /> Rank #{myRank.rank - 1}</span>
                  <span className="font-bold text-primary">+{pointsToNextRank} pts needed</span>
                </div>
                <MiniBar value={Math.max(5, 100 - (pointsToNextRank / Math.max(1, myRank.points_total)) * 100)} color="bg-gradient-to-r from-primary to-primary/60" />
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* ══ STATS GRID ═════════════════════════════════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: Zap,          label: "Total Points",   value: totalPts.toLocaleString(),       accent: "bg-warning/10 text-warning" },
          { icon: Flame,        label: "Current Streak", value: `${currentStreak}d`,             accent: "bg-orange-400/10 text-orange-400" },
          { icon: Star,         label: "Longest Streak", value: `${longestStreak}d`,             accent: "bg-premium/10 text-premium" },
          { icon: CheckCircle2, label: "Attended",        value: `${attPct}%`,                   accent: "bg-success/10 text-success",
            sub: `${attendanceQ.data?.present ?? 0} / ${attendanceQ.data?.total ?? 0}` },
        ].map(({ icon, label, value, accent, sub }, i) => (
          <motion.div key={label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 * i }}>
            <StatCard icon={icon} label={label} value={value} accent={accent} sub={sub} />
          </motion.div>
        ))}
      </div>

      {/* ══ ATTENDANCE SUMMARY RING ═════════════════════════════ */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="rounded-2xl border border-border-subtle bg-surface-1 p-5 shadow-sm">
        <SectionHeader icon={CalendarDays} title="Attendance Overview" sub="Your lecture attendance record" iconBg="bg-success/10 text-success" />
        <div className="flex items-center gap-5">
          {/* SVG ring */}
          <div className="relative h-20 w-20 flex-shrink-0">
            <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
              <circle cx="40" cy="40" r="32" fill="none" stroke="hsl(var(--surface-3))" strokeWidth="8" />
              <motion.circle cx="40" cy="40" r="32" fill="none"
                stroke={attPct >= 75 ? "hsl(var(--success))" : attPct >= 60 ? "hsl(var(--warning))" : "hsl(var(--danger))"}
                strokeWidth="8" strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 32}`}
                initial={{ strokeDashoffset: 2 * Math.PI * 32 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 32 * (1 - attPct / 100) }}
                transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[15px] font-black text-foreground">{attPct}%</span>
            </div>
          </div>
          <div className="flex-1">
            <p className={cn("text-[14px] font-bold mb-1",
              attPct >= 75 ? "text-success" : attPct >= 60 ? "text-warning" : "text-danger")}>
              {attPct >= 75 ? "✅ Safe Zone" : attPct >= 60 ? "⚠️ Borderline" : "❌ Critical"}
            </p>
            <p className="text-[12px] text-muted-foreground">{attendanceQ.data?.present ?? 0} of {attendanceQ.data?.total ?? 0} lectures attended</p>
            <Link to="/app/attendance" className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline">
              View full history →
            </Link>
          </div>
        </div>
      </motion.div>

      {/* ══ PERFORMANCE PANEL ══════════════════════════════════ */}
      {intel.data && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
          className="rounded-2xl border border-border-subtle bg-surface-1 p-5 shadow-sm">
          <SectionHeader icon={BarChart3} title="Academic Intelligence" sub="AI-powered performance analysis" iconBg="bg-primary/10 text-primary" />
          <div className="space-y-4">
            {[
              { label: "Attendance Consistency", value: intel.data.attendanceConsistency, color: "bg-success" },
              { label: "Behaviour Reliability",  value: intel.data.behaviourReliability,  color: "bg-primary" },
              { label: "Engagement Index",       value: intel.data.engagementIndex,       color: "bg-premium" },
            ].map(({ label, value, color }) => (
              <div key={label}>
                <div className="flex justify-between mb-1.5">
                  <span className="text-[12px] font-semibold text-foreground">{label}</span>
                  <span className="text-[12px] font-black text-foreground tabular-nums">{value}/100</span>
                </div>
                <MiniBar value={value} color={color} />
              </div>
            ))}
            {tierData && (
              <div className="mt-3 flex items-center gap-2">
                <span className={cn("inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-full border", tierData.color, tierData.bg, tierData.border)}>
                  {tierData.label} Tier
                </span>
                {(intel.data.riskFlags?.length ?? 0) > 0 && (
                  <span className="text-[11px] text-danger bg-danger/10 border border-danger/20 px-2 py-1 rounded-full font-semibold">
                    ⚠ {intel.data.riskFlags[0]}
                  </span>
                )}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ══ STREAK PANEL ═══════════════════════════════════════ */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}
        className="rounded-2xl border border-border-subtle bg-surface-1 p-5 shadow-sm">
        <SectionHeader icon={Flame} title="Streak History" sub="Daily check-in consistency" iconBg="bg-orange-400/10 text-orange-400" />
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-xl border border-border-subtle bg-surface-2 p-3 text-center">
            <p className="text-[24px] font-black text-warning tabular-nums leading-none">{currentStreak}</p>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">Current Streak</p>
          </div>
          <div className="rounded-xl border border-border-subtle bg-surface-2 p-3 text-center">
            <p className="text-[24px] font-black text-premium tabular-nums leading-none">{longestStreak}</p>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">Longest Streak</p>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground mb-2 font-medium">Last 7 days</p>
        <WeekCalendar checkins={checkinsQ.data ?? []} />
        {currentStreak >= 7 && (
          <div className="mt-3 flex items-center gap-2 text-[12px] text-warning font-semibold">
            <Flame className="h-3.5 w-3.5" /> 🔥 {currentStreak}-day streak — bonus points active!
          </div>
        )}
      </motion.div>

      {/* ══ ACHIEVEMENTS ════════════════════════════════════════ */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}
        className="rounded-2xl border border-border-subtle bg-surface-1 p-5 shadow-sm">
        <SectionHeader icon={Award} title="Achievements" sub={`${(achieveQ.data ?? []).length} unlocked`} iconBg="bg-premium/10 text-premium" />

        {/* Unlocked */}
        {(achieveQ.data ?? []).length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {(achieveQ.data ?? []).slice(0, 8).map((a: any, i: number) => (
              <motion.div key={a.code}
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.18 + i * 0.04 }}
                className="rounded-xl border border-premium/20 bg-premium/5 p-3 text-center hover:shadow-md transition-shadow"
              >
                <div className="text-[24px] mb-1">{a.icon ?? "🏆"}</div>
                <p className="text-[11px] font-bold text-foreground leading-tight">{a.title}</p>
                <p className="text-[9px] text-muted-foreground mt-0.5 leading-tight line-clamp-2">{a.description}</p>
                <p className="text-[9px] text-premium font-semibold mt-1">+{a.points_reward ?? 0} pts</p>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border-subtle bg-surface-2 p-5 text-center mb-4">
            <p className="text-[12px] text-muted-foreground">No achievements unlocked yet. Start attending lectures and checking in daily!</p>
          </div>
        )}

        {/* Locked */}
        {lockedAchievements.length > 0 && (
          <>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <Lock className="h-3 w-3" /> Locked ({lockedAchievements.length})
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {lockedAchievements.slice(0, 4).map((a) => (
                <div key={a.code} className="rounded-xl border border-border-subtle bg-surface-2 p-3 text-center opacity-60 grayscale">
                  <div className="text-[24px] mb-1">{a.icon ?? "🔒"}</div>
                  <p className="text-[11px] font-bold text-muted-foreground leading-tight">{a.title}</p>
                  <p className="text-[9px] text-muted-foreground/60 mt-0.5 leading-tight line-clamp-2">{a.description}</p>
                </div>
              ))}
            </div>
          </>
        )}

        <Link to="/app/achievements" className="mt-4 flex items-center justify-center gap-1.5 text-[12px] font-semibold text-primary hover:underline">
          View all achievements →
        </Link>
      </motion.div>

      {/* ══ POINTS HISTORY ═════════════════════════════════════ */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
        className="rounded-2xl border border-border-subtle bg-surface-1 overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-warning/10 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-warning" />
            </div>
            <div>
              <p className="text-[14px] font-bold text-foreground">Points History</p>
              <p className="text-[11px] text-muted-foreground">{filteredPoints.length} transactions</p>
            </div>
          </div>
          {/* Filter */}
          <div className="flex rounded-lg border border-border-subtle bg-surface-2 p-0.5">
            {(["7d", "30d", "all"] as const).map((f) => (
              <button key={f} onClick={() => setPtFilter(f)} className={cn(
                "px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all",
                ptFilter === f ? "bg-surface-1 text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground",
              )}>
                {f === "7d" ? "7 days" : f === "30d" ? "30 days" : "All"}
              </button>
            ))}
          </div>
        </div>
        <div className="divide-y divide-border-subtle/40">
          {filteredPoints.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-[12px] text-muted-foreground">No points history found</p>
            </div>
          ) : filteredPoints.slice(0, 20).map((r, i) => {
            const srcLabel = r.source === "attendance" ? "Attendance" : r.source === "daily_checkin" ? "Daily Check-in" : r.source === "achievement" ? "Achievement" : r.note ?? r.source;
            const isPos = r.points > 0;
            return (
              <motion.div key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i * 0.02, 0.3) }}
                className="flex items-center gap-3 px-5 py-3 hover:bg-surface-2/60 transition-colors">
                <div className={cn("h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0",
                  r.source === "attendance" ? "bg-success/10" : r.source === "achievement" ? "bg-premium/10" : "bg-warning/10")}>
                  {r.source === "attendance" ? <CheckCircle2 className="h-4 w-4 text-success" />
                    : r.source === "achievement" ? <Award className="h-4 w-4 text-premium" />
                    : <Flame className="h-4 w-4 text-warning" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-foreground truncate">{srcLabel}</p>
                  <p className="text-[11px] text-muted-foreground">{timeAgo(r.created_at)}</p>
                </div>
                <span className={cn("text-[13px] font-black tabular-nums flex-shrink-0", isPos ? "text-success" : "text-danger")}>
                  {isPos ? "+" : ""}{r.points}
                </span>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* ══ ACTIVITY TIMELINE ══════════════════════════════════ */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="rounded-2xl border border-border-subtle bg-surface-1 p-5 shadow-sm">
        <SectionHeader icon={Clock} title="Activity Timeline" sub="Your recent actions" iconBg="bg-primary/10 text-primary" />
        <div className="space-y-3">
          {(activityQ.data ?? []).length === 0 ? (
            <p className="text-[12px] text-muted-foreground text-center py-4">No recent activity</p>
          ) : (activityQ.data ?? []).map((e: any, i: number) => (
            <motion.div key={e.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.22 + i * 0.03 }}
              className="flex items-center gap-3">
              <div className={cn("h-7 w-7 rounded-xl flex items-center justify-center flex-shrink-0", activityBg(e.type))}>
                {activityIcon(e.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-foreground truncate">{e.label}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {e.pts && <span className="text-[11px] font-bold text-success">+{e.pts}</span>}
                <span className="text-[10px] text-muted-foreground">{timeAgo(e.ts)}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* ══ SETTINGS ACCORDION ═════════════════════════════════ */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}
        className="rounded-2xl border border-border-subtle bg-surface-1 overflow-hidden shadow-sm">
        <button
          onClick={() => setShowSettings((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface-2/60 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-surface-3 flex items-center justify-center">
              <ShieldAlert className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-[14px] font-bold text-foreground">Profile &amp; Security Settings</p>
          </div>
          {showSettings ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>

        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="px-5 pb-5 border-t border-border-subtle space-y-5 pt-5">

                {/* Profile form */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[13px] font-bold text-foreground">Personal Information</p>
                    <Button size="sm" className="h-7 text-xs gap-1.5" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                      <Save className="h-3 w-3" /> Save
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {[
                      { label: "Full name",   key: "name",       type: "text" },
                      { label: "Phone",       key: "phone",      type: "text" },
                      { label: "Student ID",  key: "student_id", type: "text" },
                      { label: "Department",  key: "department", type: "text" },
                      { label: "Class",       key: "class_name", type: "text" },
                    ].map(({ label, key, type }) => (
                      <div key={key} className="space-y-1">
                        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">{label}</label>
                        {key === "name" || key === "phone" || key === "department" || key === "class_name" || key === "student_id" ? (
                          <Input
                            type={type}
                            value={(form as any)[key] ?? ""}
                            onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                            className="h-9"
                          />
                        ) : null}
                      </div>
                    ))}
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Email</label>
                      <Input value={profile?.email ?? ""} disabled className="h-9" />
                    </div>
                  </div>
                </div>

                {/* Change password */}
                <div className="border-t border-border-subtle pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <KeyRound className="h-4 w-4 text-muted-foreground" />
                    <p className="text-[13px] font-bold text-foreground">Change Password</p>
                  </div>
                  <div className="space-y-3">
                    {[
                      { label: "Current password", key: "currentPassword", ac: "current-password" },
                      { label: "New password",     key: "newPassword",     ac: "new-password" },
                      { label: "Confirm password", key: "confirmPassword", ac: "new-password" },
                    ].map(({ label, key, ac }) => (
                      <div key={key} className="space-y-1">
                        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">{label}</label>
                        <Input type="password" autoComplete={ac} value={(pwForm as any)[key]} onChange={(e) => setPwForm((p) => ({ ...p, [key]: e.target.value }))} className="h-9" />
                      </div>
                    ))}
                    <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => changePwMutation.mutate()} disabled={changePwMutation.isPending}>
                      <Save className="h-3 w-3" /> Update Password
                    </Button>
                  </div>
                </div>

                {/* Account controls */}
                <div className="border-t border-border-subtle pt-4 space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Monitor className="h-4 w-4 text-muted-foreground" />
                    <p className="text-[13px] font-bold text-foreground">Account Controls</p>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-border-subtle bg-surface-2 px-4 py-3">
                    <div>
                      <p className="text-[12px] font-semibold text-foreground">Active Session</p>
                      <p className="text-[10px] text-muted-foreground">
                        {sessionQuery.data?.expires_at
                          ? `Expires ${new Date(sessionQuery.data.expires_at * 1000).toLocaleString()}`
                          : "Session info unavailable"}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={() => logoutEverywhereM.mutate()} disabled={logoutEverywhereM.isPending}>
                      <LogOutIcon className="h-3 w-3" /> Sign out all
                    </Button>
                  </div>

                  {/* Deletion */}
                  <div className="rounded-xl border border-border-subtle bg-surface-2 px-4 py-3 space-y-2">
                    <p className="text-[12px] font-semibold text-foreground">Delete Account</p>
                    <p className="text-[11px] text-muted-foreground">Submits a deletion request to the admin team.</p>
                    {deletionQ.data ? (
                      <p className="text-[11px] text-muted-foreground">Status: <span className="font-bold text-foreground capitalize">{deletionQ.data.status}</span></p>
                    ) : (
                      <div className="space-y-2">
                        <Textarea value={deleteReason} onChange={(e) => setDeleteReason(e.target.value)} placeholder="Reason (optional)" rows={2} className="text-xs" />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm" className="text-xs h-7">Request deletion</Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Request account deletion?</AlertDialogTitle>
                              <AlertDialogDescription>A deletion request will be submitted to admins. You can continue using the app until it's processed.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deletionM.mutate()} disabled={deletionM.isPending}>Submit</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ══ PWA + VERSION ═══════════════════════════════════════ */}
      <PwaStatusCard />
      <div className="rounded-2xl border border-border-subtle bg-surface-1 px-5 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-muted-foreground" />
          <p className="text-[13px] font-semibold text-foreground">Platform Updates</p>
          <span className="text-[10px] text-muted-foreground">v{APP_VERSION}</span>
        </div>
        <WhatsNewModalTrigger />
      </div>
    </div>
  );
}

function WhatsNewModalTrigger() {
  const [show, setShow] = useState(false);
  return (
    <>
      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setShow(true)}>View Updates</Button>
      {show && <WhatsNewModal manualOpen onManualClose={() => setShow(false)} />}
    </>
  );
}
