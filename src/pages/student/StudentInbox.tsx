import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Bell, CheckCheck, MailOpen } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
};

type InboxItem = {
  recipient: RecipientRow;
  notification: NotificationRow | null;
};

export default function StudentInbox() {
  const qc = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);

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
        .select("id,title,body,created_at,sent_at")
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc, userId]);

  const inboxItems = useMemo<InboxItem[]>(() => {
    const recs = recipientsQuery.data ?? [];
    const map = notificationsQuery.data ?? {};
    return recs.map((r) => ({ recipient: r, notification: map[r.notification_id] ?? null }));
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
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-premium bg-clip-text text-transparent mb-2">Inbox</h1>
          <p className="text-muted-foreground">Your latest announcements and updates.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="gap-2">
            <Bell className="h-4 w-4" />
            {unreadCount} unread
          </Badge>
          <Button
            variant="outline"
            onClick={() => markAllRead.mutate()}
            disabled={unreadCount === 0 || markAllRead.isPending}
            className="gap-2"
          >
            <CheckCheck className="h-4 w-4" />
            Mark all read
          </Button>
        </div>
      </div>

      <Card className="border-primary/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MailOpen className="h-5 w-5 text-primary" />
            Notifications
          </CardTitle>
          <CardDescription>Realtime updates with read receipts.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Separator />

          <div className="rounded-lg border border-border/60 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Message</TableHead>
                  <TableHead className="w-[140px]">Status</TableHead>
                  <TableHead className="w-[160px] text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="py-10 text-center text-muted-foreground">
                      Loading inbox…
                    </TableCell>
                  </TableRow>
                ) : inboxItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="py-10 text-center text-muted-foreground">
                      No notifications yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  inboxItems.map((item) => {
                    const n = item.notification;
                    const isUnread = !item.recipient.read_at;
                    return (
                      <TableRow key={item.recipient.id} className={isUnread ? "bg-muted/20" : undefined}>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{n?.title ?? "(missing notification)"}</span>
                              {isUnread ? <Badge className="bg-accent text-accent-foreground">Unread</Badge> : null}
                            </div>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{n?.body ?? ""}</p>
                            <span className="text-xs text-muted-foreground">
                              {new Date(n?.sent_at ?? item.recipient.created_at).toLocaleString()}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {isUnread ? (
                            <Badge variant="secondary">Not read</Badge>
                          ) : (
                            <Badge className="bg-success text-success-foreground">Read</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!isUnread || markOneRead.isPending}
                            onClick={() => markOneRead.mutate(item.recipient.id)}
                          >
                            Mark read
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
