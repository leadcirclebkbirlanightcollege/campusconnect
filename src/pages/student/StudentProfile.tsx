import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Camera, Save, KeyRound, ShieldAlert, Monitor, LogOutIcon, Sparkles, BarChart3, Award, Trophy, Flame } from "lucide-react";
import { motion } from "framer-motion";
import WhatsNewModal from "@/components/whats-new/WhatsNewModal";
import { cn } from "@/lib/utils";

import { useStudentIntelligence } from "@/hooks/use-intelligence";
import { useGrowthInsights } from "@/hooks/use-growth-insights";
import { TIER_CONFIG } from "@/lib/intelligenceEngine";
import { IntelligenceBar } from "@/components/ui/design-system";
import { Progress } from "@/components/ui/progress";
import { APP_VERSION } from "@/config/version";

import { supabase } from "@/integrations/supabase/client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

const profileSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(100, "Name is too long"),
  phone: z.string().trim().max(30, "Phone is too long").optional(),
  student_id: z.string().trim().max(50, "Student ID is too long").optional(),
  department: z.string().trim().max(100, "Department is too long").optional(),
  class_name: z.string().trim().max(50, "Class is too long").optional(),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "New password must be at least 8 characters").max(72, "Password too long"),
    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ProfileForm = z.infer<typeof profileSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;

type ProfileRow = {
  name: string;
  email: string;
  phone: string | null;
  student_id: string | null;
  department: string | null;
  class_name: string | null;
  avatar_url: string | null;
  is_verified: boolean;
};

type DeletionRequestRow = {
  id: string;
  status: "requested" | "approved" | "rejected" | "completed";
  created_at: string;
  reason: string | null;
  admin_note: string | null;
};

export default function StudentProfile() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [form, setForm] = useState<ProfileForm>({
    name: "",
    phone: "",
    student_id: "",
    department: "",
    class_name: "",
  });

  const [pwForm, setPwForm] = useState<PasswordForm>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [deleteReason, setDeleteReason] = useState<string>("");

  const meQuery = useQuery({
    queryKey: ["student", "me"],
    queryFn: async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      if (!data.user) throw new Error("Not logged in");
      return data.user;
    },
  });

  const profileQuery = useQuery({
    queryKey: ["student", "profile", meQuery.data?.id],
    enabled: Boolean(meQuery.data?.id),
    queryFn: async (): Promise<ProfileRow | null> => {
      const uid = meQuery.data!.id;
      const { data, error } = await supabase
        .from("profiles")
        .select("name,email,phone,student_id,department,class_name,avatar_url,is_verified")
        .eq("user_id", uid)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as ProfileRow | null;
    },
  });

  const sessionQuery = useQuery({
    queryKey: ["student", "session"],
    queryFn: async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      return data.session ?? null;
    },
  });

  const deletionRequestQuery = useQuery({
    queryKey: ["student", "deletion_request", meQuery.data?.id],
    enabled: Boolean(meQuery.data?.id),
    queryFn: async (): Promise<DeletionRequestRow | null> => {
      const uid = meQuery.data!.id;
      const { data, error } = await supabase
        .from("account_deletion_requests")
        .select("id,status,created_at,reason,admin_note")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as DeletionRequestRow | null;
    },
  });

  useEffect(() => {
    const p = profileQuery.data;
    if (!p) return;
    setForm({
      name: p.name ?? "",
      phone: p.phone ?? "",
      student_id: p.student_id ?? "",
      department: p.department ?? "",
      class_name: p.class_name ?? "",
    });
  }, [profileQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const parsed = profileSchema.safeParse(form);
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid profile");
      const uid = meQuery.data?.id;
      if (!uid) throw new Error("Not logged in");
      const { error } = await supabase
        .from("profiles")
        .update({
          name: parsed.data.name,
          phone: parsed.data.phone?.trim() || null,
          student_id: parsed.data.student_id?.trim() || null,
          department: parsed.data.department?.trim() || null,
          class_name: parsed.data.class_name?.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", uid);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Profile updated");
      await profileQuery.refetch();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to update profile"),
  });

  const uploadAvatarMutation = useMutation({
    mutationFn: async (file: File) => {
      const uid = meQuery.data?.id;
      if (!uid) throw new Error("Not logged in");
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
      const safeExt = ext || "jpg";
      const objectPath = `${uid}/avatar-${Date.now()}.${safeExt}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(objectPath, file, { upsert: true, contentType: file.type || undefined });
      if (uploadError) throw uploadError;
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(objectPath);
      const avatarUrl = pub?.publicUrl;
      if (!avatarUrl) throw new Error("Failed to create avatar URL");
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
        .eq("user_id", uid);
      if (updateError) throw updateError;
    },
    onSuccess: async () => {
      toast.success("Profile photo updated");
      await profileQuery.refetch();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Upload failed"),
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth", { replace: true });
  };

  const logoutEverywhereMutation = useMutation({
    mutationFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await supabase.auth.signOut({ scope: "global" } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Logged out everywhere");
      navigate("/auth", { replace: true });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to logout everywhere"),
  });

  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      const parsed = passwordSchema.safeParse(pwForm);
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid password");
      const emailForReauth = profileQuery.data?.email;
      if (!emailForReauth) throw new Error("Email not available");
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: emailForReauth,
        password: parsed.data.currentPassword,
      });
      if (reauthError) throw new Error("Current password is incorrect");
      const { error: updateError } = await supabase.auth.updateUser({ password: parsed.data.newPassword });
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      toast.success("Password updated");
      setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to update password"),
  });

  const requestDeletionMutation = useMutation({
    mutationFn: async () => {
      const uid = meQuery.data?.id;
      if (!uid) throw new Error("Not logged in");
      const reason = deleteReason.trim();
      if (reason.length > 500) throw new Error("Reason is too long (max 500 chars)");
      const { error } = await supabase.from("account_deletion_requests").insert({
        user_id: uid,
        reason: reason.length ? reason : null,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Deletion request submitted");
      setDeleteReason("");
      await deletionRequestQuery.refetch();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to submit request"),
  });

  const email = profileQuery.data?.email ?? "";
  const loading = meQuery.isLoading || profileQuery.isLoading;

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 rounded-xl" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  // ── intelligence data ──
  const intel   = useStudentIntelligence();
  const growth  = useGrowthInsights();
  const streakQ = useQuery({
    queryKey: ["student", "my-streak-profile"],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_my_streak");
      return (data as any) ?? null;
    },
  });
  const totalPtsQ = useQuery({
    queryKey: ["student", "points-total-profile"],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_my_points_total");
      return Number(data ?? 0);
    },
  });
  const achieveQ = useQuery({
    queryKey: ["student", "my-achievements-profile"],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_my_achievements", { p_limit: 50 });
      return ((data as unknown as any[]) ?? []);
    },
  });

  const tierKey  = (intel.data?.tier ?? "bronze") as keyof typeof TIER_CONFIG;
  const tierData = TIER_CONFIG[tierKey];

  return (
    <div className="space-y-6">

      {/* ── Performance Portfolio Banner ──────────────── */}
      <div className="rounded-2xl border border-border-subtle bg-surface-1 overflow-hidden shadow-sm">
        <div className="h-1" style={{ background: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--premium)))" }} />
        <div className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <BarChart3 className="h-4.5 w-4.5 text-primary" />
            </div>
            <div>
              <p className="text-[14px] font-semibold text-foreground">Performance Portfolio</p>
              <p className="text-[11px] text-muted-foreground">Your academic intelligence overview</p>
            </div>
            {tierData && (
              <span className={cn("ml-auto inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border", tierData.color, tierData.bg, tierData.border)}>
                {tierData.label} Tier
              </span>
            )}
          </div>

          {/* KPI strip */}
          <div className="grid grid-cols-4 gap-3 mb-5">
            {[
              { label: "Points",       value: totalPtsQ.data?.toLocaleString() ?? "—",  icon: <Flame className="h-3.5 w-3.5" />,  color: "text-warning" },
              { label: "Streak",       value: `${streakQ.data?.current_streak ?? 0}d`,  icon: <Trophy className="h-3.5 w-3.5" />, color: "text-premium" },
              { label: "Achievements", value: String(achieveQ.data?.length ?? 0),        icon: <Award className="h-3.5 w-3.5" />,  color: "text-primary" },
              { label: "30d Att.",     value: `${growth.data?.last_30_day_attendance_pct ?? 0}%`, icon: <BarChart3 className="h-3.5 w-3.5" />, color: "text-success" },
            ].map(({ label, value, icon, color }) => (
              <div key={label} className="rounded-xl border border-border-subtle bg-surface-2 p-3 text-center">
                <span className={cn("flex justify-center mb-1", color)}>{icon}</span>
                <p className="text-[14px] font-bold text-foreground tabular-nums">{value}</p>
                <p className="text-[9px] uppercase tracking-widest text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>

          {/* Intelligence bars */}
          {intel.data && (
            <div className="space-y-3 mb-4">
              <IntelligenceBar value={intel.data.attendanceConsistency} label="Attendance Consistency" />
              <IntelligenceBar value={intel.data.behaviourReliability}  label="Behaviour Reliability" />
              <IntelligenceBar value={intel.data.engagementIndex}       label="Engagement Index" />
            </div>
          )}

          {/* Links */}
          <div className="flex gap-2 flex-wrap">
            <Button asChild variant="outline" size="sm" className="text-xs gap-1.5 h-8">
              <Link to="/app/achievements"><Award className="h-3.5 w-3.5" /> Achievements</Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="text-xs gap-1.5 h-8">
              <Link to="/app/attendance"><BarChart3 className="h-3.5 w-3.5" /> Attendance</Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="text-xs gap-1.5 h-8">
              <Link to="/app/leaderboard"><Trophy className="h-3.5 w-3.5" /> Leaderboard</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Two column: Personal + Academic */}
      <div className="grid gap-6 lg:grid-cols-[1fr,1fr]">
        {/* Personal Information */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Personal Information</CardTitle>
              <Button
                type="button"
                size="sm"
                className="gap-1.5 h-8 text-xs"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
              >
                <Save className="h-3.5 w-3.5" />
                Save
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Avatar */}
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src={profileQuery.data?.avatar_url ?? undefined} alt="Profile photo" />
                <AvatarFallback>{(form.name || "U").slice(0, 1).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    uploadAvatarMutation.mutate(f);
                    e.currentTarget.value = "";
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5 h-7 text-xs"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploadAvatarMutation.isPending}
                >
                  <Camera className="h-3 w-3" />
                  Upload photo
                </Button>
              </div>
            </div>

            {/* Form fields */}
            <div className="grid gap-3">
              <FieldRow label="Full name">
                <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className="h-9" />
              </FieldRow>
              <FieldRow label="Email">
                <Input value={email} disabled className="h-9" />
              </FieldRow>
              <FieldRow label="Phone">
                <Input value={form.phone ?? ""} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} className="h-9" />
              </FieldRow>
            </div>
          </CardContent>
        </Card>

        {/* Academic Summary */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-medium">Academic Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              <FieldRow label="Student ID">
                <Input value={form.student_id ?? ""} onChange={(e) => setForm((p) => ({ ...p, student_id: e.target.value }))} className="h-9" />
              </FieldRow>
              <FieldRow label="Department">
                <Input value={form.department ?? ""} onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))} className="h-9" />
              </FieldRow>
              <FieldRow label="Class">
                <Input value={form.class_name ?? ""} onChange={(e) => setForm((p) => ({ ...p, class_name: e.target.value }))} className="h-9" />
              </FieldRow>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Security row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Change Password */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-muted-foreground" />
              Change Password
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <FieldRow label="Current password">
              <Input type="password" value={pwForm.currentPassword} onChange={(e) => setPwForm((p) => ({ ...p, currentPassword: e.target.value }))} autoComplete="current-password" className="h-9" />
            </FieldRow>
            <FieldRow label="New password">
              <Input type="password" value={pwForm.newPassword} onChange={(e) => setPwForm((p) => ({ ...p, newPassword: e.target.value }))} autoComplete="new-password" className="h-9" />
            </FieldRow>
            <FieldRow label="Confirm">
              <Input type="password" value={pwForm.confirmPassword} onChange={(e) => setPwForm((p) => ({ ...p, confirmPassword: e.target.value }))} autoComplete="new-password" className="h-9" />
            </FieldRow>
            <div className="flex justify-end">
              <Button type="button" size="sm" className="gap-1.5 h-8 text-xs" onClick={() => changePasswordMutation.mutate()} disabled={changePasswordMutation.isPending}>
                <Save className="h-3.5 w-3.5" />
                Update password
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Account Controls */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-muted-foreground" />
              Account Controls
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Session info */}
            <div className="rounded-lg border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium flex items-center gap-1.5">
                  <Monitor className="h-3.5 w-3.5" />
                  Session
                </p>
                <Button type="button" variant="outline" size="sm" className="gap-1.5 h-7 text-xs" onClick={() => logoutEverywhereMutation.mutate()} disabled={logoutEverywhereMutation.isPending}>
                  <LogOutIcon className="h-3 w-3" />
                  Logout everywhere
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {sessionQuery.data?.expires_at
                  ? `Expires: ${new Date(sessionQuery.data.expires_at * 1000).toLocaleString()}`
                  : "Session info unavailable"}
              </p>
            </div>

            {/* Deletion request */}
            <div className="rounded-lg border p-3 space-y-2">
              <p className="text-sm font-medium">Delete account request</p>
              <p className="text-xs text-muted-foreground">Sends a request to the admin team.</p>

              {deletionRequestQuery.data ? (
                <div className="text-sm space-y-1">
                  <p><span className="text-muted-foreground">Status:</span> {deletionRequestQuery.data.status}</p>
                  <p className="text-xs text-muted-foreground">Requested: {new Date(deletionRequestQuery.data.created_at).toLocaleString()}</p>
                  {deletionRequestQuery.data.admin_note && (
                    <p className="text-xs text-muted-foreground">Admin note: {deletionRequestQuery.data.admin_note}</p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <Textarea value={deleteReason} onChange={(e) => setDeleteReason(e.target.value)} placeholder="Reason (optional)" rows={2} className="text-sm" />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button type="button" variant="destructive" size="sm" className="text-xs">
                        Request account deletion
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Request account deletion?</AlertDialogTitle>
                        <AlertDialogDescription>This will submit a deletion request to admins. You can continue using the app until it's processed.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => requestDeletionMutation.mutate()} disabled={requestDeletionMutation.isPending}>Submit request</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Platform Updates */}
      <Card>
        <CardContent className="py-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-muted-foreground" /> Platform Updates
            </p>
            <p className="text-xs text-muted-foreground">Version {APP_VERSION}</p>
          </div>
          <WhatsNewModalTrigger />
        </CardContent>
      </Card>
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function WhatsNewModalTrigger() {
  const [show, setShow] = useState(false);
  return (
    <>
      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setShow(true)}>View Updates</Button>
      {show && <WhatsNewModal manualOpen onManualClose={() => setShow(false)} />}
    </>
  );
}
