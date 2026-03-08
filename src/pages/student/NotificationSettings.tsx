import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Bell, BookOpen, Megaphone, Trophy, AlertTriangle, Settings2, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

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
  {
    key: "announcements",
    label: "Announcements",
    desc: "College-wide announcements from admins",
    icon: Megaphone,
    iconColor: "text-primary",
  },
  {
    key: "lecture_reminders",
    label: "Lecture Reminders",
    desc: "Notifications about upcoming and live lectures",
    icon: BookOpen,
    iconColor: "text-accent",
  },
  {
    key: "achievements",
    label: "Achievements",
    desc: "When you unlock a new badge or milestone",
    icon: Trophy,
    iconColor: "text-warning",
  },
  {
    key: "attendance_alerts",
    label: "Attendance Alerts",
    desc: "Warnings about low attendance or missed lectures",
    icon: AlertTriangle,
    iconColor: "text-danger",
  },
  {
    key: "system_updates",
    label: "System Updates",
    desc: "Platform announcements and maintenance notices",
    icon: Settings2,
    iconColor: "text-muted-foreground",
  },
];

export default function NotificationSettings() {
  const qc = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);

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
        .upsert(
          { key: `notif_prefs_${userId}`, value: prefs as any, updated_by: userId },
          { onConflict: "key" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["student", "notif_prefs", userId] });
      toast.success("Preferences saved");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to save"),
  });

  const prefs = prefsQuery.data ?? DEFAULT_PREFS;
  const loading = prefsQuery.isLoading;

  const toggle = (key: keyof NotifPrefs) => {
    const updated = { ...prefs, [key]: !prefs[key] };
    updateMutation.mutate(updated);
  };

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h2 className="text-[18px] font-black text-foreground flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          Notification Settings
        </h2>
        <p className="text-[12px] text-muted-foreground mt-0.5">
          Choose which notifications you'd like to receive in your inbox.
        </p>
      </div>

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
