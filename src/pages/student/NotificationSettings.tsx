import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Bell, BookOpen, Megaphone, Trophy, AlertTriangle, Settings2,
  Loader2, Smartphone, CheckCircle2, XCircle, Info,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useWebPush } from "@/hooks/use-web-push";

type NotifPrefs = {
  announcements: boolean;
  lecture_reminders: boolean;
  achievements: boolean;
  attendance_alerts: boolean;
  system_updates: boolean;
};

const DEFAULT_PREFS: NotifPrefs = {
  announcements: true,
  lecture_reminders: true,
  achievements: true,
  attendance_alerts: true,
  system_updates: true,
};

const PREF_CONFIG: { key: keyof NotifPrefs; label: string; desc: string; icon: React.ElementType; iconColor: string }[] = [
  { key: "announcements",      label: "Announcements",     desc: "College-wide announcements from admins",             icon: Megaphone,      iconColor: "text-primary" },
  { key: "lecture_reminders",  label: "Lecture Reminders", desc: "Notifications about upcoming and live lectures",      icon: BookOpen,       iconColor: "text-accent" },
  { key: "achievements",       label: "Achievements",      desc: "When you unlock a new badge or milestone",            icon: Trophy,         iconColor: "text-warning" },
  { key: "attendance_alerts",  label: "Attendance Alerts", desc: "Warnings about low attendance or missed lectures",    icon: AlertTriangle,  iconColor: "text-danger" },
  { key: "system_updates",     label: "System Updates",    desc: "Platform announcements and maintenance notices",      icon: Settings2,      iconColor: "text-muted-foreground" },
];

export default function NotificationSettings() {
  const qc = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const { state: pushState, loading: pushLoading, isSupported: pushSupported, subscribe, unsubscribe } = useWebPush();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const prefsQuery = useQuery({
    queryKey: ["student", "notif_prefs", userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<NotifPrefs> => {
      if (!userId) return DEFAULT_PREFS;
      const { data } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", `notif_prefs_${userId}`)
        .maybeSingle();
      if (!data?.value) return DEFAULT_PREFS;
      return { ...DEFAULT_PREFS, ...(data.value as Partial<NotifPrefs>) };
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (prefs: NotifPrefs) => {
      if (!userId) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("platform_settings")
        .upsert({ key: `notif_prefs_${userId}`, value: prefs as any, updated_by: userId }, { onConflict: "key" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["student", "notif_prefs", userId] });
      toast.success("Preferences saved");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to save"),
  });

  const prefs   = prefsQuery.data ?? DEFAULT_PREFS;
  const loading = prefsQuery.isLoading;
  const toggle  = (key: keyof NotifPrefs) => updateMutation.mutate({ ...prefs, [key]: !prefs[key] });

  const handlePushToggle = async () => {
    if (pushState === "subscribed") {
      await unsubscribe();
      toast.success("Push notifications disabled");
    } else {
      await subscribe();
      if (pushState !== "denied") toast.success("Push notifications enabled!");
    }
  };

  // Status badge helper
  const PushStatusBadge = () => {
    if (pushState === "subscribed") return <Badge className="bg-success/15 text-success border-success/30 text-[10px]"><CheckCircle2 className="h-3 w-3 mr-1" />Active</Badge>;
    if (pushState === "denied")    return <Badge className="bg-danger/15 text-danger border-danger/30 text-[10px]"><XCircle className="h-3 w-3 mr-1" />Blocked</Badge>;
    if (pushState === "prompt")    return <Badge variant="outline" className="text-[10px] text-muted-foreground">Not enabled</Badge>;
    return <Badge variant="outline" className="text-[10px] text-muted-foreground">Unsupported</Badge>;
  };

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h2 className="text-[18px] font-black text-foreground flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          Notification Settings
        </h2>
        <p className="text-[12px] text-muted-foreground mt-0.5">
          Manage your in-app and device push notification preferences.
        </p>
      </div>

      {/* ── Push Notification Card ── */}
      <Card className="border-border-subtle bg-surface-1">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-[14px] font-bold flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-primary" />
              Device Push Notifications
            </CardTitle>
            <PushStatusBadge />
          </div>
          <CardDescription className="text-[12px]">
            Receive real notifications in your phone&apos;s notification tray — even when the app is closed.
            Works on Android, desktop Chrome, and installed PWA on iOS 16.4+.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {pushState === "denied" ? (
            <div className="flex items-start gap-2 rounded-lg bg-danger/8 border border-danger/20 p-3">
              <Info className="h-4 w-4 text-danger shrink-0 mt-0.5" />
              <p className="text-[11px] text-danger">
                Push notifications are blocked in your browser settings. To re-enable, go to your browser &rarr; Site Settings &rarr; Notifications and allow this site.
              </p>
            </div>
          ) : !pushSupported ? (
            <div className="flex items-start gap-2 rounded-lg bg-muted/50 border border-border-subtle p-3">
              <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-[11px] text-muted-foreground">
                Push notifications are not supported in this browser. Install the app or use Chrome/Firefox for full support.
              </p>
            </div>
          ) : (
            <Button
              variant={pushState === "subscribed" ? "outline" : "default"}
              size="sm"
              className="w-full text-[12px] font-semibold"
              onClick={handlePushToggle}
              disabled={pushLoading}
            >
              {pushLoading && <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />}
              {pushState === "subscribed" ? "Disable Push Notifications" : "Enable Push Notifications"}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* ── In-App Preferences Card ── */}
      <Card className="border-border-subtle bg-surface-1">
        <CardHeader className="pb-3">
          <CardTitle className="text-[14px] font-bold">In-App Notifications</CardTitle>
          <CardDescription className="text-[12px]">
            These appear in your Notification Center and Inbox.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-0 divide-y divide-border-subtle">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between py-4 gap-4">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-5 w-10 rounded-full" />
              </div>
            ))
          ) : (
            PREF_CONFIG.map(({ key, label, desc, icon: Icon, iconColor }) => (
              <div key={key} className="flex items-center justify-between py-4 gap-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 h-7 w-7 rounded-lg bg-surface-2 flex items-center justify-center shrink-0">
                    <Icon className={`h-3.5 w-3.5 ${iconColor}`} />
                  </div>
                  <div>
                    <Label htmlFor={`toggle-${key}`} className="text-[13px] font-semibold text-foreground cursor-pointer">
                      {label}
                    </Label>
                    <p className="text-[11px] text-muted-foreground">{desc}</p>
                  </div>
                </div>
                <Switch
                  id={`toggle-${key}`}
                  checked={prefs[key]}
                  onCheckedChange={() => toggle(key)}
                  disabled={updateMutation.isPending}
                  aria-label={`Toggle ${label}`}
                />
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {updateMutation.isPending && (
        <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Saving preferences…
        </div>
      )}
    </div>
  );
}
