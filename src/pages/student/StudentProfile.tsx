import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Camera, LogOut, Save, UserRound, KeyRound, ShieldAlert, Monitor, LogOutIcon, Sparkles } from "lucide-react";
import WhatsNewModal from "@/components/whats-new/WhatsNewModal";
import { APP_VERSION } from "@/config/version";

import { supabase } from "@/integrations/supabase/client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
      if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message ?? "Invalid profile");
      }

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
      // Global signout revokes all refresh tokens for this user.
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

      // Re-authenticate to validate current password
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

  const title = useMemo(() => "Profile", []);

  return (
    <main className="container mx-auto px-4 py-8">
      <header className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <UserRound className="h-6 w-6 text-primary" />
            {title}
            {profileQuery.data?.is_verified ? (
              <span
                className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground"
                aria-label="Verified"
                title="Verified"
              >
                <span className="sr-only">Verified</span>
                <svg
                  viewBox="0 0 24 24"
                  className="h-3.5 w-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </span>
            ) : null}
          </h1>
          <p className="mt-2 text-muted-foreground">Update your basic details. Email is read-only.</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={handleLogout}>
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </header>

      <Card className="border-primary/10">
        <CardHeader>
          <CardTitle>Student Profile</CardTitle>
          <CardDescription>Your information used across the app.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : profileQuery.isError ? (
            <div className="text-sm text-muted-foreground">Couldn’t load profile.</div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <Avatar className="h-14 w-14">
                    <AvatarImage src={profileQuery.data?.avatar_url ?? undefined} alt="Profile photo" />
                    <AvatarFallback>{(form.name || "U").slice(0, 1).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">Profile photo</div>
                    <div className="text-xs text-muted-foreground">JPG/PNG recommended.</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      uploadAvatarMutation.mutate(f);
                      // allow selecting the same file again
                      e.currentTarget.value = "";
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-2"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploadAvatarMutation.isPending}
                  >
                    <Camera className="h-4 w-4" />
                    Upload photo
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Full name</label>
                <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input value={email} disabled />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Phone</label>
                <Input value={form.phone ?? ""} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Student ID</label>
                <Input
                  value={form.student_id ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, student_id: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Department</label>
                <Input
                  value={form.department ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Class</label>
                <Input
                  value={form.class_name ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, class_name: e.target.value }))}
                />
              </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              className="gap-2"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || loading}
            >
              <Save className="h-4 w-4" />
              Save changes
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="border-primary/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              Change Password
            </CardTitle>
            <CardDescription>For security, confirm your current password.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Current password</label>
              <Input
                type="password"
                value={pwForm.currentPassword}
                onChange={(e) => setPwForm((p) => ({ ...p, currentPassword: e.target.value }))}
                autoComplete="current-password"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">New password</label>
              <Input
                type="password"
                value={pwForm.newPassword}
                onChange={(e) => setPwForm((p) => ({ ...p, newPassword: e.target.value }))}
                autoComplete="new-password"
              />
              <p className="text-xs text-muted-foreground">Minimum 8 characters.</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Confirm new password</label>
              <Input
                type="password"
                value={pwForm.confirmPassword}
                onChange={(e) => setPwForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                autoComplete="new-password"
              />
            </div>
            <div className="flex items-center justify-end">
              <Button
                type="button"
                className="gap-2"
                onClick={() => changePasswordMutation.mutate()}
                disabled={changePasswordMutation.isPending || loading}
              >
                <Save className="h-4 w-4" />
                Update password
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-accent/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-accent" />
              Account Controls
            </CardTitle>
            <CardDescription>Manage sessions and request account deletion.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-xl border border-border/40 bg-card/40 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium flex items-center gap-2">
                    <Monitor className="h-4 w-4" />
                    Session / device
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {sessionQuery.data?.expires_at
                      ? `Expires: ${new Date(sessionQuery.data.expires_at * 1000).toLocaleString()}`
                      : "Session info unavailable"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 break-words">{typeof navigator !== "undefined" ? navigator.userAgent : ""}</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  onClick={() => logoutEverywhereMutation.mutate()}
                  disabled={logoutEverywhereMutation.isPending}
                >
                  <LogOutIcon className="h-4 w-4" />
                  Logout everywhere
                </Button>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Note: device/session listing is limited to your current session in this app.
              </p>
            </div>

            <div className="rounded-xl border border-border/40 bg-card/40 p-4">
              <p className="text-sm font-medium">Delete account request</p>
              <p className="text-xs text-muted-foreground mt-1">
                This sends a request to the admin team; it does not immediately delete your account.
              </p>

              {deletionRequestQuery.data ? (
                <div className="mt-3 text-sm">
                  <p>
                    <span className="text-muted-foreground">Status:</span> {deletionRequestQuery.data.status}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Requested: {new Date(deletionRequestQuery.data.created_at).toLocaleString()}
                  </p>
                  {deletionRequestQuery.data.admin_note ? (
                    <p className="text-xs text-muted-foreground mt-1">Admin note: {deletionRequestQuery.data.admin_note}</p>
                  ) : null}
                </div>
              ) : (
                <div className="mt-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Reason (optional)</label>
                    <Textarea
                      value={deleteReason}
                      onChange={(e) => setDeleteReason(e.target.value)}
                      placeholder="Tell us why you're requesting deletion (optional)"
                      rows={3}
                    />
                  </div>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button type="button" variant="destructive" className="mt-3">
                        Request account deletion
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Request account deletion?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will submit a deletion request to admins. You can continue using the app until it’s processed.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => requestDeletionMutation.mutate()}
                          disabled={requestDeletionMutation.isPending}
                        >
                          Submit request
                        </AlertDialogAction>
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
      <Card className="mt-6 border-border/50">
        <CardContent className="py-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-premium" /> Platform Updates
            </p>
            <p className="text-xs text-muted-foreground">Version {APP_VERSION}</p>
          </div>
          <WhatsNewModalTrigger />
        </CardContent>
      </Card>
    </main>
  );
}

function WhatsNewModalTrigger() {
  const [show, setShow] = useState(false);
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setShow(true)}>View Platform Updates</Button>
      {show && <WhatsNewModal manualOpen onManualClose={() => setShow(false)} />}
    </>
  );
}
