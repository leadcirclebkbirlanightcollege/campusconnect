import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, BellOff, BookOpen, Megaphone, Settings, Trophy, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const KIND_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  announcement: Megaphone,
  lecture_reminder: BookOpen,
  achievement: Trophy,
  system_update: Settings,
  general: Bell,
};

type Recipient = {
  id: string;
  notification_id: string;
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

export default function TopbarNotificationCenter({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const recipientsQuery = useQuery({
    queryKey: ["topbar", "notification_center", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notification_recipients")
        .select("id,notification_id,read_at,created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(12);
      if (error) throw error;
      return (data ?? []) as Recipient[];
    },
    staleTime: 10_000,
    refetchInterval: 30_000,
  });

  const notificationsQuery = useQuery({
    queryKey: [
      "topbar",
      "notification_center_map",
      userId,
      (recipientsQuery.data ?? []).map((r) => r.notification_id).join(","),
    ],
    enabled: (recipientsQuery.data ?? []).length > 0,
    queryFn: async () => {
      const ids = [...new Set((recipientsQuery.data ?? []).map((r) => r.notification_id))];
      if (!ids.length) return {} as Record<string, Notification>;

      const { data, error } = await supabase
        .from("notifications")
        .select("id,title,body,kind,status,sent_at")
        .in("id", ids);
      if (error) throw error;

      return (data ?? []).reduce<Record<string, Notification>>((acc, curr) => {
        acc[curr.id] = curr as Notification;
        return acc;
      }, {});
    },
  });

  const markReadMutation = useMutation({
    mutationFn: async (recipientId: string) => {
      const { error } = await supabase
        .from("notification_recipients")
        .update({ read_at: new Date().toISOString() })
        .eq("id", recipientId)
        .is("read_at", null);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["topbar", "notification_center", userId] });
      qc.invalidateQueries({ queryKey: ["topbar", "unread", userId] });
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel(`topbar_notification_center_${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notification_recipients",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["topbar", "notification_center", userId] });
          qc.invalidateQueries({ queryKey: ["topbar", "unread", userId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc, userId]);

  const items = useMemo(() => {
    const map = notificationsQuery.data ?? {};
    return (recipientsQuery.data ?? [])
      .map((recipient) => ({ recipient, notification: map[recipient.notification_id] ?? null }))
      .filter((i) => i.notification && i.notification.status !== "cancelled");
  }, [notificationsQuery.data, recipientsQuery.data]);

  const unread = useMemo(() => items.filter((i) => !i.recipient.read_at).length, [items]);

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Notifications"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "relative flex h-8 w-8 items-center justify-center rounded-lg",
          "border border-border-subtle bg-surface-2",
          "text-muted-foreground hover:text-foreground hover:bg-surface-3",
          "transition-all duration-fast",
          unread > 0 && "animate-[bounce_140ms_ease-out]"
        )}
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-primary" />
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 z-50 w-[340px] overflow-hidden rounded-2xl border border-border-subtle bg-surface-1 shadow-lg">
            <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
              <div>
                <p className="text-xs font-semibold text-foreground">Notification Center</p>
                <p className="text-[11px] text-muted-foreground">{unread} unread</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-surface-2 hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="max-h-[360px] overflow-y-auto">
              {items.length === 0 ? (
                <div className="py-10 text-center">
                  <BellOff className="mx-auto mb-2 h-6 w-6 text-muted-foreground/50" />
                  <p className="text-xs text-muted-foreground">No notifications yet</p>
                </div>
              ) : (
                items.map(({ recipient, notification }) => {
                  if (!notification) return null;
                  const Icon = KIND_ICON[notification.kind] ?? Bell;
                  const isUnread = !recipient.read_at;
                  return (
                    <button
                      type="button"
                      key={recipient.id}
                      onClick={() => {
                        if (isUnread) markReadMutation.mutate(recipient.id);
                      }}
                      className={cn(
                        "flex w-full items-start gap-3 border-b border-border-subtle px-4 py-3 text-left transition-colors",
                        isUnread ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-surface-2"
                      )}
                    >
                      <span className="mt-0.5 rounded-lg bg-primary/10 p-1.5">
                        <Icon className="h-3.5 w-3.5 text-primary" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-xs font-semibold text-foreground">{notification.title}</p>
                          {isUnread && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
                        </div>
                        <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">{notification.body}</p>
                        <p className="mt-1 text-[10px] text-muted-foreground/80">
                          {formatDistanceToNow(new Date(notification.sent_at ?? recipient.created_at), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
