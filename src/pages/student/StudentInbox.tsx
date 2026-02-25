import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Bell, CheckCheck } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

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
  const [selectedId, setSelectedId] = useState<string | null>(null);

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
      "student", "inbox", userId, "notifications",
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
      .on("postgres_changes", { event: "*", schema: "public", table: "notification_recipients", filter: `user_id=eq.${userId}` }, () => {
        qc.invalidateQueries({ queryKey: ["student", "inbox", userId, "recipients"] });
        qc.invalidateQueries({ queryKey: ["student", "dashboard"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => {
        qc.invalidateQueries({ queryKey: ["student", "inbox", userId, "notifications"] });
        qc.invalidateQueries({ queryKey: ["student", "dashboard"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
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
  const selectedItem = inboxItems.find((i) => i.recipient.id === selectedId);

  return (
    <div className="space-y-4">
      {/* Action bar */}
      <div className="flex items-center justify-between">
        <Badge variant="secondary" className="text-xs">{unreadCount} unread</Badge>
        <Button
          variant="outline"
          size="sm"
          onClick={() => markAllRead.mutate()}
          disabled={unreadCount === 0 || markAllRead.isPending}
          className="gap-1.5 h-8 text-xs"
        >
          <CheckCheck className="h-3.5 w-3.5" />
          Mark all read
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      ) : inboxItems.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Bell className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No notifications yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[340px,1fr]">
          {/* Message list */}
          <div className="divide-y divide-border rounded-xl border bg-card overflow-hidden">
            {inboxItems.map((item) => {
              const n = item.notification;
              const isUnread = !item.recipient.read_at;
              const isActive = selectedId === item.recipient.id;

              return (
                <button
                  key={item.recipient.id}
                  className={`w-full text-left px-4 py-3 transition-colors ${isActive ? "bg-muted" : "hover:bg-muted/50"} ${isUnread ? "border-l-[3px] border-l-primary" : ""}`}
                  onClick={() => {
                    setSelectedId(item.recipient.id);
                    if (isUnread) markOneRead.mutate(item.recipient.id);
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className={`text-sm truncate ${isUnread ? "font-medium" : ""}`}>
                      {n?.title ?? "(missing)"}
                    </span>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {new Date(n?.sent_at ?? item.recipient.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{n?.body ?? ""}</p>
                </button>
              );
            })}
          </div>

          {/* Message preview */}
          <Card className="hidden lg:block">
            <CardContent className="py-6">
              {selectedItem ? (
                <div className="space-y-3">
                  <h3 className="text-base font-medium text-foreground">
                    {selectedItem.notification?.title}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {new Date(selectedItem.notification?.sent_at ?? selectedItem.recipient.created_at).toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {selectedItem.notification?.body}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Select a message to preview
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
