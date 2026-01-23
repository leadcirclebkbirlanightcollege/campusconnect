import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Bell, CalendarClock, Send, Save, RefreshCw, Pencil, Archive } from "lucide-react";

type NotificationRow = {
  id: string;
  title: string;
  body: string;
  target_role: "admin" | "student" | null;
  target_user_id: string | null;
  status: "draft" | "scheduled" | "sent" | "cancelled";
  scheduled_for: string | null;
  sent_at: string | null;
  created_at: string;
  created_by: string;
  cancelled_at?: string | null;
  cancelled_by?: string | null;
};

type RecipientRow = {
  notification_id: string;
  user_id: string;
  read_at: string | null;
};

type ProfileLite = {
  user_id: string;
  name: string;
  email: string;
  is_deleted: boolean;
};

const schema = z
  .object({
    title: z.string().trim().min(3, "Title is too short").max(120),
    body: z.string().trim().min(5, "Message is too short").max(2000),
    targetMode: z.enum(["role", "user"]),
    targetRole: z.enum(["student", "admin"]).optional(),
    targetUserId: z.string().uuid().optional(),
    status: z.enum(["draft", "scheduled", "sent", "cancelled"]),
    scheduledFor: z.string().optional(), // datetime-local
  })
  .superRefine((v, ctx) => {
    if (v.status === "cancelled") return;
    if (v.targetMode === "role" && !v.targetRole) {
      ctx.addIssue({ code: "custom", message: "Select a role target", path: ["targetRole"] });
    }
    if (v.targetMode === "user" && !v.targetUserId) {
      ctx.addIssue({ code: "custom", message: "Select a user target", path: ["targetUserId"] });
    }
    if (v.status === "scheduled") {
      if (!v.scheduledFor) {
        ctx.addIssue({ code: "custom", message: "Pick a schedule time", path: ["scheduledFor"] });
      } else {
        const d = new Date(v.scheduledFor);
        if (Number.isNaN(d.getTime())) {
          ctx.addIssue({ code: "custom", message: "Invalid schedule time", path: ["scheduledFor"] });
        }
      }
    }
  });

type FormValues = z.infer<typeof schema>;

function formatStatus(status: NotificationRow["status"]) {
  if (status === "draft") return { label: "Draft", variant: "secondary" as const };
  if (status === "scheduled") return { label: "Scheduled", variant: "outline" as const };
  if (status === "cancelled") return { label: "Cancelled", variant: "secondary" as const };
  return { label: "Sent", variant: "default" as const };
}

function toLocalDateTimeInput(iso: string) {
  const d = new Date(iso);
  const offsetMs = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - offsetMs).toISOString().slice(0, 16);
}

async function resolveRecipientUserIds(targetMode: "role" | "user", targetRole?: "student" | "admin", targetUserId?: string) {
  if (targetMode === "user" && targetUserId) return [targetUserId];

  if (targetMode === "role" && targetRole) {
    const { data: roles, error: rolesError } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", targetRole);
    if (rolesError) throw rolesError;

    const roleUserIds = (roles ?? []).map((r) => r.user_id);
    if (roleUserIds.length === 0) return [];

    // Filter out soft-deleted users
    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("user_id,is_deleted")
      .in("user_id", roleUserIds);
    if (profileError) throw profileError;

    return (profiles ?? []).filter((p) => !p.is_deleted).map((p) => p.user_id);
  }

  return [];
}

export default function AdminNotificationCenterTab() {
  const qc = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<NotificationRow | null>(null);
  const [historyFilters, setHistoryFilters] = useState<{ q: string; status: "all" | NotificationRow["status"] }>({
    q: "",
    status: "all",
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      body: "",
      targetMode: "role",
      targetRole: "student",
      status: "sent",
      scheduledFor: undefined,
    },
  });

  const editForm = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      body: "",
      targetMode: "role",
      targetRole: "student",
      status: "draft",
      scheduledFor: undefined,
    },
  });

  const notificationsQuery = useQuery({
    queryKey: ["admin", "notifications"],
    queryFn: async (): Promise<NotificationRow[]> => {
      const { data, error } = await supabase
        .from("notifications")
        .select(
          "id,title,body,target_role,target_user_id,status,scheduled_for,sent_at,created_at,created_by,cancelled_at,cancelled_by",
        )
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as NotificationRow[];
    },
  });

  const profilesQuery = useQuery({
    queryKey: ["admin", "profiles", "lite"],
    queryFn: async (): Promise<ProfileLite[]> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id,name,email,is_deleted")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as ProfileLite[];
    },
  });

  const recipientStatsQuery = useQuery({
    queryKey: ["admin", "notification-recipients", notificationsQuery.data?.map((n) => n.id).join(",")],
    enabled: Boolean(notificationsQuery.data && notificationsQuery.data.length > 0),
    queryFn: async (): Promise<Record<string, { delivered: number; read: number }>> => {
      const ids = (notificationsQuery.data ?? []).map((n) => n.id);
      if (ids.length === 0) return {};

      const { data, error } = await supabase
        .from("notification_recipients")
        .select("notification_id,user_id,read_at")
        .in("notification_id", ids);
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

  useEffect(() => {
    // Realtime updates: recipients change (delivery + reads), notifications change (status)
    const channel = supabase
      .channel("admin_notifications_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        () => {
          qc.invalidateQueries({ queryKey: ["admin", "notifications"] });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notification_recipients" },
        () => {
          qc.invalidateQueries({ queryKey: ["admin", "notification-recipients"] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  const createNotificationMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!userData.user) throw new Error("Not authenticated");

      const nowIso = new Date().toISOString();
      const scheduledForIso =
        values.status === "scheduled" && values.scheduledFor
          ? new Date(values.scheduledFor).toISOString()
          : null;

      const { data: created, error: createError } = await supabase
        .from("notifications")
        .insert([
          {
            created_by: userData.user.id,
            title: values.title.trim(),
            body: values.body.trim(),
            target_role: values.targetMode === "role" ? values.targetRole ?? null : null,
            target_user_id: values.targetMode === "user" ? values.targetUserId ?? null : null,
            status: values.status,
            scheduled_for: scheduledForIso,
            sent_at: values.status === "sent" ? nowIso : null,
          },
        ])
        .select("id")
        .single();

      if (createError) throw createError;

      // Only create recipients when sending now.
      if (values.status === "sent") {
        const userIds = await resolveRecipientUserIds(values.targetMode, values.targetRole, values.targetUserId);
        if (userIds.length > 0) {
          const { error: recError } = await supabase
            .from("notification_recipients")
            .insert(userIds.map((uid) => ({ notification_id: created.id, user_id: uid })));
          if (recError) throw recError;
        }
      }

      return created.id as string;
    },
    onSuccess: async () => {
      toast.success("Notification saved");
      form.reset({
        title: "",
        body: "",
        targetMode: "role",
        targetRole: "student",
        status: "sent",
        scheduledFor: undefined,
      });
      await qc.invalidateQueries({ queryKey: ["admin", "notifications"] });
      await qc.invalidateQueries({ queryKey: ["admin", "notification-recipients"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to create notification"),
  });

  const sendNowMutation = useMutation({
    mutationFn: async (n: NotificationRow) => {
      const { error: updError } = await supabase
        .from("notifications")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", n.id);
      if (updError) throw updError;

      // Create recipients if missing
      const { data: existing, error: existingError } = await supabase
        .from("notification_recipients")
        .select("id")
        .eq("notification_id", n.id)
        .limit(1);
      if (existingError) throw existingError;

      if ((existing ?? []).length > 0) return;

      const targetMode: "role" | "user" = n.target_user_id ? "user" : "role";
      const userIds = await resolveRecipientUserIds(targetMode, n.target_role ?? undefined, n.target_user_id ?? undefined);
      if (userIds.length === 0) return;

      const { error: recError } = await supabase
        .from("notification_recipients")
        .insert(userIds.map((uid) => ({ notification_id: n.id, user_id: uid })));
      if (recError) throw recError;
    },
    onSuccess: async () => {
      toast.success("Sent");
      await qc.invalidateQueries({ queryKey: ["admin", "notifications"] });
      await qc.invalidateQueries({ queryKey: ["admin", "notification-recipients"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to send"),
  });

  const updateNotificationMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: FormValues }) => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!userData.user) throw new Error("Not authenticated");

      const existing = notificationsQuery.data?.find((n) => n.id === id) ?? null;
      const nowIso = new Date().toISOString();

      const scheduledForIso =
        values.status === "scheduled" && values.scheduledFor
          ? new Date(values.scheduledFor).toISOString()
          : null;

      const willSendNow = values.status === "sent" && existing?.status !== "sent";

      const patch: Record<string, any> = {
        title: values.title.trim(),
        body: values.body.trim(),
        target_role: values.targetMode === "role" ? values.targetRole ?? null : null,
        target_user_id: values.targetMode === "user" ? values.targetUserId ?? null : null,
        status: values.status,
        scheduled_for: values.status === "scheduled" ? scheduledForIso : null,
        sent_at: willSendNow ? nowIso : values.status === "sent" ? existing?.sent_at ?? nowIso : null,
      };

      if (values.status === "cancelled") {
        patch.scheduled_for = null;
        patch.cancelled_at = nowIso;
        patch.cancelled_by = userData.user.id;
      }

      const { error: updError } = await supabase.from("notifications").update(patch).eq("id", id);
      if (updError) throw updError;

      if (willSendNow) {
        // Create recipients if missing
        const { data: existingRec, error: existingError } = await supabase
          .from("notification_recipients")
          .select("id")
          .eq("notification_id", id)
          .limit(1);
        if (existingError) throw existingError;
        if ((existingRec ?? []).length === 0) {
          const userIds = await resolveRecipientUserIds(values.targetMode, values.targetRole, values.targetUserId);
          if (userIds.length > 0) {
            const { error: recError } = await supabase
              .from("notification_recipients")
              .insert(userIds.map((uid) => ({ notification_id: id, user_id: uid })));
            if (recError) throw recError;
          }
        }
      }
    },
    onSuccess: async () => {
      toast.success("Notification updated");
      setEditOpen(false);
      setEditing(null);
      await qc.invalidateQueries({ queryKey: ["admin", "notifications"] });
      await qc.invalidateQueries({ queryKey: ["admin", "notification-recipients"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to update notification"),
  });

  const cancelNotificationMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!userData.user) throw new Error("Not authenticated");

      const nowIso = new Date().toISOString();
      const { error } = await supabase
        .from("notifications")
        .update({ status: "cancelled", scheduled_for: null, cancelled_at: nowIso, cancelled_by: userData.user.id })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Notification cancelled");
      await qc.invalidateQueries({ queryKey: ["admin", "notifications"] });
      await qc.invalidateQueries({ queryKey: ["admin", "notification-recipients"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to cancel notification"),
  });

  const filteredHistory = useMemo(() => {
    const rows = notificationsQuery.data ?? [];
    const q = historyFilters.q.trim().toLowerCase();
    return rows.filter((n) => {
      if (historyFilters.status !== "all" && n.status !== historyFilters.status) return false;
      if (!q) return true;
      return `${n.title} ${n.body}`.toLowerCase().includes(q);
    });
  }, [notificationsQuery.data, historyFilters]);

  const analytics = useMemo(() => {
    const rows = notificationsQuery.data ?? [];
    const stats = recipientStatsQuery.data ?? {};
    const sent = rows.filter((r) => r.status === "sent").length;
    const scheduled = rows.filter((r) => r.status === "scheduled").length;
    const drafts = rows.filter((r) => r.status === "draft").length;

    const delivered = rows.reduce((sum, r) => sum + (stats[r.id]?.delivered ?? 0), 0);
    const read = rows.reduce((sum, r) => sum + (stats[r.id]?.read ?? 0), 0);

    return { sent, scheduled, drafts, delivered, read };
  }, [notificationsQuery.data, recipientStatsQuery.data]);

  const loading =
    notificationsQuery.isLoading ||
    profilesQuery.isLoading ||
    createNotificationMutation.isPending ||
    sendNowMutation.isPending ||
    updateNotificationMutation.isPending ||
    cancelNotificationMutation.isPending;

  return (
    <div className="space-y-6">
      <Card className="border-primary/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Notification Center
          </CardTitle>
          <CardDescription>
            Compose notifications, target roles/users, save drafts/schedules, and track delivery + read receipts in realtime.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-5">
          <Card className="border-primary/10 md:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Delivery</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <div>
                <div className="text-sm text-muted-foreground">Delivered</div>
                <div className="text-3xl font-bold text-primary">{analytics.delivered}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Read</div>
                <div className="text-3xl font-bold text-accent">{analytics.read}</div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-primary/10 md:col-span-3">
            <CardHeader>
              <CardTitle className="text-base">Status breakdown</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              <div>
                <div className="text-sm text-muted-foreground">Drafts</div>
                <div className="text-3xl font-bold">{analytics.drafts}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Scheduled</div>
                <div className="text-3xl font-bold">{analytics.scheduled}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Sent</div>
                <div className="text-3xl font-bold text-success">{analytics.sent}</div>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      <Card className="border-primary/10">
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-2">
            <span>Compose</span>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => {
                qc.invalidateQueries({ queryKey: ["admin", "notifications"] });
                qc.invalidateQueries({ queryKey: ["admin", "notification-recipients"] });
              }}
              disabled={loading}
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </CardTitle>
          <CardDescription>Create a draft, schedule it, or send immediately.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((v) => createNotificationMutation.mutate(v))} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Attendance reminder" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Action</FormLabel>
                      <FormControl>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sent">Send now</SelectItem>
                            <SelectItem value="draft">Save draft</SelectItem>
                            <SelectItem value="scheduled">Schedule</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="body"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Message</FormLabel>
                    <FormControl>
                      <Textarea rows={5} placeholder="Write your notification…" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="targetMode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target type</FormLabel>
                      <FormControl>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="role">Role</SelectItem>
                            <SelectItem value="user">Specific user</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {form.watch("targetMode") === "role" ? (
                  <FormField
                    control={form.control}
                    name="targetRole"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <FormControl>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="student">Students</SelectItem>
                              <SelectItem value="admin">Admins</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : (
                  <FormField
                    control={form.control}
                    name="targetUserId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>User</FormLabel>
                        <FormControl>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a user" />
                            </SelectTrigger>
                            <SelectContent>
                              {(profilesQuery.data ?? [])
                                .filter((p) => !p.is_deleted)
                                .slice(0, 200)
                                .map((p) => (
                                  <SelectItem key={p.user_id} value={p.user_id}>
                                    {p.name} • {p.email}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="scheduledFor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <CalendarClock className="h-4 w-4 text-muted-foreground" />
                        Schedule time
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          value={field.value ?? ""}
                          onChange={field.onChange}
                          disabled={form.watch("status") !== "scheduled"}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button type="submit" className="gap-2" disabled={loading}>
                  {form.watch("status") === "sent" ? (
                    <>
                      <Send className="h-4 w-4" />
                      Send
                    </>
                  ) : form.watch("status") === "scheduled" ? (
                    <>
                      <CalendarClock className="h-4 w-4" />
                      Schedule
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save draft
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => form.reset()}
                  disabled={loading}
                >
                  Reset
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="border-primary/10">
        <CardHeader>
          <CardTitle>History</CardTitle>
          <CardDescription>Filter and review past notifications with live delivery/read metrics.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[1fr,220px]">
            <Input
              value={historyFilters.q}
              onChange={(e) => setHistoryFilters((p) => ({ ...p, q: e.target.value }))}
              placeholder="Search history…"
            />
            <Select
              value={historyFilters.status}
              onValueChange={(v) => setHistoryFilters((p) => ({ ...p, status: v as any }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="draft">Drafts</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="rounded-lg border border-border/60 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead className="hidden md:table-cell">Target</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Delivery</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notificationsQuery.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                      Loading notifications…
                    </TableCell>
                  </TableRow>
                ) : filteredHistory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                      No notifications found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredHistory.map((n) => {
                    const s = formatStatus(n.status);
                    const stats = recipientStatsQuery.data?.[n.id] ?? { delivered: 0, read: 0 };
                    const targetLabel = n.target_user_id
                      ? "User"
                      : n.target_role
                        ? `Role: ${n.target_role}`
                        : "—";

                    return (
                      <TableRow key={n.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium leading-tight">{n.title}</span>
                            <span className="text-xs text-muted-foreground line-clamp-1">{n.body}</span>
                            {n.status === "scheduled" && n.scheduled_for ? (
                              <span className="text-xs text-muted-foreground">
                                Scheduled: {new Date(n.scheduled_for).toLocaleString()}
                              </span>
                            ) : null}
                          </div>
                        </TableCell>

                        <TableCell className="hidden md:table-cell">
                          <span className="text-sm">{targetLabel}</span>
                        </TableCell>

                        <TableCell>
                          <Badge variant={s.variant}>{s.label}</Badge>
                        </TableCell>

                        <TableCell className="hidden md:table-cell">
                          <div className="text-sm">
                            <span className="font-medium">{stats.read}</span>
                            <span className="text-muted-foreground"> / {stats.delivered} read</span>
                          </div>
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {n.status !== "cancelled" ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-2"
                                disabled={loading}
                                onClick={() => {
                                  setEditing(n);
                                  editForm.reset({
                                    title: n.title,
                                    body: n.body,
                                    targetMode: n.target_user_id ? "user" : "role",
                                    targetRole: (n.target_user_id ? undefined : n.target_role ?? "student") as any,
                                    targetUserId: n.target_user_id ?? undefined,
                                    status: n.status as any,
                                    scheduledFor: n.scheduled_for ? toLocalDateTimeInput(n.scheduled_for) : undefined,
                                  });
                                  setEditOpen(true);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                                Edit
                              </Button>
                            ) : null}

                            {n.status !== "sent" ? (
                              <Button
                                size="sm"
                                className="gap-2"
                                onClick={() => sendNowMutation.mutate(n)}
                                disabled={loading}
                              >
                                <Send className="h-4 w-4" />
                                Send now
                              </Button>
                            ) : null}

                            {n.status !== "cancelled" ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-2 text-destructive"
                                disabled={loading}
                                onClick={() => cancelNotificationMutation.mutate(n.id)}
                              >
                                <Archive className="h-4 w-4" />
                                Cancel
                              </Button>
                            ) : null}
                          </div>
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

      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) setEditing(null);
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit notification</DialogTitle>
            <DialogDescription>
              Update content, targeting, and timing. Cancelling will archive the notification for students.
            </DialogDescription>
          </DialogHeader>

          <Form {...editForm}>
            <form
              className="space-y-4"
              onSubmit={editForm.handleSubmit((values) => {
                if (!editing) return;
                updateNotificationMutation.mutate({ id: editing.id, values });
              })}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={editForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Attendance reminder" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <FormControl>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sent">Sent</SelectItem>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="scheduled">Scheduled</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={editForm.control}
                name="body"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Message</FormLabel>
                    <FormControl>
                      <Textarea rows={6} placeholder="Write your notification…" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 md:grid-cols-3">
                <FormField
                  control={editForm.control}
                  name="targetMode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target type</FormLabel>
                      <FormControl>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="role">Role</SelectItem>
                            <SelectItem value="user">Specific user</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {editForm.watch("targetMode") === "role" ? (
                  <FormField
                    control={editForm.control}
                    name="targetRole"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <FormControl>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="student">Students</SelectItem>
                              <SelectItem value="admin">Admins</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : (
                  <FormField
                    control={editForm.control}
                    name="targetUserId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>User</FormLabel>
                        <FormControl>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a user" />
                            </SelectTrigger>
                            <SelectContent>
                              {(profilesQuery.data ?? [])
                                .filter((p) => !p.is_deleted)
                                .slice(0, 200)
                                .map((p) => (
                                  <SelectItem key={p.user_id} value={p.user_id}>
                                    {p.name} • {p.email}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={editForm.control}
                  name="scheduledFor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <CalendarClock className="h-4 w-4 text-muted-foreground" />
                        Schedule time
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          value={field.value ?? ""}
                          onChange={field.onChange}
                          disabled={editForm.watch("status") !== "scheduled"}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                  Close
                </Button>
                <Button type="submit" disabled={updateNotificationMutation.isPending}>
                  Save changes
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
