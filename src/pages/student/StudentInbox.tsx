import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Bell, CheckCheck, MailOpen } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type RecipientRow = {
  id: string;
  notification_id: string;
  user_id: string;
  read_at: string | null;
  created_at: string;
};

type NotificationRow = {
  id: string;
  title: string;
  body: string;
  created_at: string;
  sent_at: string | null;
  status?: "draft" | "scheduled" | "sent" | "cancelled";
};

type InboxItem = {
  recipient: RecipientRow;
  notification: NotificationRow | null;
};

export default function StudentInbox() {
  const qc = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

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

  const notificationsQuery = useQuery({
    queryKey: [
      "student",
      "inbox",
      userId,
      "notifications",
      (recipientsQuery.data ?? []).map((r) => r.notification_id).join(","),
    ],
    enabled: Boolean(userId) && (recipientsQuery.data ?? []).length > 0,
    queryFn: async (): Promise<Record<string, NotificationRow>> => {
      const ids = Array.from(new Set((recipientsQuery.data ?? []).map((r) => r.notification_id)));
      if (ids.length === 0) return {};

      const { data, error } = await supabase
        .from("notifications")
        .select("id,title,body,created_at,sent_at,status")
        .in("id", ids);
      if (error) throw error;

      const map: Record<string, NotificationRow> = {};
      for (const n of (data ?? []) as NotificationRow[]) map[n.id] = n;
      return map;
    },
  });

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`student_inbox_${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notification_recipients", filter: `user_id=eq.${userId}` },
        () => {
          qc.invalidateQueries({ queryKey: ["student", "inbox", userId, "recipients"] });
          qc.invalidateQueries({ queryKey: ["student", "dashboard"] });
        },
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => {
        qc.invalidateQueries({ queryKey: ["student", "inbox", userId, "notifications"] });
        qc.invalidateQueries({ queryKey: ["student", "dashboard"] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc, userId]);

  const inboxItems = useMemo<InboxItem[]>(() => {
    const recs = recipientsQuery.data ?? [];
    const map = notificationsQuery.data ?? {};
    return recs
      .map((r) => ({ recipient: r, notification: map[r.notification_id] ?? null }))
      .filter((i) => i.notification?.status !== "cancelled");
  }, [recipientsQuery.data, notificationsQuery.data]);

  const unreadCount = useMemo(() => inboxItems.filter((i) => !i.recipient.read_at).length, [inboxItems]);

  const markOneRead = useMutation({
    mutationFn: async (recipientId: string) => {
      const { error } = await supabase
        .from("notification_recipients")
        .update({ read_at: new Date().toISOString() })
        .eq("id", recipientId);
      if (error) throw error;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["student", "inbox", userId, "recipients"] });
      await qc.invalidateQueries({ queryKey: ["student", "dashboard"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to mark as read"),
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
    onSuccess: async () => {
      toast.success("All notifications marked as read");
      await qc.invalidateQueries({ queryKey: ["student", "inbox", userId, "recipients"] });
      await qc.invalidateQueries({ queryKey: ["student", "dashboard"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to mark all as read"),
  });

  const loading = recipientsQuery.isLoading || notificationsQuery.isLoading;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <MailOpen className="h-6 w-6 text-primary" />
            Inbox
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Your announcements and updates</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1.5">
            <Bell className="h-3.5 w-3.5" />
            {unreadCount} unread
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllRead.mutate()}
            disabled={unreadCount === 0 || markAllRead.isPending}
            className="gap-1.5"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Mark all read
          </Button>
        </div>
      </header>

      {loading ? (
        <div className="text-center py-10 text-muted-foreground">Loading inbox…</div>
      ) : inboxItems.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="py-12 text-center">
            <Bell className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No notifications yet.</p>
            <p className="text-xs text-muted-foreground mt-1">You'll be notified about lectures and announcements here.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {inboxItems.map((item) => {
            const n = item.notification;
            const isUnread = !item.recipient.read_at;
            const isExpanded = expanded === item.recipient.id;

            return (
              <Card
                key={item.recipient.id}
                className={`border-border/50 cursor-pointer transition-colors ${isUnread ? "bg-primary/5 border-primary/20" : ""}`}
                onClick={() => {
                  setExpanded(isExpanded ? null : item.recipient.id);
                  if (isUnread) markOneRead.mutate(item.recipient.id);
                }}
              >
                <CardContent className="py-3 px-4">
                  <div className="flex items-start gap-3">
                    <div className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${isUnread ? "bg-primary" : "bg-transparent"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{n?.title ?? "(missing)"}</span>
                        {isUnread && <Badge className="bg-primary/20 text-primary text-[10px] h-4 border-0">New</Badge>}
                      </div>
                      <p className={`text-xs text-muted-foreground mt-0.5 ${isExpanded ? "" : "line-clamp-1"}`}>
                        {n?.body ?? ""}
                      </p>
                      <span className="text-[10px] text-muted-foreground mt-1 block">
                        {new Date(n?.sent_at ?? item.recipient.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
