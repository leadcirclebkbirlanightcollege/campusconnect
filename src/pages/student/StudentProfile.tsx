import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Bell,
  BookOpen,
  Building2,
  Camera,
  Grid3X3,
  KeyRound,
  LogOut,
  Megaphone,
  MonitorSmartphone,
  Moon,
  Save,
  Shield,
  Sparkles,
  Trophy,
  UserRound,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { useThemeContext } from "@/providers/ThemeProvider";
import { PageContainer } from "@/layout/PageContainer";
import { PageHeader } from "@/layout/PageHeader";
import { GlassCard } from "@/components/ui/GlassCard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { GlowButton } from "@/components/ui/GlowButton";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type ProfileForm = {
  name: string;
  email: string;
};

type PasswordForm = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

type NotificationPrefs = {
  lecture_alerts: boolean;
  announcements: boolean;
  achievement_alerts: boolean;
  attendance_alerts: boolean;
  system_updates: boolean;
};

const DEFAULT_PREFS: NotificationPrefs = {
  lecture_alerts: true,
  announcements: true,
  achievement_alerts: true,
  attendance_alerts: true,
  system_updates: true,
};

const APP_PREFS_KEY = "campus_connect_app_prefs";

const SECTION_TRANSITION = { duration: 0.18, ease: [0, 0, 0.2, 1] as const };

function useLocalAppPrefs() {
  const [prefs, setPrefs] = useState({ animationEnabled: true, compactView: false });

  useEffect(() => {
    const raw = window.localStorage.getItem(APP_PREFS_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as { animationEnabled?: boolean; compactView?: boolean };
      setPrefs({
        animationEnabled: parsed.animationEnabled ?? true,
        compactView: parsed.compactView ?? false,
      });
    } catch {
      // ignore malformed local data
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(APP_PREFS_KEY, JSON.stringify(prefs));
    document.documentElement.classList.toggle("compact-view", prefs.compactView);
    document.documentElement.classList.toggle("reduced-motion", !prefs.animationEnabled);
  }, [prefs]);

  return { prefs, setPrefs };
}

export default function StudentProfile() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user, isLoading: authLoading } = useAuth();
  const { theme, setTheme } = useThemeContext();
  const { prefs: appPrefs, setPrefs: setAppPrefs } = useLocalAppPrefs();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [form, setForm] = useState<ProfileForm>({ name: "", email: "" });
  const [pwForm, setPwForm] = useState<PasswordForm>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const profileQuery = useQuery({
    queryKey: ["settings", "profile", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("name,email,avatar_url,college_id")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 60_000,
  });

  const roleQuery = useQuery({
    queryKey: ["settings", "role", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data?.role ?? "student";
    },
    staleTime: 120_000,
  });

  const collegeQuery = useQuery({
    queryKey: ["settings", "college", profileQuery.data?.college_id],
    enabled: Boolean(profileQuery.data?.college_id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("colleges")
        .select("college_name")
        .eq("id", profileQuery.data!.college_id)
        .maybeSingle();
      if (error) throw error;
      return data?.college_name ?? "Unknown college";
    },
    staleTime: 120_000,
  });

  const notificationQuery = useQuery({
    queryKey: ["notification_preferences", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<NotificationPrefs> => {
      const { data, error } = await supabase
        .from("notification_preferences")
        .select("lecture_alerts,announcements,achievement_alerts,attendance_alerts,system_updates")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data ? { ...DEFAULT_PREFS, ...data } : DEFAULT_PREFS;
    },
    staleTime: 30_000,
  });

  const sessionQuery = useQuery({
    queryKey: ["settings", "session"],
    queryFn: async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      return data.session;
    },
    staleTime: 30_000,
  });

  const activityQuery = useQuery({
    queryKey: ["settings", "active_devices", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("login_activity")
        .select("id,user_agent,created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!profileQuery.data) return;
    setForm({
      name: profileQuery.data.name ?? "",
      email: profileQuery.data.email ?? user?.email ?? "",
    });
  }, [profileQuery.data, user?.email]);

  const saveAccountMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("You must be logged in");
      const name = form.name.trim();
      const email = form.email.trim().toLowerCase();

      if (name.length < 2) throw new Error("Name must be at least 2 characters");
      if (!email.includes("@")) throw new Error("Please enter a valid email");

      const currentEmail = (profileQuery.data?.email ?? user.email ?? "").toLowerCase();
      if (email !== currentEmail) {
        const { error: authError } = await supabase.auth.updateUser({ email });
        if (authError) throw authError;
      }

      const { error } = await supabase
        .from("profiles")
        .update({ name, email, updated_at: new Date().toISOString() })
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Account settings updated");
      await qc.invalidateQueries({ queryKey: ["settings", "profile", user?.id] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to update account"),
  });

  const uploadAvatarMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!user?.id) throw new Error("You must be logged in");
      const ext = (file.name.split(".").pop() || "jpg").replace(/[^a-z0-9]/gi, "").toLowerCase();
      const path = `${user.id}/avatar-${Date.now()}.${ext || "jpg"}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage.from("avatars").getPublicUrl(path);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl.publicUrl, updated_at: new Date().toISOString() })
        .eq("user_id", user.id);
      if (updateError) throw updateError;
    },
    onSuccess: async () => {
      toast.success("Profile photo updated");
      await qc.invalidateQueries({ queryKey: ["settings", "profile", user?.id] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to upload photo"),
  });

  const saveNotificationsMutation = useMutation({
    mutationFn: async (next: NotificationPrefs) => {
      if (!user?.id) throw new Error("You must be logged in");
      const { error } = await supabase.from("notification_preferences").upsert(
        {
          user_id: user.id,
          ...next,
        },
        { onConflict: "user_id" }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notification_preferences", user?.id] });
      toast.success("Notification preferences saved");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to save preferences"),
  });

  const updatePasswordMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("You must be logged in");
      const email = profileQuery.data?.email ?? user.email;
      if (!email) throw new Error("Email not found");
      if (pwForm.newPassword.length < 8) throw new Error("New password must be at least 8 characters");
      if (pwForm.newPassword !== pwForm.confirmPassword) throw new Error("Passwords do not match");

      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email,
        password: pwForm.currentPassword,
      });
      if (reauthError) throw new Error("Current password is incorrect");

      const { error } = await supabase.auth.updateUser({ password: pwForm.newPassword });
      if (error) throw error;
    },
    onSuccess: () => {
      setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      toast.success("Password changed successfully");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to update password"),
  });

  const logoutOthersMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase.auth.signOut as any)({ scope: "others" });
      if (error) throw error;
    },
    onSuccess: () => toast.success("Logged out from other devices"),
    onError: () => toast.error("Unable to log out other devices"),
  });

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth", { replace: true });
  };

  const profile = profileQuery.data;
  const roleLabel = useMemo(() => {
    const role = roleQuery.data;
    if (role === "super_admin") return "Super Admin";
    if (role === "admin") return "Admin";
    return "Student";
  }, [roleQuery.data]);

  const notifPrefs = notificationQuery.data ?? DEFAULT_PREFS;

  if (authLoading || profileQuery.isLoading) {
    return (
      <PageContainer className="space-y-6">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-56 w-full rounded-2xl" />
      </PageContainer>
    );
  }

  return (
    <PageContainer className="space-y-6">
      <PageHeader
        title="Settings"
        subtitle="Your control center for profile, preferences, and security."
        gradient
      />

      <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={SECTION_TRANSITION}>
        <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-primary via-primary to-primary-glow px-5 pt-6 pb-14 text-primary-foreground shadow-[0_20px_50px_-20px_hsl(var(--primary)/0.55)]">
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/15 blur-3xl" />
          <div className="relative flex items-center gap-4">
            <div className="relative">
              <Avatar className="h-16 w-16 ring-2 ring-white/40">
                <AvatarImage src={profile?.avatar_url ?? undefined} alt={profile?.name ?? "Profile"} />
                <AvatarFallback className="bg-white/20 text-white font-bold">
                  {(profile?.name ?? "U").slice(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                aria-label="Change avatar"
                className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-white text-primary shadow-md ring-2 ring-white/70"
              >
                <Camera className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[18px] font-bold leading-tight">{profile?.name ?? "User"}</p>
              <p className="mt-0.5 truncate text-[12px] text-white/85">{profile?.email ?? user?.email ?? "No email"}</p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider text-white ring-1 ring-white/25">
                  {roleLabel}
                </span>
                {collegeQuery.data && (
                  <span className="inline-flex max-w-[180px] items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[10.5px] font-semibold text-white ring-1 ring-white/20">
                    <Building2 className="h-3 w-3" />
                    <span className="truncate">{collegeQuery.data}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) uploadAvatarMutation.mutate(file);
              event.currentTarget.value = "";
            }}
          />
        </div>
      </motion.section>


      <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ...SECTION_TRANSITION, delay: 0.03 }}>
        <GlassCard hover={false} className="space-y-4">
          <div className="flex items-center gap-2">
            <UserRound className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">Account Settings</h2>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="settings-name">Name</Label>
              <Input
                id="settings-name"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="settings-email">Email</Label>
              <Input
                id="settings-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                className="h-11"
              />
            </div>
          </div>

          <Button
            type="button"
            className="h-11 w-full"
            disabled={saveAccountMutation.isPending}
            onClick={() => saveAccountMutation.mutate()}
          >
            <Save className="h-4 w-4" />
            Save account details
          </Button>
        </GlassCard>
      </motion.section>

      <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ...SECTION_TRANSITION, delay: 0.06 }}>
        <GlassCard hover={false} className="space-y-4">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">Notification Settings</h2>
          </div>

          <div className="space-y-2">
            {[
              { key: "lecture_alerts", label: "Lecture alerts", icon: BookOpen },
              { key: "announcements", label: "Announcements", icon: Megaphone },
              { key: "achievement_alerts", label: "Achievement notifications", icon: Trophy },
              { key: "attendance_alerts", label: "Attendance warnings", icon: AlertTriangle },
            ].map((item) => {
              const Icon = item.icon;
              const key = item.key as keyof NotificationPrefs;
              return (
                <div key={item.key} className="flex min-h-12 items-center justify-between rounded-xl border border-border-subtle bg-surface-2 px-3">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-semibold text-foreground">{item.label}</span>
                  </div>
                  <Switch
                    checked={notifPrefs[key]}
                    disabled={saveNotificationsMutation.isPending}
                    onCheckedChange={() =>
                      saveNotificationsMutation.mutate({
                        ...notifPrefs,
                        [key]: !notifPrefs[key],
                      })
                    }
                  />
                </div>
              );
            })}
          </div>
        </GlassCard>
      </motion.section>

      <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ...SECTION_TRANSITION, delay: 0.09 }}>
        <GlassCard hover={false} className="space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">App Preferences</h2>
          </div>

          <div className="space-y-2">
            <div className="flex min-h-12 items-center justify-between rounded-xl border border-border-subtle bg-surface-2 px-3">
              <div className="flex items-center gap-2">
                <Moon className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-semibold text-foreground">Dark mode</span>
              </div>
              <Switch checked={theme === "dark"} onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")} />
            </div>

            <div className="flex min-h-12 items-center justify-between rounded-xl border border-border-subtle bg-surface-2 px-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-semibold text-foreground">Animations</span>
              </div>
              <Switch
                checked={appPrefs.animationEnabled}
                onCheckedChange={(checked) => setAppPrefs((prev) => ({ ...prev, animationEnabled: checked }))}
              />
            </div>

            <div className="flex min-h-12 items-center justify-between rounded-xl border border-border-subtle bg-surface-2 px-3">
              <div className="flex items-center gap-2">
                <Grid3X3 className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-semibold text-foreground">Compact view</span>
              </div>
              <Switch
                checked={appPrefs.compactView}
                onCheckedChange={(checked) => setAppPrefs((prev) => ({ ...prev, compactView: checked }))}
              />
            </div>
          </div>
        </GlassCard>
      </motion.section>

      <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ...SECTION_TRANSITION, delay: 0.12 }}>
        <GlassCard hover={false} className="space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">Security Settings</h2>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="current-password">Current password</Label>
              <Input
                id="current-password"
                type="password"
                value={pwForm.currentPassword}
                onChange={(e) => setPwForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                value={pwForm.newPassword}
                onChange={(e) => setPwForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-password">Confirm password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={pwForm.confirmPassword}
                onChange={(e) => setPwForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                className="h-11"
              />
            </div>

            <Button
              type="button"
              variant="outline"
              className="h-11 w-full"
              onClick={() => updatePasswordMutation.mutate()}
              disabled={updatePasswordMutation.isPending}
            >
              <KeyRound className="h-4 w-4" />
              Change password
            </Button>
          </div>

          <div className="rounded-xl border border-border-subtle bg-surface-2 p-3">
            <div className="mb-2 flex items-center gap-2">
              <MonitorSmartphone className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs font-semibold text-foreground">Active sessions</p>
            </div>

            <div className="space-y-2">
              <div className="rounded-lg border border-border-subtle bg-surface-1 px-2.5 py-2">
                <p className="text-[11px] text-muted-foreground">Current session</p>
                <p className="mt-0.5 text-xs font-medium text-foreground">
                  {sessionQuery.data?.expires_at
                    ? `Expires ${new Date(sessionQuery.data.expires_at * 1000).toLocaleString()}`
                    : "Session active"}
                </p>
              </div>

              {(activityQuery.data ?? []).slice(0, 3).map((entry) => (
                <div key={entry.id} className="rounded-lg border border-border-subtle bg-surface-1 px-2.5 py-2">
                  <p className="line-clamp-1 text-[11px] text-muted-foreground">{entry.user_agent ?? "Unknown device"}</p>
                  <p className="mt-0.5 text-xs font-medium text-foreground">{new Date(entry.created_at).toLocaleString()}</p>
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              className="mt-3 h-10 w-full"
              onClick={() => logoutOthersMutation.mutate()}
              disabled={logoutOthersMutation.isPending}
            >
              <LogOut className="h-4 w-4" />
              Log out from other devices
            </Button>
          </div>
        </GlassCard>
      </motion.section>

      <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ...SECTION_TRANSITION, delay: 0.15 }}>
        <GlassCard
          hover={false}
          className={cn("space-y-3 border-danger/20", "bg-gradient-to-br from-surface-2 via-surface-1 to-danger/5")}
        >
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-danger" />
            <h2 className="text-sm font-bold text-foreground">Logout</h2>
          </div>
          <GlowButton className="h-12 w-full" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" />
            Logout and return to sign in
          </GlowButton>
        </GlassCard>
      </motion.section>
    </PageContainer>
  );
}
