import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell, Send, Save, CalendarClock, Pencil, Archive, Plus,
  Megaphone, AlertTriangle, BookOpen, Trophy, Settings,
  Users, GraduationCap, Search, RefreshCw, BarChart3,
  CheckCheck, Mail, Eye, X, Radio,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, format } from "date-fns";

// ── Types ────────────────────────────────────────────────────────────────────
type NotificationRow = {
  id: string; title: string; body: string;
  target_role: "admin" | "student" | null; target_user_id: string | null;
  status: "draft" | "scheduled" | "sent" | "cancelled";
  scheduled_for: string | null; sent_at: string | null; created_at: string;
  created_by: string; kind: string;
  cancelled_at?: string | null; cancelled_by?: string | null;
};

type RecipientRow = { notification_id: string; user_id: string; read_at: string | null };
type ProfileLite = { user_id: string; name: string; email: string; is_deleted: boolean };

// ── Kind config ──────────────────────────────────────────────────────────────
const KIND_OPTIONS = [
  { value: "announcement",     label: "📢 Announcement",     icon: Megaphone,     iconBg: "bg-primary/10",   iconColor: "text-primary" },
  { value: "emergency",        label: "⚠️ Emergency Alert",  icon: AlertTriangle, iconBg: "bg-danger/10",    iconColor: "text-danger" },
  { value: "lecture_reminder", label: "📅 Lecture Reminder", icon: BookOpen,      iconBg: "bg-accent/10",    iconColor: "text-accent" },
  { value: "achievement",      label: "🏆 Achievement",      icon: Trophy,        iconBg: "bg-premium/10",   iconColor: "text-premium" },
  { value: "system_update",    label: "⚙️ System Update",    icon: Settings,      iconBg: "bg-surface-3",    iconColor: "text-muted-foreground" },
  { value: "general",          label: "🔔 General",          icon: Bell,          iconBg: "bg-primary/10",   iconColor: "text-primary" },
];

function getKindConfig(kind: string) {
  return KIND_OPTIONS.find((k) => k.value === kind) ?? KIND_OPTIONS[KIND_OPTIONS.length - 1];
}

// ── Schema ───────────────────────────────────────────────────────────────────
const schema = z.object({
  title: z.string().trim().min(3, "Too short").max(120),
  body: z.string().trim().min(5, "Too short").max(2000),
  kind: z.string().default("general"),
  targetMode: z.enum(["role", "user"]),
  targetRole: z.enum(["student", "admin"]).optional(),
  targetUserId: z.string().uuid().optional(),
  status: z.enum(["draft", "scheduled", "sent", "cancelled"]),
  scheduledFor: z.string().optional(),
}).superRefine((v, ctx) => {
  if (v.status === "cancelled") return;
  if (v.targetMode === "role" && !v.targetRole)
    ctx.addIssue({ code: "custom", message: "Select a role target", path: ["targetRole"] });
  if (v.targetMode === "user" && !v.targetUserId)
    ctx.addIssue({ code: "custom", message: "Select a user target", path: ["targetUserId"] });
  if (v.status === "scheduled") {
    if (!v.scheduledFor)
      ctx.addIssue({ code: "custom", message: "Pick a time", path: ["scheduledFor"] });
    else if (Number.isNaN(new Date(v.scheduledFor).getTime()))
      ctx.addIssue({ code: "custom", message: "Invalid time", path: ["scheduledFor"] });
  }
});

type FormValues = z.infer<typeof schema>;

// ── Helpers ───────────────────────────────────────────────────────────────────
async function resolveRecipientUserIds(targetMode: "role" | "user", targetRole?: "student" | "admin", targetUserId?: string) {
  if (targetMode === "user" && targetUserId) return [targetUserId];
  if (targetMode === "role" && targetRole) {
    const { data: roles, error } = await supabase.from("user_roles").select("user_id").eq("role", targetRole);
    if (error) throw error;
    const ids = (roles ?? []).map((r) => r.user_id);
    if (!ids.length) return [];
    const { data: profiles, error: pe } = await supabase.from("profiles").select("user_id,is_deleted").in("user_id", ids);
    if (pe) throw pe;
    return (profiles ?? []).filter((p) => !p.is_deleted).map((p) => p.user_id);
  }
  return [];
}

function statusChip(status: NotificationRow["status"]) {
  if (status === "sent") return <span className="text-[10px] px-2 py-0.5 rounded-full bg-success/10 text-success border border-success/20 font-bold">Sent</span>;
  if (status === "scheduled") return <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-bold">Scheduled</span>;
  if (status === "draft") return <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-3 text-muted-foreground border border-border-subtle font-bold">Draft</span>;
  return <span className="text-[10px] px-2 py-0.5 rounded-full bg-danger/10 text-danger border border-danger/20 font-bold">Cancelled</span>;
}

// ── Compose form ─────────────────────────────────────────────────────────────
function ComposeForm({
  profiles, onSuccess,
}: {
  profiles: ProfileLite[];
  onSuccess: () => void;
}) {
  const qc = useQueryClient();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: "", body: "", kind: "announcement", targetMode: "role", targetRole: "student", status: "sent" },
  });

  const status = form.watch("status");
  const targetMode = form.watch("targetMode");
  const kind = form.watch("kind");
  const kCfg = getKindConfig(kind);

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");
      const nowIso = new Date().toISOString();
      const { data: created, error } = await supabase.from("notifications").insert([{
        created_by: userData.user.id,
        title: values.title.trim(),
        body: values.body.trim(),
        kind: values.kind,
        target_role: values.targetMode === "role" ? values.targetRole ?? null : null,
        target_user_id: values.targetMode === "user" ? values.targetUserId ?? null : null,
        status: values.status,
        scheduled_for: values.status === "scheduled" && values.scheduledFor ? new Date(values.scheduledFor).toISOString() : null,
        sent_at: values.status === "sent" ? nowIso : null,
      }]).select("id").single();
      if (error) throw error;
      if (values.status === "sent") {
        const ids = await resolveRecipientUserIds(values.targetMode, values.targetRole, values.targetUserId);
        if (ids.length > 0)
          await supabase.from("notification_recipients").insert(ids.map((uid) => ({ notification_id: created.id, user_id: uid })));
      }
    },
    onSuccess: async () => {
      toast.success("Notification saved");
      form.reset({ title: "", body: "", kind: "announcement", targetMode: "role", targetRole: "student", status: "sent" });
      await qc.invalidateQueries({ queryKey: ["admin", "notifications"] });
      await qc.invalidateQueries({ queryKey: ["admin", "notification-recipients"] });
      onSuccess();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const isEmergency = kind === "emergency";

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">

        {/* Kind selector */}
        <FormField control={form.control} name="kind" render={({ field }) => (
          <FormItem>
            <FormLabel className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Notification Type</FormLabel>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {KIND_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    type="button" key={opt.value}
                    onClick={() => field.onChange(opt.value)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-xl border text-[12px] font-semibold transition-all duration-120",
                      field.value === opt.value
                        ? cn("border-primary/40 bg-primary/5 text-foreground")
                        : "border-border-subtle bg-surface-2 text-muted-foreground hover:text-foreground",
                      opt.value === "emergency" && field.value === "emergency" && "border-danger/40 bg-danger/5",
                    )}
                  >
                    <div className={cn("h-6 w-6 rounded-lg flex items-center justify-center shrink-0", opt.iconBg)}>
                      <Icon className={cn("h-3.5 w-3.5", opt.iconColor)} />
                    </div>
                    <span className="truncate">{opt.label.replace(/^\S+\s/, "")}</span>
                  </button>
                );
              })}
            </div>
            <FormMessage />
          </FormItem>
        )} />

        {/* Emergency callout */}
        {isEmergency && (
          <motion.div
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 flex items-center gap-3"
          >
            <AlertTriangle className="h-4 w-4 text-danger shrink-0" />
            <p className="text-[12px] text-danger font-semibold">Emergency alerts are delivered instantly and highlighted to all recipients.</p>
          </motion.div>
        )}

        {/* Title */}
        <FormField control={form.control} name="title" render={({ field }) => (
          <FormItem>
            <FormLabel className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Title</FormLabel>
            <FormControl>
              <Input {...field} placeholder="e.g. Lecture cancelled tomorrow" className="rounded-xl h-10 text-[13px]" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />

        {/* Body */}
        <FormField control={form.control} name="body" render={({ field }) => (
          <FormItem>
            <FormLabel className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Message</FormLabel>
            <FormControl>
              <Textarea {...field} placeholder="Write your message here…" rows={4} className="rounded-xl text-[13px] resize-none" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />

        {/* Target row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField control={form.control} name="targetMode" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Target Type</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl><SelectTrigger className="rounded-xl h-10 text-[13px]"><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="role">By Role</SelectItem>
                  <SelectItem value="user">Individual User</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )} />

          {targetMode === "role" ? (
            <FormField control={form.control} name="targetRole" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Target Role</FormLabel>
                <Select value={field.value ?? "student"} onValueChange={field.onChange}>
                  <FormControl><SelectTrigger className="rounded-xl h-10 text-[13px]"><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="student">All Students</SelectItem>
                    <SelectItem value="admin">All Admins</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
          ) : (
            <FormField control={form.control} name="targetUserId" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Target User</FormLabel>
                <Select value={field.value ?? ""} onValueChange={field.onChange}>
                  <FormControl><SelectTrigger className="rounded-xl h-10 text-[13px]"><SelectValue placeholder="Select user" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {profiles.filter((p) => !p.is_deleted).map((p) => (
                      <SelectItem key={p.user_id} value={p.user_id}>{p.name} — {p.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
          )}
        </div>

        {/* Status row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField control={form.control} name="status" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Action</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl><SelectTrigger className="rounded-xl h-10 text-[13px]"><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="sent">Send Now</SelectItem>
                  <SelectItem value="scheduled">Schedule</SelectItem>
                  <SelectItem value="draft">Save as Draft</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )} />

          {status === "scheduled" && (
            <FormField control={form.control} name="scheduledFor" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Send At</FormLabel>
                <FormControl>
                  <Input {...field} type="datetime-local" className="rounded-xl h-10 text-[13px]" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          )}
        </div>

        {/* Submit */}
        <Button
          type="submit"
          disabled={mutation.isPending}
          className={cn(
            "w-full h-10 gap-2 font-semibold",
            isEmergency ? "bg-action-danger hover:bg-action-danger-hover text-action-danger-foreground" : "",
          )}
        >
          {mutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> :
            status === "sent" ? <><Send className="h-4 w-4" />{isEmergency ? "Send Emergency Alert" : "Send Now"}</> :
            status === "scheduled" ? <><CalendarClock className="h-4 w-4" />Schedule</> :
            <><Save className="h-4 w-4" />Save Draft</>
          }
        </Button>
      </form>
    </Form>
  );
}

// ── History list ─────────────────────────────────────────────────────────────
function HistoryList({
  rows, stats, onEdit, onSendNow, onCancel, isBusy,
}: {
  rows: NotificationRow[];
  stats: Record<string, { delivered: number; read: number }>;
  onEdit: (n: NotificationRow) => void;
  onSendNow: (n: NotificationRow) => void;
  onCancel: (id: string) => void;
  isBusy: boolean;
}) {
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | NotificationRow["status"]>("all");

  const filtered = useMemo(() => {
    let list = rows;
    if (statusFilter !== "all") list = list.filter((n) => n.status === statusFilter);
    if (q.trim()) {
      const lq = q.toLowerCase();
      list = list.filter((n) => `${n.title} ${n.body}`.toLowerCase().includes(lq));
    }
    return list;
  }, [rows, statusFilter, q]);

  return (
    <div className="space-y-3">
      {/* Search + filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search notifications…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-8 h-9 text-[13px] rounded-xl"
          />
        </div>
        <div className="flex rounded-xl border border-border-subtle bg-surface-1 p-1 gap-1">
          {(["all", "sent", "scheduled", "draft", "cancelled"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[11px] font-semibold capitalize transition-all",
                statusFilter === s ? "bg-surface-3 text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border-subtle bg-surface-1 py-12 text-center">
          <Mail className="h-7 w-7 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-[13px] text-muted-foreground">No notifications found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((n, idx) => {
            const cfg = getKindConfig(n.kind ?? "general");
            const Icon = cfg.icon;
            const s = stats[n.id];
            return (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.14, delay: idx * 0.025 }}
                className={cn(
                  "rounded-2xl border bg-surface-1 p-4 shadow-xs transition-all hover:shadow-sm",
                  n.kind === "emergency" ? "border-danger/25" : "border-border-subtle",
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center shrink-0", cfg.iconBg)}>
                    <Icon className={cn("h-4 w-4", cfg.iconColor)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {statusChip(n.status)}
                      <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-md", cfg.iconBg, cfg.iconColor)}>
                        {cfg.label.replace(/^\S+\s/, "")}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-[13px] font-bold text-foreground leading-tight">{n.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                    {s && (
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3" /> {s.delivered} delivered
                        </span>
                        <span className="text-[10px] text-success flex items-center gap-1">
                          <Eye className="h-3 w-3" /> {s.read} read
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {n.status !== "cancelled" && n.status !== "sent" && (
                      <>
                        <button
                          onClick={() => onEdit(n)}
                          className="h-7 w-7 rounded-lg bg-surface-2 hover:bg-surface-3 border border-border-subtle flex items-center justify-center transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                        {n.status === "draft" && (
                          <button
                            onClick={() => onSendNow(n)}
                            disabled={isBusy}
                            className="h-7 w-7 rounded-lg bg-success/10 hover:bg-success/15 border border-success/20 flex items-center justify-center transition-colors"
                          >
                            <Send className="h-3.5 w-3.5 text-success" />
                          </button>
                        )}
                        <button
                          onClick={() => onCancel(n.id)}
                          disabled={isBusy}
                          className="h-7 w-7 rounded-lg bg-danger/5 hover:bg-danger/10 border border-danger/20 flex items-center justify-center transition-colors"
                        >
                          <Archive className="h-3.5 w-3.5 text-danger" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function AdminNotificationCenterTab() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"compose" | "history">("compose");
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<NotificationRow | null>(null);

  const editForm = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: "", body: "", kind: "general", targetMode: "role", targetRole: "student", status: "draft" },
  });

  const notificationsQuery = useQuery({
    queryKey: ["admin", "notifications"],
    queryFn: async (): Promise<NotificationRow[]> => {
      const { data, error } = await supabase
        .from("notifications")
        .select("id,title,body,kind,target_role,target_user_id,status,scheduled_for,sent_at,created_at,created_by,cancelled_at,cancelled_by")
        .order("created_at", { ascending: false })
        .limit(60);
      if (error) throw error;
      return (data ?? []) as NotificationRow[];
    },
  });

  const profilesQuery = useQuery({
    queryKey: ["admin", "profiles", "lite"],
    queryFn: async (): Promise<ProfileLite[]> => {
      const { data, error } = await supabase.from("profiles").select("user_id,name,email,is_deleted").order("created_at", { ascending: false }).limit(500);
      if (error) throw error;
      return (data ?? []) as ProfileLite[];
    },
  });

  const recipientStatsQuery = useQuery({
    queryKey: ["admin", "notification-recipients", (notificationsQuery.data ?? []).map((n) => n.id).join(",")],
    enabled: (notificationsQuery.data ?? []).length > 0,
    queryFn: async () => {
      const ids = (notificationsQuery.data ?? []).map((n) => n.id);
      if (!ids.length) return {};
      const { data, error } = await supabase.from("notification_recipients").select("notification_id,user_id,read_at").in("notification_id", ids);
      if (error) throw error;
      const stats: Record<string, { delivered: number; read: number }> = {};
      for (const r of (data ?? []) as RecipientRow[]) {
        if (!stats[r.notification_id]) stats[r.notification_id] = { delivered: 0, read: 0 };
        stats[r.notification_id].delivered += 1;
        if (r.read_at) stats[r.notification_id].read += 1;
      }
      return stats;
    },
  });

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel("admin_notifications_realtime_v2")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () =>
        qc.invalidateQueries({ queryKey: ["admin", "notifications"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "notification_recipients" }, () =>
        qc.invalidateQueries({ queryKey: ["admin", "notification-recipients"] }))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);

  const sendNowMutation = useMutation({
    mutationFn: async (n: NotificationRow) => {
      await supabase.from("notifications").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", n.id);
      const { data: existing } = await supabase.from("notification_recipients").select("id").eq("notification_id", n.id).limit(1);
      if ((existing ?? []).length > 0) return;
      const mode: "role" | "user" = n.target_user_id ? "user" : "role";
      const ids = await resolveRecipientUserIds(mode, n.target_role ?? undefined, n.target_user_id ?? undefined);
      if (ids.length > 0)
        await supabase.from("notification_recipients").insert(ids.map((uid) => ({ notification_id: n.id, user_id: uid })));
    },
    onSuccess: async () => { toast.success("Sent"); await qc.invalidateQueries({ queryKey: ["admin", "notifications"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to send"),
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data: userData } = await supabase.auth.getUser();
      const now = new Date().toISOString();
      await supabase.from("notifications").update({ status: "cancelled", cancelled_at: now, cancelled_by: userData.user?.id ?? null }).eq("id", id);
    },
    onSuccess: async () => { toast.success("Cancelled"); await qc.invalidateQueries({ queryKey: ["admin", "notifications"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: FormValues }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");
      const existing = notificationsQuery.data?.find((n) => n.id === id) ?? null;
      const now = new Date().toISOString();
      const willSendNow = values.status === "sent" && existing?.status !== "sent";
      await supabase.from("notifications").update({
        title: values.title.trim(), body: values.body.trim(), kind: values.kind,
        target_role: values.targetMode === "role" ? values.targetRole ?? null : null,
        target_user_id: values.targetMode === "user" ? values.targetUserId ?? null : null,
        status: values.status,
        scheduled_for: values.status === "scheduled" && values.scheduledFor ? new Date(values.scheduledFor).toISOString() : null,
        sent_at: willSendNow ? now : values.status === "sent" ? existing?.sent_at ?? now : null,
        ...(values.status === "cancelled" ? { cancelled_at: now, cancelled_by: userData.user.id } : {}),
      }).eq("id", id);
      if (willSendNow) {
        const { data: ex } = await supabase.from("notification_recipients").select("id").eq("notification_id", id).limit(1);
        if (!(ex ?? []).length) {
          const ids = await resolveRecipientUserIds(values.targetMode, values.targetRole, values.targetUserId);
          if (ids.length > 0)
            await supabase.from("notification_recipients").insert(ids.map((uid) => ({ notification_id: id, user_id: uid })));
        }
      }
    },
    onSuccess: async () => {
      toast.success("Updated");
      setEditOpen(false); setEditing(null);
      await qc.invalidateQueries({ queryKey: ["admin", "notifications"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const openEdit = (n: NotificationRow) => {
    setEditing(n);
    editForm.reset({
      title: n.title, body: n.body, kind: n.kind ?? "general",
      targetMode: n.target_user_id ? "user" : "role",
      targetRole: (n.target_role ?? "student") as "student" | "admin",
      targetUserId: n.target_user_id ?? undefined,
      status: n.status,
      scheduledFor: n.scheduled_for ? new Date(n.scheduled_for).toISOString().slice(0, 16) : undefined,
    });
    setEditOpen(true);
  };

  const rows = notificationsQuery.data ?? [];
  const stats = recipientStatsQuery.data ?? {};
  const analytics = useMemo(() => ({
    sent: rows.filter((r) => r.status === "sent").length,
    scheduled: rows.filter((r) => r.status === "scheduled").length,
    drafts: rows.filter((r) => r.status === "draft").length,
    delivered: rows.reduce((s, r) => s + (stats[r.id]?.delivered ?? 0), 0),
    read: rows.reduce((s, r) => s + (stats[r.id]?.read ?? 0), 0),
  }), [rows, stats]);

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="rounded-2xl border border-border-subtle bg-surface-1 p-5 shadow-xs">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Radio className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-[17px] font-black text-foreground">Notification Center</h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">Compose, target, and broadcast campus communications</p>
            </div>
          </div>
        </div>

        {/* Analytics strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {[
            { label: "Sent",       value: analytics.sent,      color: "text-success",         bg: "bg-success/10" },
            { label: "Scheduled",  value: analytics.scheduled, color: "text-primary",          bg: "bg-primary/10" },
            { label: "Drafts",     value: analytics.drafts,    color: "text-muted-foreground", bg: "bg-surface-3" },
            { label: "Delivered",  value: analytics.delivered, color: "text-accent",           bg: "bg-accent/10" },
            { label: "Read",       value: analytics.read,      color: "text-premium",          bg: "bg-premium/10" },
          ].map((s) => (
            <div key={s.label} className={cn("rounded-xl p-3 text-center", s.bg)}>
              <p className={cn("text-[22px] font-black tabular-nums leading-none", s.color)}>{s.value}</p>
              <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-widest font-semibold">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tab toggle ── */}
      <div className="flex rounded-xl border border-border-subtle bg-surface-1 p-1 w-fit">
        {(["compose", "history"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-4 py-2 rounded-lg text-[12px] font-semibold capitalize transition-all duration-120",
              tab === t ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t === "compose" ? "✏️ Compose" : "📋 History"}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      <AnimatePresence mode="wait">
        {tab === "compose" ? (
          <motion.div
            key="compose"
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="rounded-2xl border border-border-subtle bg-surface-1 p-6 shadow-xs"
          >
            <ComposeForm profiles={profilesQuery.data ?? []} onSuccess={() => setTab("history")} />
          </motion.div>
        ) : (
          <motion.div
            key="history"
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
          >
            {notificationsQuery.isLoading ? (
              <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
            ) : (
              <HistoryList
                rows={rows}
                stats={stats}
                onEdit={openEdit}
                onSendNow={(n) => sendNowMutation.mutate(n)}
                onCancel={(id) => cancelMutation.mutate(id)}
                isBusy={sendNowMutation.isPending || cancelMutation.isPending}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Edit dialog ── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Notification</DialogTitle>
            <DialogDescription>Update content, target, or reschedule.</DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit((v) => editing && updateMutation.mutate({ id: editing.id, values: v }))} className="space-y-4">
              <FormField control={editForm.control} name="title" render={({ field }) => (
                <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} className="rounded-xl" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={editForm.control} name="body" render={({ field }) => (
                <FormItem><FormLabel>Message</FormLabel><FormControl><Textarea {...field} rows={3} className="rounded-xl resize-none" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={editForm.control} name="status" render={({ field }) => (
                <FormItem><FormLabel>Status</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="sent">Send Now</SelectItem>
                      <SelectItem value="scheduled">Schedule</SelectItem>
                      <SelectItem value="cancelled">Cancel</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
              {editForm.watch("status") === "scheduled" && (
                <FormField control={editForm.control} name="scheduledFor" render={({ field }) => (
                  <FormItem><FormLabel>Send At</FormLabel><FormControl><Input {...field} type="datetime-local" className="rounded-xl" /></FormControl><FormMessage /></FormItem>
                )} />
              )}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
