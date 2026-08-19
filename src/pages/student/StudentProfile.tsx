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
  ChevronRight,
  Grid3X3,
  HelpCircle,
  Info,
  KeyRound,
  Lock,
  LogOut,
  Megaphone,
  MessageSquareHeart,
  MonitorSmartphone,
  Moon,
  Palette,
  Pencil,
  Save,
  Shield,
  Sparkles,
  Trophy,
  UserRound,
} from "@/components/icons";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { useThemeContext } from "@/providers/ThemeProvider";
import { PageContainer } from "@/layout/PageContainer";
import { ModuleHero, HeroOverlap } from "@/layout/ModuleHero";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { APP_VERSION } from "@/config/version";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type ProfileForm = { name: string; email: string };

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

type SheetKey = "edit" | "notifications" | "appearance" | "security" | "privacy" | "about" | null;

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

/* ── Reusable settings row ─────────────────────────────────────── */
function SettingsRow({
  icon: Icon,
  label,
  hint,
  onClick,
  danger,
  trailing,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  hint?: string;
  onClick?: () => void;
  danger?: boolean;
  trailing?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
        "hover:bg-surface-2 active:bg-surface-2",
      )}
    >
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
          danger ? "bg-danger/10 text-danger" : "bg-primary/10 text-primary",
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn("block truncate text-[13.5px] font-semibold", danger ? "text-danger" : "text-foreground")}>
          {label}
        </span>
        {hint && <span className="mt-0.5 block truncate text-[11.5px] text-muted-foreground">{hint}</span>}
      </span>
      {trailing ?? <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
    </button>
  );
}

function SettingsGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="px-1 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{title}</h2>
      <div className="overflow-hidden rounded-[20px] border border-border-subtle bg-surface-1 shadow-[0_8px_24px_-18px_hsl(var(--foreground)/0.35)] divide-y divide-border-subtle">
        {children}
      </div>
    </section>
  );
}

function ToggleRow({
  icon: Icon,
  label,
  checked,
  disabled,
  onChange,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex min-h-[52px] items-center justify-between rounded-xl border border-border-subtle bg-surface-2 px-3">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-[13px] font-semibold text-foreground">{label}</span>
      </div>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onChange} />
    </div>
  );
}

export default function StudentProfile() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user, isLoading: authLoading } = useAuth();
  const { theme, setTheme } = useThemeContext();
  const { prefs: appPrefs, setPrefs: setAppPrefs } = useLocalAppPrefs();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [sheet, setSheet] = useState<SheetKey>(null);
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
        .select(
          "name,email,avatar_url,college_id,student_id,class_name,department,academic_year,approval_status,is_verified,created_at",
        )
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

  const pointsQuery = useQuery({
    queryKey: ["settings", "points", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_my_points_total");
      if (error) throw error;
      return Number(data ?? 0);
    },
    staleTime: 60_000,
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
      toast.success("Profile updated");
      setSheet(null);
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
      const { error } = await supabase
        .from("notification_preferences")
        .upsert({ user_id: user.id, ...next }, { onConflict: "user_id" });
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
    qc.clear();
    navigate("/auth", { replace: true });
  };

  const profile = profileQuery.data;
  const roleLabel = useMemo(() => {
    const role = roleQuery.data;
    if (role === "super_admin") return "Super Admin";
    if (role === "admin") return "Admin";
    if (role === "faculty") return "Faculty";
    return "Student";
  }, [roleQuery.data]);

  const notifPrefs = notificationQuery.data ?? DEFAULT_PREFS;

  const completion = useMemo(() => {
    const checks = [
      Boolean(profile?.name),
      Boolean(profile?.email),
      Boolean(profile?.avatar_url),
      Boolean(profile?.student_id),
      Boolean(profile?.class_name),
      Boolean(profile?.department),
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [profile]);

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString(undefined, { month: "short", year: "numeric" })
    : "—";

  if (authLoading || profileQuery.isLoading) {
    return (
      <PageContainer className="space-y-4" noPadding>
        <Skeleton className="h-56 w-full rounded-b-[28px]" />
        <div className="space-y-4 px-4">
          <Skeleton className="h-24 w-full rounded-[20px]" />
          <Skeleton className="h-40 w-full rounded-[20px]" />
          <Skeleton className="h-40 w-full rounded-[20px]" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="pb-28" noPadding withBottomNav>
      <ModuleHero
        tone="profile"
        eyebrow="My account"
        title={profile?.name ?? "Your profile"}
        subtitle={profile?.email ?? user?.email ?? undefined}
        stats={[
          { label: "Points", value: pointsQuery.data ?? 0 },
          { label: "Complete", value: `${completion}%` },
          { label: "Member since", value: memberSince },
        ]}
        action={
          <button
            type="button"
            onClick={() => setSheet("edit")}
            aria-label="Edit profile"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/20 bg-white/12 backdrop-blur-sm transition active:scale-95"
          >
            <Pencil className="h-4 w-4" />
          </button>
        }
      >
        <div className="mt-4 flex items-center gap-4">
          <div className="relative">
            <Avatar className="h-[72px] w-[72px] ring-2 ring-white/45 shadow-[0_12px_28px_-12px_rgba(0,0,0,0.5)]">
              <AvatarImage src={profile?.avatar_url ?? undefined} alt={profile?.name ?? "Profile"} />
              <AvatarFallback className="bg-white/20 text-lg font-bold text-white">
                {(profile?.name ?? "U").slice(0, 1).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              aria-label="Change avatar"
              className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-white text-foreground shadow-md ring-2 ring-white/70 transition active:scale-95"
            >
              <Camera className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center rounded-full bg-white/22 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wider ring-1 ring-white/25">
                {roleLabel}
              </span>
              {profile?.is_verified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[10.5px] font-semibold ring-1 ring-white/20">
                  <Shield className="h-3 w-3" /> Verified
                </span>
              )}
              {collegeQuery.data && (
                <span className="inline-flex max-w-[190px] items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[10.5px] font-semibold ring-1 ring-white/20">
                  <Building2 className="h-3 w-3" />
                  <span className="truncate">{collegeQuery.data}</span>
                </span>
              )}
            </div>
            <p className="mt-2 text-[11.5px] text-white/80">
              {[profile?.student_id, profile?.class_name, profile?.department].filter(Boolean).join(" • ") ||
                "Complete your profile to unlock everything"}
            </p>
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
      </ModuleHero>

      <HeroOverlap>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={SECTION_TRANSITION}
          className="space-y-5"
        >
          {/* Profile completion */}
          <div className="rounded-[20px] border border-border-subtle bg-surface-1 p-4 shadow-[0_10px_30px_-22px_hsl(var(--foreground)/0.5)]">
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-bold text-foreground">Profile completion</p>
              <p className="text-[13px] font-bold text-primary">{completion}%</p>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-3">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${completion}%` }}
                transition={{ duration: 0.5, ease: [0, 0, 0.2, 1] }}
                className="h-full rounded-full bg-primary"
              />
            </div>
            <p className="mt-2 text-[11.5px] text-muted-foreground">
              {completion === 100
                ? "Everything looks great — your profile is complete."
                : "Add a photo and your academic details to reach 100%."}
            </p>
          </div>

          {/* Account statistics */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Role", value: roleLabel },
              { label: "Status", value: profile?.approval_status === "approved" ? "Active" : "Pending" },
              { label: "Year", value: profile?.academic_year ?? "—" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-[18px] border border-border-subtle bg-surface-1 px-3 py-3 text-center"
              >
                <p className="truncate text-[15px] font-black text-foreground">{stat.value}</p>
                <p className="mt-0.5 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>

          <SettingsGroup title="Account">
            <SettingsRow icon={UserRound} label="Edit profile" hint="Name, email and photo" onClick={() => setSheet("edit")} />
            <SettingsRow icon={Lock} label="Privacy" hint="Control what others can see" onClick={() => setSheet("privacy")} />
            <SettingsRow icon={Shield} label="Security" hint="Password and active sessions" onClick={() => setSheet("security")} />
          </SettingsGroup>

          <SettingsGroup title="Preferences">
            <SettingsRow
              icon={Bell}
              label="Notifications"
              hint="Lectures, announcements and alerts"
              onClick={() => setSheet("notifications")}
            />
            <SettingsRow
              icon={Palette}
              label="Appearance"
              hint={theme === "dark" ? "Dark mode" : "Light mode"}
              onClick={() => setSheet("appearance")}
            />
          </SettingsGroup>

          <SettingsGroup title="Support">
            <SettingsRow icon={HelpCircle} label="Help & support" hint="Guides and contact" onClick={() => navigate("/help")} />
            <SettingsRow
              icon={MessageSquareHeart}
              label="Send feedback"
              hint="Tell us what to improve"
              onClick={() => navigate("/contact")}
            />
            <SettingsRow icon={Info} label="About Campus Connect" hint={`Version ${APP_VERSION}`} onClick={() => setSheet("about")} />
          </SettingsGroup>

          <SettingsGroup title="Session">
            <SettingsRow icon={LogOut} label="Log out" hint="Sign out of this device" danger onClick={handleSignOut} />
          </SettingsGroup>
        </motion.div>
      </HeroOverlap>

      {/* ── Edit profile sheet ─────────────────────────────────── */}
      <Sheet open={sheet === "edit"} onOpenChange={(o) => !o && setSheet(null)}>
        <SheetContent side="bottom" className="max-h-[86vh] overflow-y-auto">
          <SheetHeader className="text-left">
            <SheetTitle>Edit profile</SheetTitle>
            <SheetDescription>Update how your name and email appear across Campus Connect.</SheetDescription>
          </SheetHeader>

          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-3 rounded-[18px] border border-border-subtle bg-surface-2 p-3">
              <Avatar className="h-14 w-14">
                <AvatarImage src={profile?.avatar_url ?? undefined} alt={profile?.name ?? "Profile"} />
                <AvatarFallback className="bg-primary/10 font-bold text-primary">
                  {(form.name || "U").slice(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <Button type="button" variant="outline" className="h-10" onClick={() => fileRef.current?.click()}>
                <Camera className="h-4 w-4" />
                {uploadAvatarMutation.isPending ? "Uploading…" : "Change photo"}
              </Button>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="settings-name">Full name</Label>
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

            <Button
              type="button"
              className="h-11 w-full"
              disabled={saveAccountMutation.isPending}
              onClick={() => saveAccountMutation.mutate()}
            >
              <Save className="h-4 w-4" />
              {saveAccountMutation.isPending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Notifications sheet ────────────────────────────────── */}
      <Sheet open={sheet === "notifications"} onOpenChange={(o) => !o && setSheet(null)}>
        <SheetContent side="bottom" className="max-h-[86vh] overflow-y-auto">
          <SheetHeader className="text-left">
            <SheetTitle>Notifications</SheetTitle>
            <SheetDescription>Choose what Campus Connect can alert you about.</SheetDescription>
          </SheetHeader>
          <div className="mt-4 space-y-2">
            {[
              { key: "lecture_alerts", label: "Lecture alerts", icon: BookOpen },
              { key: "announcements", label: "Announcements", icon: Megaphone },
              { key: "achievement_alerts", label: "Achievements", icon: Trophy },
              { key: "attendance_alerts", label: "Attendance warnings", icon: AlertTriangle },
              { key: "system_updates", label: "System updates", icon: Sparkles },
            ].map((item) => {
              const key = item.key as keyof NotificationPrefs;
              return (
                <ToggleRow
                  key={item.key}
                  icon={item.icon}
                  label={item.label}
                  checked={notifPrefs[key]}
                  disabled={saveNotificationsMutation.isPending}
                  onChange={() => saveNotificationsMutation.mutate({ ...notifPrefs, [key]: !notifPrefs[key] })}
                />
              );
            })}
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Appearance sheet ───────────────────────────────────── */}
      <Sheet open={sheet === "appearance"} onOpenChange={(o) => !o && setSheet(null)}>
        <SheetContent side="bottom">
          <SheetHeader className="text-left">
            <SheetTitle>Appearance</SheetTitle>
            <SheetDescription>Personalise how the app looks and moves.</SheetDescription>
          </SheetHeader>
          <div className="mt-4 space-y-2">
            <ToggleRow
              icon={Moon}
              label="Dark mode"
              checked={theme === "dark"}
              onChange={(checked) => setTheme(checked ? "dark" : "light")}
            />
            <ToggleRow
              icon={Sparkles}
              label="Animations"
              checked={appPrefs.animationEnabled}
              onChange={(checked) => setAppPrefs((prev) => ({ ...prev, animationEnabled: checked }))}
            />
            <ToggleRow
              icon={Grid3X3}
              label="Compact view"
              checked={appPrefs.compactView}
              onChange={(checked) => setAppPrefs((prev) => ({ ...prev, compactView: checked }))}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Privacy sheet ──────────────────────────────────────── */}
      <Sheet open={sheet === "privacy"} onOpenChange={(o) => !o && setSheet(null)}>
        <SheetContent side="bottom" className="max-h-[86vh] overflow-y-auto">
          <SheetHeader className="text-left">
            <SheetTitle>Privacy</SheetTitle>
            <SheetDescription>How your information is used inside your college.</SheetDescription>
          </SheetHeader>
          <div className="mt-4 space-y-2 text-[12.5px] leading-relaxed text-muted-foreground">
            <p>
              Your profile, attendance and points are visible only to your own college's faculty and administrators.
              Leaderboards show your name, photo and points to classmates in your college.
            </p>
            <p>Documents and attachments you upload are stored in private buckets and require an authenticated link.</p>
          </div>
          <div className="mt-4 space-y-2">
            <Button variant="outline" className="h-11 w-full justify-start" onClick={() => navigate("/privacy")}>
              <Lock className="h-4 w-4" /> Read privacy policy
            </Button>
            <Button variant="outline" className="h-11 w-full justify-start" onClick={() => navigate("/terms")}>
              <Info className="h-4 w-4" /> Terms of use
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Security sheet ─────────────────────────────────────── */}
      <Sheet open={sheet === "security"} onOpenChange={(o) => !o && setSheet(null)}>
        <SheetContent side="bottom" className="max-h-[88vh] overflow-y-auto">
          <SheetHeader className="text-left">
            <SheetTitle>Security</SheetTitle>
            <SheetDescription>Change your password and review active sessions.</SheetDescription>
          </SheetHeader>

          <div className="mt-4 space-y-3">
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
              <Label htmlFor="confirm-password">Confirm new password</Label>
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
              className="h-11 w-full"
              onClick={() => updatePasswordMutation.mutate()}
              disabled={updatePasswordMutation.isPending}
            >
              <KeyRound className="h-4 w-4" />
              {updatePasswordMutation.isPending ? "Updating…" : "Change password"}
            </Button>

            <div className="rounded-[18px] border border-border-subtle bg-surface-2 p-3">
              <div className="mb-2 flex items-center gap-2">
                <MonitorSmartphone className="h-4 w-4 text-muted-foreground" />
                <p className="text-[12.5px] font-semibold text-foreground">Active sessions</p>
              </div>
              <div className="space-y-2">
                <div className="rounded-xl border border-border-subtle bg-surface-1 px-2.5 py-2">
                  <p className="text-[11px] text-muted-foreground">Current session</p>
                  <p className="mt-0.5 text-[12px] font-medium text-foreground">
                    {sessionQuery.data?.expires_at
                      ? `Expires ${new Date(sessionQuery.data.expires_at * 1000).toLocaleString()}`
                      : "Session active"}
                  </p>
                </div>
                {(activityQuery.data ?? []).slice(0, 3).map((entry) => (
                  <div key={entry.id} className="rounded-xl border border-border-subtle bg-surface-1 px-2.5 py-2">
                    <p className="line-clamp-1 text-[11px] text-muted-foreground">{entry.user_agent ?? "Unknown device"}</p>
                    <p className="mt-0.5 text-[12px] font-medium text-foreground">
                      {new Date(entry.created_at).toLocaleString()}
                    </p>
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
          </div>
        </SheetContent>
      </Sheet>

      {/* ── About sheet ────────────────────────────────────────── */}
      <Sheet open={sheet === "about"} onOpenChange={(o) => !o && setSheet(null)}>
        <SheetContent side="bottom">
          <SheetHeader className="text-left">
            <SheetTitle>About Campus Connect</SheetTitle>
            <SheetDescription>Version {APP_VERSION}</SheetDescription>
          </SheetHeader>
          <p className="mt-3 text-[12.5px] leading-relaxed text-muted-foreground">
            Campus Connect is your college's attendance, academics and community platform — lectures, points,
            leaderboards, events and E-Cell in one premium mobile app.
          </p>
          <p className="mt-3 text-[12px] text-muted-foreground">
            Designed &amp; proudly developed by the Department of Computer Science with ❤️
          </p>
        </SheetContent>
      </Sheet>
    </PageContainer>
  );
}
