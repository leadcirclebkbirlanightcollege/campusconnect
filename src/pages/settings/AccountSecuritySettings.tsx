import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { useTenant } from "@/providers/TenantProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { QRCodeSVG } from "qrcode.react";
import {
  UserCircle,
  Mail,
  KeyRound,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Copy,
  MonitorSmartphone,
  Sparkles,
  LogOut,
  RefreshCw,
  QrCode,
  ArrowRight,
} from "@/components/icons";
import { ReauthenticationDialog } from "@/components/auth/ReauthenticationDialog";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface AccountSecuritySettingsProps {
  initialTab?: "profile" | "email" | "password" | "security";
  onTabChange?: (tab: string) => void;
  className?: string;
}

export default function AccountSecuritySettings({
  initialTab = "security",
  onTabChange,
  className = "",
}: AccountSecuritySettingsProps) {
  const { user } = useAuth();
  const { role } = useTenant();
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState(initialTab);

  // ── Profile query ────────────────────────────────────────────────────────
  const profileQuery = useQuery({
    queryKey: ["account-security", "profile", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("name,email,avatar_url,created_at,student_id,department,class_name,phone,approval_status,colleges(college_name)")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // ── Change Email state & mutation ─────────────────────────────────────────
  const [newEmail, setNewEmail] = useState("");
  const [emailChangePending, setEmailChangePending] = useState(false);

  const changeEmailMutation = useMutation({
    mutationFn: async (targetEmail: string) => {
      const cleanEmail = targetEmail.trim().toLowerCase();
      if (!cleanEmail || !cleanEmail.includes("@")) {
        throw new Error("Please enter a valid email address");
      }
      const currentEmail = (profileQuery.data?.email || user?.email || "").toLowerCase();
      if (cleanEmail === currentEmail) {
        throw new Error("New email must be different from your current email");
      }

      const { data, error } = await supabase.auth.updateUser(
        { email: cleanEmail },
        { emailRedirectTo: `${window.location.origin}/auth/callback` }
      );
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      setEmailChangePending(true);
      setNewEmail("");
      toast.success(
        "Confirmation email sent! Please check both your current and new inboxes to confirm the change."
      );
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update email address");
    },
  });

  // ── Change Password state & mutation ──────────────────────────────────────
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      if (!newPassword || newPassword.length < 6) {
        throw new Error("Password must be at least 6 characters long");
      }
      if (newPassword !== confirmPassword) {
        throw new Error("Passwords do not match");
      }

      const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      setNewPassword("");
      setConfirmPassword("");
      toast.success(
        "Password changed successfully! A security confirmation has been sent to your email."
      );
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to change password");
    },
  });

  // ── Two-Factor Authentication (MFA) ───────────────────────────────────────
  const [mfaEnrollState, setMfaEnrollState] = useState<"idle" | "enrolling" | "verifying">("idle");
  const [enrollData, setEnrollData] = useState<{ id: string; secret: string; uri: string } | null>(null);
  const [mfaOtpCode, setMfaOtpCode] = useState("");
  const [mfaDisableConfirmOpen, setMfaDisableConfirmOpen] = useState(false);
  const [reauthOpen, setReauthOpen] = useState(false);
  const [reauthAction, setReauthAction] = useState<(() => void) | null>(null);

  const mfaFactorsQuery = useQuery({
    queryKey: ["account-security", "mfa-factors", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      if (typeof supabase.auth?.mfa?.listFactors !== "function") {
        return { totp: [], all: [] };
      }
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      return data;
    },
  });

  const verifiedFactor =
    mfaFactorsQuery.data?.totp?.find((f) => f.status === "verified") ||
    (mfaFactorsQuery.data as any)?.all?.find((f: any) => f.status === "verified");

  // Step 1: Start MFA enrollment
  const startMfaEnrollment = async () => {
    try {
      setMfaEnrollState("enrolling");
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Campus Connect Authenticator",
      });
      if (error) throw error;

      setEnrollData({
        id: data.id,
        secret: data.totp.secret,
        uri: data.totp.uri,
      });
      setMfaEnrollState("verifying");
    } catch (err: any) {
      toast.error(err.message || "Failed to initialize 2FA enrollment");
      setMfaEnrollState("idle");
    }
  };

  // Step 2: Verify and activate MFA factor
  const verifyMfaEnrollmentMutation = useMutation({
    mutationFn: async () => {
      if (!enrollData?.id) throw new Error("No enrollment factor found");
      const code = mfaOtpCode.trim();
      if (!code || code.length < 6) throw new Error("Please enter the 6-digit verification code");

      let verifyError = null;
      if (typeof (supabase.auth.mfa as any).challengeAndVerify === "function") {
        const res = await (supabase.auth.mfa as any).challengeAndVerify({
          factorId: enrollData.id,
          code,
        });
        verifyError = res.error;
      } else {
        const challengeRes = await supabase.auth.mfa.challenge({ factorId: enrollData.id });
        if (challengeRes.error) throw challengeRes.error;
        const res = await supabase.auth.mfa.verify({
          factorId: enrollData.id,
          challengeId: challengeRes.data.id,
          code,
        });
        verifyError = res.error;
      }

      if (verifyError) throw verifyError;
    },
    onSuccess: async () => {
      toast.success("Two-Factor Authentication is now ENABLED! Your account is protected.");
      setMfaEnrollState("idle");
      setEnrollData(null);
      setMfaOtpCode("");
      await qc.invalidateQueries({ queryKey: ["account-security", "mfa-factors", user?.id] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Invalid security code. Please check your authenticator app.");
    },
  });

  // Step 3: Disable / unenroll MFA factor
  const disableMfaMutation = useMutation({
    mutationFn: async (factorId: string) => {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Two-Factor Authentication has been disabled.");
      setMfaDisableConfirmOpen(false);
      await qc.invalidateQueries({ queryKey: ["account-security", "mfa-factors", user?.id] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to disable 2FA");
    },
  });

  // ── Active Sessions / Sign Out Others ─────────────────────────────────────
  const signOutOthersMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase.auth.signOut as any)({ scope: "others" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Signed out of all other active devices & sessions.");
    },
    onError: (err: any) => {
      toast.error(err.message || "Unable to sign out of other devices");
    },
  });

  // Helper to copy text to clipboard
  const copyToClipboard = (text: string, label = "Secret key") => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* ── Reauthentication Dialog ── */}
      <ReauthenticationDialog
        open={reauthOpen}
        onOpenChange={setReauthOpen}
        onSuccess={async () => {
          if (reauthAction) {
            await reauthAction();
            setReauthAction(null);
          }
        }}
      />

      {/* ── Main Navigation Tabs ── */}
      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          if (
            value === "profile" ||
            value === "security" ||
            value === "email" ||
            value === "password"
          ) {
            setActiveTab(value);
            onTabChange?.(value);
          }
        }}
        className="w-full space-y-6"
      >
        <TabsList className="grid w-full grid-cols-4 h-12 p-1 rounded-2xl bg-surface-2 border border-border-subtle">
          <TabsTrigger
            value="profile"
            className="rounded-xl text-[13px] font-bold text-muted-foreground data-[state=active]:bg-surface-1 data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all flex items-center gap-1.5"
          >
            <UserCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Profile</span>
          </TabsTrigger>
          <TabsTrigger
            value="email"
            className="rounded-xl text-[13px] font-bold text-muted-foreground data-[state=active]:bg-surface-1 data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all flex items-center gap-1.5"
          >
            <Mail className="h-4 w-4" />
            <span className="hidden sm:inline">Email</span>
          </TabsTrigger>
          <TabsTrigger
            value="password"
            className="rounded-xl text-[13px] font-bold text-muted-foreground data-[state=active]:bg-surface-1 data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all flex items-center gap-1.5"
          >
            <KeyRound className="h-4 w-4" />
            <span className="hidden sm:inline">Password</span>
          </TabsTrigger>
          <TabsTrigger
            value="security"
            className="rounded-xl text-[13px] font-bold text-muted-foreground data-[state=active]:bg-surface-1 data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all flex items-center gap-1.5"
          >
            <ShieldCheck className="h-4 w-4" />
            <span className="hidden sm:inline">Security</span>
          </TabsTrigger>
        </TabsList>

        {/* ──────────────────────────────────────────────────────────── */}
        {/* ── TAB 1: PROFILE OVERVIEW ── */}
        {/* ──────────────────────────────────────────────────────────── */}
        <TabsContent value="profile" className="space-y-4">
          <Card className="rounded-[22px] border-border-subtle bg-surface-1 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold">Profile Overview</CardTitle>
                  <CardDescription className="text-[13px]">
                    Your verified campus account identity.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-xs uppercase tracking-wider font-semibold">
                  {role || "Student"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="rounded-xl border border-border-subtle bg-surface-2/60 p-3.5 space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">Full Name</p>
                  <p className="text-sm font-semibold text-foreground">
                    {profileQuery.data?.name || "—"}
                  </p>
                </div>
                <div className="rounded-xl border border-border-subtle bg-surface-2/60 p-3.5 space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">Primary Email</p>
                  <p className="text-sm font-semibold text-foreground">
                    {profileQuery.data?.email || user?.email || "—"}
                  </p>
                </div>
                {profileQuery.data?.student_id && (
                  <div className="rounded-xl border border-border-subtle bg-surface-2/60 p-3.5 space-y-1">
                    <p className="text-xs text-muted-foreground font-medium">Student / Enrollment ID</p>
                    <p className="text-sm font-semibold text-foreground">
                      {profileQuery.data.student_id}
                    </p>
                  </div>
                )}
                {profileQuery.data?.department && (
                  <div className="rounded-xl border border-border-subtle bg-surface-2/60 p-3.5 space-y-1">
                    <p className="text-xs text-muted-foreground font-medium">Department</p>
                    <p className="text-sm font-semibold text-foreground">
                      {profileQuery.data.department}
                    </p>
                  </div>
                )}
                <div className="rounded-xl border border-border-subtle bg-surface-2/60 p-3.5 space-y-1 sm:col-span-2">
                  <p className="text-xs text-muted-foreground font-medium">College Institution</p>
                  <p className="text-sm font-semibold text-foreground">
                    {(profileQuery.data as any)?.colleges?.college_name || "Assigned Institution"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ──────────────────────────────────────────────────────────── */}
        {/* ── TAB 2: EMAIL MANAGEMENT ── */}
        {/* ──────────────────────────────────────────────────────────── */}
        <TabsContent value="email" className="space-y-4">
          <Card className="rounded-[22px] border-border-subtle bg-surface-1 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Email Address</CardTitle>
              <CardDescription className="text-[13px]">
                Your registered email address is used for authentication, academic notifications, and recovery.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border border-border-subtle bg-surface-2/60 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Current Email Address</p>
                  <p className="text-sm font-bold text-foreground mt-0.5">
                    {profileQuery.data?.email || user?.email}
                  </p>
                </div>
                <Badge variant="secondary" className="w-fit text-emerald-600 bg-emerald-500/10 border border-emerald-500/20">
                  <CheckCircle2 className="mr-1 h-3 w-3" /> Verified
                </Badge>
              </div>

              {emailChangePending && (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                    <p className="font-semibold text-sm">Confirmation Link Sent</p>
                    <p className="mt-1">
                      Check your email inboxes. To complete the change, click the confirmation link sent to your new address.
                    </p>
                  </div>
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  changeEmailMutation.mutate(newEmail);
                }}
                className="space-y-4 pt-2"
              >
                <div className="space-y-1.5">
                  <Label htmlFor="change-new-email">New Email Address</Label>
                  <Input
                    id="change-new-email"
                    type="email"
                    placeholder="new-student@college.edu"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="h-11 rounded-xl bg-surface-2/60 border-border-subtle"
                    disabled={changeEmailMutation.isPending}
                    required
                  />
                </div>

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    className="rounded-xl h-11 px-6 font-semibold"
                    disabled={changeEmailMutation.isPending || !newEmail}
                  >
                    {changeEmailMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating…
                      </>
                    ) : (
                      <>
                        <Mail className="mr-2 h-4 w-4" /> Change Email Address
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ──────────────────────────────────────────────────────────── */}
        {/* ── TAB 3: PASSWORD MANAGEMENT ── */}
        {/* ──────────────────────────────────────────────────────────── */}
        <TabsContent value="password" className="space-y-4">
          <Card className="rounded-[22px] border-border-subtle bg-surface-1 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Change Password</CardTitle>
              <CardDescription className="text-[13px]">
                Ensure your account is using a secure password of at least 6 characters.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  changePasswordMutation.mutate();
                }}
                className="space-y-4"
              >
                <div className="space-y-1.5">
                  <Label htmlFor="change-new-password">New Password</Label>
                  <Input
                    id="change-new-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter new password (min. 6 characters)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="h-11 rounded-xl bg-surface-2/60 border-border-subtle"
                    disabled={changePasswordMutation.isPending}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="change-confirm-password">Confirm New Password</Label>
                  <Input
                    id="change-confirm-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="h-11 rounded-xl bg-surface-2/60 border-border-subtle"
                    disabled={changePasswordMutation.isPending}
                    required
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showPassword}
                      onChange={(e) => setShowPassword(e.target.checked)}
                      className="rounded border-border-subtle text-primary focus:ring-primary"
                    />
                    <span>Show passwords</span>
                  </label>
                  <span>At least 6 characters required</span>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    className="rounded-xl h-11 px-6 font-semibold"
                    disabled={
                      changePasswordMutation.isPending ||
                      !newPassword ||
                      newPassword.length < 6 ||
                      newPassword !== confirmPassword
                    }
                  >
                    {changePasswordMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating…
                      </>
                    ) : (
                      <>
                        <KeyRound className="mr-2 h-4 w-4" /> Update Password
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ──────────────────────────────────────────────────────────── */}
        {/* ── TAB 4: TWO-FACTOR AUTHENTICATION & ADVANCED SECURITY ── */}
        {/* ──────────────────────────────────────────────────────────── */}
        <TabsContent value="security" className="space-y-6">
          {/* 1. Two-Factor Authentication Card */}
          <Card className="rounded-[22px] border-border-subtle bg-surface-1 shadow-sm overflow-hidden">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                    Two-Factor Authentication (MFA)
                  </CardTitle>
                  <CardDescription className="text-[13px]">
                    Protect your campus account with an extra layer of security via TOTP Authenticator apps (e.g. Google Authenticator, Authy, 1Password).
                  </CardDescription>
                </div>
                <Badge
                  variant={verifiedFactor ? "default" : "secondary"}
                  className={
                    verifiedFactor
                      ? "bg-emerald-500 text-white font-bold text-xs"
                      : "text-muted-foreground font-semibold text-xs"
                  }
                >
                  {verifiedFactor ? "Enabled" : "Disabled"}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* If 2FA is currently active */}
              {verifiedFactor ? (
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-foreground">
                        Two-Factor Authentication is Active
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                        Every sign-in will require a 6-digit verification code from your authenticator app in addition to your password.
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-end border-t border-emerald-500/15">
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => {
                        setReauthAction(() => () => setMfaDisableConfirmOpen(true));
                        setReauthOpen(true);
                      }}
                      className="rounded-xl h-10 text-xs font-semibold"
                    >
                      Disable Two-Factor Authentication
                    </Button>
                  </div>
                </div>
              ) : mfaEnrollState === "verifying" && enrollData ? (
                /* Enrollment step: QR Code & Code Verification */
                <div className="rounded-2xl border border-border-subtle bg-surface-2/60 p-5 space-y-5">
                  <div className="flex items-center gap-2.5 pb-2 border-b border-border-subtle">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <QrCode className="h-4 w-4" />
                    </div>
                    <p className="text-sm font-bold text-foreground">
                      Step 1: Scan QR Code with your Authenticator App
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-6 justify-center py-2">
                    <div className="p-3 bg-white rounded-2xl shadow-sm border border-border-subtle">
                      <QRCodeSVG value={enrollData.uri || enrollData.secret} size={160} />
                    </div>
                    <div className="space-y-2 text-center sm:text-left max-w-xs">
                      <p className="text-xs text-muted-foreground">
                        Can't scan the QR code? Copy the secret key below and paste it into your authenticator app:
                      </p>
                      <div className="flex items-center gap-2">
                        <code className="bg-surface-1 border border-border-subtle px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold tracking-wider text-foreground select-all break-all">
                          {enrollData.secret}
                        </code>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => copyToClipboard(enrollData.secret)}
                          className="h-8 w-8 shrink-0 rounded-lg"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      verifyMfaEnrollmentMutation.mutate();
                    }}
                    className="space-y-4 pt-2 border-t border-border-subtle"
                  >
                    <div className="space-y-1.5">
                      <Label htmlFor="enroll-otp-code">
                        Step 2: Enter the 6-Digit Code from Authenticator
                      </Label>
                      <Input
                        id="enroll-otp-code"
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="123456"
                        value={mfaOtpCode}
                        onChange={(e) => setMfaOtpCode(e.target.value.replace(/\D/g, ""))}
                        className="h-12 text-center font-mono tracking-widest text-lg rounded-xl bg-surface-1 border-border-subtle"
                        autoFocus
                        required
                      />
                    </div>

                    <div className="flex justify-between items-center pt-2">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setMfaEnrollState("idle");
                          setEnrollData(null);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={verifyMfaEnrollmentMutation.isPending || mfaOtpCode.length < 6}
                        className="rounded-xl h-11 px-6 font-semibold"
                      >
                        {verifyMfaEnrollmentMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying…
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="mr-2 h-4 w-4" /> Verify & Enable 2FA
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </div>
              ) : (
                /* Initial state: Enable 2FA button */
                <div className="rounded-2xl border border-border-subtle bg-surface-2/40 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">
                      Two-Factor Authentication is currently inactive
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Enabling 2FA provides enhanced security by requiring a time-based one-time password on every login.
                    </p>
                  </div>
                  <Button
                    type="button"
                    onClick={startMfaEnrollment}
                    disabled={mfaEnrollState !== "idle"}
                    className="rounded-xl h-11 px-6 font-bold shrink-0 gap-2"
                  >
                    {mfaEnrollState === "enrolling" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <ShieldCheck className="h-4 w-4" /> Enable 2FA
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 2. Reauthentication & Identity Confirmation Card */}
          <Card className="rounded-[22px] border-border-subtle bg-surface-1 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-amber-500" />
                Identity Reauthentication
              </CardTitle>
              <CardDescription className="text-[13px]">
                Verify your credentials on-demand to refresh your active authentication token before administrative or financial tasks.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border-subtle bg-surface-2/40 p-3.5">
                <div className="text-xs text-muted-foreground">
                  Session Token: Active · Verified via Supabase Auth
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setReauthOpen(true)}
                  className="rounded-xl h-9 text-xs font-semibold shrink-0"
                >
                  Verify Identity Now
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 3. Active Sessions & Device Management Card */}
          <Card className="rounded-[22px] border-border-subtle bg-surface-1 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <MonitorSmartphone className="h-4 w-4 text-primary" />
                Active Sessions & Connected Devices
              </CardTitle>
              <CardDescription className="text-[13px]">
                Sign out of other browsers and mobile devices if you suspect unauthorized access.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-xl border border-border-subtle bg-surface-2/40 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-foreground">Current Session</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {navigator.userAgent.slice(0, 75)}…
                  </p>
                </div>
                <Badge variant="secondary" className="w-fit text-xs text-emerald-600 bg-emerald-500/10">
                  Current Device
                </Badge>
              </div>

              <div className="flex justify-end pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => signOutOthersMutation.mutate()}
                  disabled={signOutOthersMutation.isPending}
                  className="rounded-xl h-10 text-xs font-semibold border-destructive/30 text-destructive hover:bg-destructive/10"
                >
                  {signOutOthersMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> Signing out…
                    </>
                  ) : (
                    <>
                      <LogOut className="mr-2 h-3.5 w-3.5" /> Sign Out of Other Sessions
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Disable 2FA Confirmation Dialog ── */}
      {mfaDisableConfirmOpen && verifiedFactor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border-subtle bg-surface-1 p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-3 text-destructive">
              <ShieldAlert className="h-6 w-6" />
              <h3 className="font-bold text-lg text-foreground">Disable Two-Factor Authentication?</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Disabling two-factor authentication will remove the requirement for an authenticator security code. Your account will only be protected by your password.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setMfaDisableConfirmOpen(false)}
                disabled={disableMfaMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => disableMfaMutation.mutate(verifiedFactor.id)}
                disabled={disableMfaMutation.isPending}
              >
                {disableMfaMutation.isPending ? "Disabling…" : "Yes, Disable 2FA"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
