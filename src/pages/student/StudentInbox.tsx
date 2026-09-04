import { useEffect, useMemo, useState, type ElementType } from "react";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import {
  Bell,
  BellOff,
  BookOpen,
  Megaphone,
  Settings,
  Trophy,
  AlertTriangle,
  CheckCheck,
  ChevronRight,
} from "@/components/icons";
import { supabase } from "@/integrations/supabase/client";
import { PageContainer } from "@/layout/PageContainer";
import { PageHeader } from "@/layout/PageHeader";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useFestivalTheme } from "@/contexts/FestivalThemeContext";
import { FestiveBadge } from "@/components/festive/FestiveDecorations";

type Recipient = {
  id: string;
  notification_id: string;
  user_id: string;
  read_at: string | null;
  created_at: string;
};

type Notification = {
  id: string;
  title: string;
  body: string;
  kind: string;
  status: string;
  sent_at: string | null;
};

type InboxItem = {
  recipient: Recipient;
  notification: Notification;
};

const PAGE_SIZE = 20;

const KIND_META: Record<string, { icon: ElementType; label: string; tone: string }> = {
  announcement: { icon: Megaphone, label: "Announcement", tone: "text-primary" },
  lecture_reminder: { icon: BookOpen, label: "Lecture Alert", tone: "text-accent" },
  lecture_alert: { icon: BookOpen, label: "Lecture Alert", tone: "text-accent" },
  achievement: { icon: Trophy, label: "Achievement", tone: "text-premium" },
  attendance_alert: { icon: AlertTriangle, label: "Attendance", tone: "text-warning" },
  attendance_warning: { icon: AlertTriangle, label: "Attendance", tone: "text-warning" },
  system_update: { icon: Settings, label: "System", tone: "text-muted-foreground" },
  general: { icon: Bell, label: "General", tone: "text-primary" },
};

function resolveKind(kind: string) {
  return KIND_META[kind] ?? KIND_META.general;
}

export default function StudentInbox() {
  const qc = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const inboxQuery = useInfiniteQuery({
    queryKey: ["student", "inbox", userId],
    enabled: Boolean(userId),
    initialPageParam: 0,
    queryFn: async ({ pageParam }): Promise<InboxItem[]> => {
      if (!userId) return [];

      const from = Number(pageParam);
      const to = from + PAGE_SIZE - 1;

      const { data: recipients, error: recipientError } = await supabase
        .from("notification_recipients")
        .select("id,notification_id,user_id,read_at,created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (recipientError) throw recipientError;
      const list = (recipients ?? []) as Recipient[];
      if (!list.length) return [];

      const ids = Array.from(new Set(list.map((row) => row.notification_id)));
      const { data: notifications, error: notifError } = await supabase
        .from("notifications")
        .select("id,title,body,kind,status,sent_at")
        .in("id", ids);

      if (notifError) throw notifError;

      const map = new Map((notifications ?? []).map((n) => [n.id, n as Notification]));

      return list
        .map((recipient) => {
          const notification = map.get(recipient.notification_id);
          if (!notification || notification.status === "cancelled") return null;
          return { recipient, notification };
        })
        .filter((item): item is InboxItem => Boolean(item));
    },
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === PAGE_SIZE ? allPages.length * PAGE_SIZE : undefined,
    staleTime: 20_000,
    refetchOnWindowFocus: false,
  });

  const allItems = useMemo(() => inboxQuery.data?.pages.flat() ?? [], [inboxQuery.data?.pages]);
  const unreadCount = useMemo(() => allItems.filter((i) => !i.recipient.read_at).length, [allItems]);

  const markRead = useMutation({
    mutationFn: async (recipientId: string) => {
      const { error } = await supabase
        .from("notification_recipients")
        .update({ read_at: new Date().toISOString() })
        .eq("id", recipientId)
        .is("read_at", null);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["student", "inbox", userId] });
      qc.invalidateQueries({ queryKey: ["topbar", "notification_center", userId] });
      qc.invalidateQueries({ queryKey: ["topbar", "unread", userId] });
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
      toast.success("All notifications marked as read");
      qc.invalidateQueries({ queryKey: ["student", "inbox", userId] });
      qc.invalidateQueries({ queryKey: ["topbar", "notification_center", userId] });
      qc.invalidateQueries({ queryKey: ["topbar", "unread", userId] });
    },
  });

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`student_inbox_live_${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notification_recipients",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["student", "inbox", userId] });
          qc.invalidateQueries({ queryKey: ["topbar", "notification_center", userId] });
          qc.invalidateQueries({ queryKey: ["topbar", "unread", userId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc, userId]);

  const { isFestive, config } = useFestivalTheme();

  return (
    <PageContainer>
      {isFestive && (
        <div className="mb-2">
          <FestiveBadge label={`${config.name} • Inbox`} />
        </div>
      )}
      <PageHeader
        title="Notification Inbox"
        subtitle={unreadCount > 0 ? `${unreadCount} unread updates` : "All caught up"}
        action={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 gap-1.5"
            disabled={unreadCount === 0 || markAllRead.isPending}
            onClick={() => markAllRead.mutate()}
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Read all
          </Button>
        }
      />

      <section className="space-y-6">
        {inboxQuery.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, idx) => (
              <Skeleton key={idx} className="h-24 w-full rounded-2xl" />
            ))}
          </div>
        ) : allItems.length === 0 ? (
          <GlassCard className="py-16 text-center" hover={false}>
            <BellOff className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm font-semibold text-foreground">No notifications yet</p>
            <p className="mt-1 text-xs text-muted-foreground">Announcements and alerts will appear here.</p>
          </GlassCard>
        ) : (
          <>
            <div className="space-y-3">
              {allItems.map((item, idx) => {
                const isUnread = !item.recipient.read_at;
                const kind = resolveKind(item.notification.kind);
                const Icon = kind.icon;

                return (
                  <motion.div
                    key={item.recipient.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18, delay: Math.min(idx * 0.02, 0.12) }}
                    drag="x"
                    dragConstraints={{ left: 0, right: 80 }}
                    onDragEnd={(_, info) => {
                      if (info.offset.x > 58 && isUnread) {
                        markRead.mutate(item.recipient.id);
                      }
                    }}
                    className="touch-pan-y"
                  >
                    <GlassCard
                      hover={false}
                      className={cn(
                        "min-h-24 rounded-2xl px-4 py-3 transition-shadow",
                        isUnread &&
                          "border-primary/40 shadow-[0_10px_28px_-16px_hsl(var(--primary)/0.45)] ring-1 ring-primary/15"
                      )}
                    >

                      <button
                        type="button"
                        onClick={() => {
                          if (isUnread) markRead.mutate(item.recipient.id);
                        }}
                        className="flex w-full items-start gap-3 text-left"
                      >
                        <span className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-surface-2">
                          <Icon className={cn("h-4 w-4", kind.tone)} />
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className={cn("truncate text-sm", isUnread ? "font-bold text-foreground" : "font-semibold text-foreground/90")}>
                              {item.notification.title}
                            </p>
                            {isUnread ? <span className="mt-1 h-2.5 w-2.5 rounded-full bg-primary" /> : null}
                          </div>

                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.notification.body}</p>

                          <div className="mt-2 flex items-center justify-between">
                            <span className="text-[11px] font-medium text-muted-foreground">{kind.label}</span>
                            <span className="text-[11px] text-muted-foreground">
                              {formatDistanceToNow(new Date(item.notification.sent_at ?? item.recipient.created_at), {
                                addSuffix: true,
                              })}
                            </span>
                          </div>
                        </div>

                        <ChevronRight className="mt-1 h-4 w-4 text-muted-foreground/70" />
                      </button>
                    </GlassCard>
                  </motion.div>
                );
              })}
            </div>

            {inboxQuery.hasNextPage && (
              <Button
                type="button"
                variant="outline"
                className="h-12 w-full"
                onClick={() => inboxQuery.fetchNextPage()}
                disabled={inboxQuery.isFetchingNextPage}
              >
                {inboxQuery.isFetchingNextPage ? "Loading older notifications..." : "Load older notifications"}
              </Button>
            )}
          </>
        )}
      </section>
    </PageContainer>
  );
}
