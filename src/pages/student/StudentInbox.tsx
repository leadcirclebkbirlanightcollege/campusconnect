import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell, BellOff, CheckCheck, Megaphone, AlertTriangle,
  BookOpen, Trophy, Settings, RefreshCw, Filter, Calendar,
  Clock, ChevronRight, X, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, isToday, isThisWeek, format } from "date-fns";

// ── Types ────────────────────────────────────────────────────────────────────
type NotificationKind =
  | "announcement" | "lecture_reminder" | "attendance_alert"
  | "achievement" | "system_update" | "emergency" | "general";

type NotificationRow = {
  id: string;
  title: string;
  body: string;
  kind: string;
  created_at: string;
  sent_at: string | null;
  status: string;
};

type RecipientRow = {
  id: string;
  notification_id: string;
  user_id: string;
  read_at: string | null;
  created_at: string;
};

type InboxItem = {
  recipient: RecipientRow;
  notification: NotificationRow | null;
};

type FilterMode = "all" | "today" | "week" | "unread";

// ── Kind config ──────────────────────────────────────────────────────────────
const KIND_CONFIG: Record<string, {
  icon: React.ElementType; label: string; iconBg: string; iconColor: string;
}> = {
  announcement:      { icon: Megaphone,      label: "Announcement",      iconBg: "bg-primary/10",   iconColor: "text-primary" },
  lecture_reminder:  { icon: BookOpen,       label: "Lecture Reminder",  iconBg: "bg-accent/10",    iconColor: "text-accent" },
  attendance_alert:  { icon: Calendar,       label: "Attendance",        iconBg: "bg-warning/10",   iconColor: "text-warning" },
  achievement:       { icon: Trophy,         label: "Achievement",       iconBg: "bg-premium/10",   iconColor: "text-premium" },
  system_update:     { icon: Settings,       label: "System Update",     iconBg: "bg-surface-3",    iconColor: "text-muted-foreground" },
  emergency:         { icon: AlertTriangle,  label: "Emergency Alert",   iconBg: "bg-danger/10",    iconColor: "text-danger" },
  general:           { icon: Bell,           label: "General",           iconBg: "bg-primary/10",   iconColor: "text-primary" },
};

function getKindConfig(kind: string) {
  return KIND_CONFIG[kind] ?? KIND_CONFIG.general;
}

// ── Notification detail panel ─────────────────────────────────────────────────
function NotificationDetail({
  item, onClose,
}: {
  item: InboxItem | null;
  onClose: () => void;
}) {
  if (!item?.notification) return null;
  const n = item.notification;
  const cfg = getKindConfig(n.kind);
  const Icon = cfg.icon;
  const isEmergency = n.kind === "emergency";

  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 16 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className={cn(
        "rounded-2xl border bg-surface-1 p-6 shadow-xs h-full flex flex-col",
        isEmergency ? "border-danger/30" : "border-border-subtle",
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className={cn("h-10 w-10 rounded-2xl flex items-center justify-center shrink-0", cfg.iconBg)}>
            <Icon className={cn("h-5 w-5", cfg.iconColor)} />
          </div>
          <div>
            <p className={cn("text-[11px] font-bold uppercase tracking-widest", cfg.iconColor)}>{cfg.label}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {format(new Date(n.sent_at ?? item.recipient.created_at), "d MMM yyyy, HH:mm")}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="h-7 w-7 rounded-lg bg-surface-2 hover:bg-surface-3 border border-border-subtle flex items-center justify-center transition-colors"
        >
          <X className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>

      {/* Title */}
      <h3 className="text-[17px] font-black text-foreground leading-snug mb-3">{n.title}</h3>

      {/* Body */}
      <p className="text-[13px] text-muted-foreground leading-relaxed flex-1">{n.body}</p>

      {/* Footer timestamp */}
      <div className="mt-6 pt-4 border-t border-border-subtle">
        <p className="text-[11px] text-muted-foreground">
          Received {formatDistanceToNow(new Date(item.recipient.created_at), { addSuffix: true })}
        </p>
      </div>
    </motion.div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function StudentInbox() {
  const qc = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterMode>("all");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  // ── Recipients query ──────────────────────────────────────────────────────
  const recipientsQuery = useQuery({
    queryKey: ["student", "inbox", userId, "recipients"],
    enabled: Boolean(userId),
    queryFn: async (): Promise<RecipientRow[]> => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("notification_recipients")
        .select("id,notification_id,user_id,read_at,created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as RecipientRow[];
    },
  });

  // ── Notifications query ───────────────────────────────────────────────────
  const notificationsQuery = useQuery({
    queryKey: [
      "student", "inbox", userId, "notifications",
      (recipientsQuery.data ?? []).map((r) => r.notification_id).join(","),
    ],
    enabled: Boolean(userId) && (recipientsQuery.data ?? []).length > 0,
    queryFn: async (): Promise<Record<string, NotificationRow>> => {
      const ids = Array.from(new Set((recipientsQuery.data ?? []).map((r) => r.notification_id)));
      if (!ids.length) return {};
      const { data, error } = await supabase
        .from("notifications")
        .select("id,title,body,kind,created_at,sent_at,status")
        .in("id", ids);
      if (error) throw error;
      const map: Record<string, NotificationRow> = {};
      for (const n of (data ?? []) as NotificationRow[]) map[n.id] = n;
      return map;
    },
  });

  // ── Realtime subscription ─────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`student_inbox_rt_${userId}`)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "notification_recipients", filter: `user_id=eq.${userId}`,
      }, () => {
        qc.invalidateQueries({ queryKey: ["student", "inbox", userId, "recipients"] });
        qc.invalidateQueries({ queryKey: ["app_sidebar", "unread"] });
        qc.invalidateQueries({ queryKey: ["shell", "unread"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => {
        qc.invalidateQueries({ queryKey: ["student", "inbox", userId, "notifications"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc, userId]);

  // ── Derived data ──────────────────────────────────────────────────────────
  const allItems = useMemo<InboxItem[]>(() => {
    const recs = recipientsQuery.data ?? [];
    const map = notificationsQuery.data ?? {};
    return recs
      .map((r) => ({ recipient: r, notification: map[r.notification_id] ?? null }))
      .filter((i) => i.notification?.status !== "cancelled");
  }, [recipientsQuery.data, notificationsQuery.data]);

  const filtered = useMemo(() => {
    switch (filter) {
      case "unread": return allItems.filter((i) => !i.recipient.read_at);
      case "today": return allItems.filter((i) => isToday(new Date(i.recipient.created_at)));
      case "week": return allItems.filter((i) => isThisWeek(new Date(i.recipient.created_at)));
      default: return allItems;
    }
  }, [allItems, filter]);

  const unreadCount = useMemo(() => allItems.filter((i) => !i.recipient.read_at).length, [allItems]);
  const selectedItem = filtered.find((i) => i.recipient.id === selectedId) ?? null;

  // ── Mutations ─────────────────────────────────────────────────────────────
  const markOneRead = useMutation({
    mutationFn: async (recipientId: string) => {
      const { error } = await supabase
        .from("notification_recipients")
        .update({ read_at: new Date().toISOString() })
        .eq("id", recipientId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["student", "inbox", userId, "recipients"] });
      qc.invalidateQueries({ queryKey: ["app_sidebar", "unread"] });
      qc.invalidateQueries({ queryKey: ["shell", "unread"] });
    },
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      if (!userId) return;
      const { error } = await supabase
        .from("notification_recipients")
        .update({ read_at: new Date().toISOString() })
        .eq("user_id", userId)
        .is("read_at", null);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("All marked as read");
      qc.invalidateQueries({ queryKey: ["student", "inbox", userId, "recipients"] });
      qc.invalidateQueries({ queryKey: ["app_sidebar", "unread"] });
      qc.invalidateQueries({ queryKey: ["shell", "unread"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const loading = recipientsQuery.isLoading || notificationsQuery.isLoading;

  const FILTERS: { key: FilterMode; label: string }[] = [
    { key: "all",    label: "All" },
    { key: "unread", label: `Unread${unreadCount > 0 ? ` (${unreadCount})` : ""}` },
    { key: "today",  label: "Today" },
    { key: "week",   label: "This Week" },
  ];

  return (
    <div className="space-y-4">

      {/* ── Header bar ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-[18px] font-black text-foreground flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Notification Center
          </h2>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            {unreadCount > 0 ? (
              <span className="text-primary font-semibold">{unreadCount} unread</span>
            ) : "All caught up"} · {allItems.length} total
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => markAllRead.mutate()}
          disabled={unreadCount === 0 || markAllRead.isPending}
          className="gap-1.5 h-8 text-[12px]"
        >
          <CheckCheck className="h-3.5 w-3.5" />
          Mark all read
        </Button>
      </div>

      {/* ── Filter pills ── */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={cn(
              "px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all duration-120",
              filter === key
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-surface-2 text-muted-foreground hover:text-foreground border border-border-subtle",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Body ── */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 w-full rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border-subtle bg-surface-1 py-16 text-center">
          <BellOff className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-[14px] font-semibold text-muted-foreground">
            {filter === "unread" ? "No unread notifications" : "No notifications yet"}
          </p>
          <p className="text-[12px] text-muted-foreground/60 mt-1">
            Announcements and alerts will appear here
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[360px,1fr]">

          {/* List */}
          <div className="rounded-2xl border border-border-subtle bg-surface-1 shadow-xs overflow-hidden">
            <div className="px-4 py-3 border-b border-border-subtle">
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                {filtered.length} message{filtered.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="overflow-y-auto max-h-[520px]">
              <AnimatePresence initial={false}>
                {filtered.map((item, idx) => {
                  const n = item.notification;
                  if (!n) return null;
                  const cfg = getKindConfig(n.kind);
                  const Icon = cfg.icon;
                  const isUnread = !item.recipient.read_at;
                  const isActive = selectedId === item.recipient.id;
                  const isEmergency = n.kind === "emergency";

                  return (
                    <motion.button
                      key={item.recipient.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.14, delay: idx * 0.03 }}
                      className={cn(
                        "w-full text-left px-4 py-3.5 transition-all duration-120 border-b border-border-subtle last:border-0 flex items-start gap-3 group",
                        isActive ? "bg-primary/5 border-l-[3px] border-l-primary pl-[13px]" : "hover:bg-surface-2",
                        isEmergency && !isActive ? "border-l-[3px] border-l-danger pl-[13px]" : "",
                      )}
                      onClick={() => {
                        setSelectedId(isActive ? null : item.recipient.id);
                        if (isUnread) markOneRead.mutate(item.recipient.id);
                      }}
                    >
                      {/* Icon */}
                      <div className={cn("h-8 w-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5", cfg.iconBg)}>
                        <Icon className={cn("h-4 w-4", cfg.iconColor)} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1">
                          <span className={cn("text-[13px] leading-tight truncate", isUnread ? "font-bold text-foreground" : "font-medium text-foreground/80")}>
                            {n.title}
                          </span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {isUnread && (
                              <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                            )}
                            <span className="text-[10px] text-muted-foreground">
                              {formatDistanceToNow(new Date(n.sent_at ?? item.recipient.created_at), { addSuffix: false })}
                            </span>
                          </div>
                        </div>
                        <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{n.body}</p>
                        <span className={cn(
                          "inline-flex items-center mt-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-md",
                          cfg.iconBg, cfg.iconColor,
                        )}>
                          {cfg.label}
                        </span>
                      </div>

                      <ChevronRight className={cn(
                        "h-3.5 w-3.5 text-muted-foreground shrink-0 mt-1 transition-transform duration-120",
                        isActive ? "rotate-90" : "opacity-0 group-hover:opacity-60",
                      )} />
                    </motion.button>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>

          {/* Detail panel */}
          <div className="hidden lg:block min-h-[300px]">
            <AnimatePresence mode="wait">
              {selectedItem ? (
                <NotificationDetail
                  key={selectedItem.recipient.id}
                  item={selectedItem}
                  onClose={() => setSelectedId(null)}
                />
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="rounded-2xl border border-dashed border-border-subtle bg-surface-1 h-full min-h-[300px] flex flex-col items-center justify-center gap-3 text-center p-8"
                >
                  <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Sparkles className="h-6 w-6 text-primary" />
                  </div>
                  <p className="text-[14px] font-semibold text-muted-foreground">Select a notification</p>
                  <p className="text-[12px] text-muted-foreground/60">Click any message to read it in full here</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Mobile detail drawer (renders below list on small screens) */}
          <AnimatePresence>
            {selectedItem && (
              <motion.div
                key="mobile-detail"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="lg:hidden overflow-hidden"
              >
                <NotificationDetail item={selectedItem} onClose={() => setSelectedId(null)} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
