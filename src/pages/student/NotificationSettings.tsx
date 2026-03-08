import { useEffect, useState, type ElementType } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, BookOpen, Megaphone, Trophy, AlertTriangle, Settings2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageContainer } from "@/layout/PageContainer";
import { PageHeader } from "@/layout/PageHeader";
import { GlassCard } from "@/components/ui/GlassCard";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Prefs = {
  announcements: boolean;
  lecture_alerts: boolean;
  achievement_alerts: boolean;
  attendance_alerts: boolean;
  system_updates: boolean;
};

const DEFAULT_PREFS: Prefs = {
  announcements: true,
  lecture_alerts: true,
  achievement_alerts: true,
  attendance_alerts: true,
  system_updates: true,
};

const PREF_ROWS: Array<{ key: keyof Prefs; label: string; desc: string; icon: ElementType; tone: string }> = [
  { key: "lecture_alerts", label: "Lecture alerts", desc: "Lecture start reminders and live status updates", icon: BookOpen, tone: "text-accent" },
  { key: "announcements", label: "Announcements", desc: "Admin and platform announcements", icon: Megaphone, tone: "text-primary" },
  { key: "achievement_alerts", label: "Achievement alerts", desc: "Milestones, rewards, and unlocked badges", icon: Trophy, tone: "text-premium" },
  { key: "attendance_alerts", label: "Attendance alerts", desc: "Warnings related to low attendance", icon: AlertTriangle, tone: "text-warning" },
  { key: "system_updates", label: "System updates", desc: "Maintenance and app update notices", icon: Settings2, tone: "text-muted-foreground" },
];

export default function NotificationSettings() {
  const qc = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const prefsQuery = useQuery({
    queryKey: ["notification_preferences", userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<Prefs> => {
      if (!userId) return DEFAULT_PREFS;
      const { data, error } = await supabase
        .from("notification_preferences")
        .select("announcements,lecture_alerts,achievement_alerts,attendance_alerts,system_updates")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return DEFAULT_PREFS;
      return { ...DEFAULT_PREFS, ...(data as Prefs) };
    },
    staleTime: 30_000,
  });

  const savePrefs = useMutation({
    mutationFn: async (prefs: Prefs) => {
      if (!userId) throw new Error("You must be logged in");
      const { error } = await supabase.from("notification_preferences").upsert(
        {
          user_id: userId,
          ...prefs,
        },
        { onConflict: "user_id" }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notification_preferences", userId] });
      toast.success("Notification settings saved");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to save settings");
    },
  });

  const prefs = prefsQuery.data ?? DEFAULT_PREFS;

  const toggle = (key: keyof Prefs) => {
    savePrefs.mutate({ ...prefs, [key]: !prefs[key] });
  };

  return (
    <PageContainer>
      <PageHeader
        title="Notification Settings"
        subtitle="Control which alerts appear in your notification center and inbox."
      />

      <section className="space-y-6">
        <GlassCard hover={false} className="space-y-1.5">
          <p className="text-sm font-semibold text-foreground">In-App Notification Preferences</p>
          <p className="text-xs text-muted-foreground">
            Changes apply immediately and are synced to your account.
          </p>
          <div className="mt-2 inline-flex items-center gap-1 rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-[11px] font-semibold text-success">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Native notifications enabled
          </div>
        </GlassCard>

        <GlassCard hover={false} className="divide-y divide-border-subtle p-0">
          {prefsQuery.isLoading
            ? Array.from({ length: 5 }).map((_, idx) => (
                <div key={idx} className="flex items-center justify-between gap-3 px-4 py-4">
                  <Skeleton className="h-10 w-44" />
                  <Skeleton className="h-6 w-11 rounded-full" />
                </div>
              ))
            : PREF_ROWS.map((row) => {
                const Icon = row.icon;
                return (
                  <div key={row.key} className="flex min-h-16 items-center justify-between gap-3 px-4 py-4">
                    <div className="flex items-start gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-2">
                        <Icon className={cn("h-4 w-4", row.tone)} />
                      </span>
                      <div>
                        <Label htmlFor={`notif-${row.key}`} className="cursor-pointer text-sm font-semibold text-foreground">
                          {row.label}
                        </Label>
                        <p className="mt-0.5 text-xs text-muted-foreground">{row.desc}</p>
                      </div>
                    </div>
                    <Switch
                      id={`notif-${row.key}`}
                      checked={prefs[row.key]}
                      onCheckedChange={() => toggle(row.key)}
                      disabled={savePrefs.isPending}
                    />
                  </div>
                );
              })}
        </GlassCard>

        {savePrefs.isPending ? <p className="text-xs text-muted-foreground">Saving changes…</p> : null}
      </section>
    </PageContainer>
  );
}
