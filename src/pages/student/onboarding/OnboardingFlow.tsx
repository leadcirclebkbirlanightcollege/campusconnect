import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Loader2, ShieldCheck, User, Camera, FileCheck2, Eye, EyeOff, Lock,
  CheckCircle2, AlertCircle,
} from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";

type Step = 0 | 1 | 2 | 3;

const STEPS = [
  { icon: Lock, label: "Set password" },
  { icon: User, label: "Profile" },
  { icon: Camera, label: "Photo" },
  { icon: FileCheck2, label: "Terms" },
] as const;

const passwordSchema = z
  .string()
  .min(8, "At least 8 characters")
  .regex(/[A-Z]/, "Needs an uppercase letter")
  .regex(/[a-z]/, "Needs a lowercase letter")
  .regex(/[0-9]/, "Needs a number")
  .refine((v) => v !== "student@123", "Cannot reuse the default password");

const profileSchema = z.object({
  phone: z
    .string()
    .trim()
    .min(6, "Enter a valid phone number")
    .max(20, "Phone is too long")
    .regex(/^[+0-9\s\-()]+$/, "Only digits and + - ( ) allowed"),
  emergency: z.string().trim().max(120).optional().or(z.literal("")),
  bio: z.string().trim().max(500).optional().or(z.literal("")),
});

const STORAGE_KEY = "cc_onboarding_step";

export default function OnboardingFlow() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: profile, isLoading: profileLoading, error: profileError } = useQuery({
    queryKey: ["onboarding", "profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("profiles").select("*").eq("user_id", user.id).single();
      if (error) throw error;
      return data as Record<string, unknown>;
    },
  });

  // Resolve furthest step the user is allowed to be on (cannot bypass forward).
  const minStep: Step = useMemo(() => {
    if (!profile) return 0;
    if (profile.must_change_password) return 0;
    if (!profile.profile_completed) return 1;
    if (!profile.avatar_url) return 2;
    return 3;
  }, [profile]);

  const [step, setStep] = useState<Step>(0);

  // Restore last step from localStorage but clamp to allowed minStep.
  useEffect(() => {
    const stored = Number(localStorage.getItem(STORAGE_KEY) ?? "0");
    const valid: Step = ([0, 1, 2, 3] as const).includes(stored as Step) ? (stored as Step) : 0;
    setStep(Math.max(valid, minStep) as Step);
  }, [minStep]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(step));
  }, [step]);

  const completeMutation = useMutation({
    mutationFn: async (patch: Record<string, unknown>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("profiles").update(patch).eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["onboarding"] }),
  });

  if (profileLoading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (profileError || !profile) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background p-6">
        <Card className="p-6 max-w-sm w-full text-center space-y-3">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
          <h2 className="font-semibold">Couldn't load your profile</h2>
          <p className="text-sm text-muted-foreground">
            {profileError instanceof Error ? profileError.message : "Please try again."}
          </p>
          <Button onClick={() => qc.invalidateQueries({ queryKey: ["onboarding"] })} className="w-full">
            Retry
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      <div className="px-5 pt-8 pb-4">
        <h1 className="text-2xl font-bold">Welcome to Campus Connect</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Let's set up your account in 4 quick steps. You can't skip ahead — finish each step to continue.
        </p>

        <div className="flex items-center gap-2 mt-5">
          {STEPS.map((s, i) => (
            <div key={i} className="flex-1 flex items-center gap-2">
              <button
                type="button"
                onClick={() => i <= minStep && i < step && setStep(i as Step)}
                disabled={i > step}
                className={`h-8 w-8 rounded-full flex items-center justify-center border transition ${
                  i < step
                    ? "bg-success/20 border-success text-success cursor-pointer"
                    : i === step
                    ? "bg-primary border-primary text-primary-foreground"
                    : "bg-surface-2 border-border-subtle text-muted-foreground cursor-not-allowed"
                }`}
                aria-label={s.label}
              >
                {i < step ? <CheckCircle2 className="h-4 w-4" /> : <s.icon className="h-4 w-4" />}
              </button>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 ${i < step ? "bg-success" : "bg-border-subtle"}`} />
              )}
            </div>
          ))}
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          Step {step + 1} of {STEPS.length} — {STEPS[step].label}
        </div>
      </div>

      <div className="flex-1 px-5 pb-8">
        {step === 0 && (
          <ChangePasswordStep
            onNext={async () => {
              await completeMutation.mutateAsync({ must_change_password: false });
              setStep(1);
            }}
          />
        )}
        {step === 1 && (
          <CompleteProfileStep
            profile={profile}
            onNext={async (patch) => {
              await completeMutation.mutateAsync({ ...patch, profile_completed: true });
              setStep(2);
            }}
          />
        )}
        {step === 2 && (
          <UploadAvatarStep profile={profile} onNext={() => setStep(3)} />
        )}
        {step === 3 && (
          <AcceptTermsStep
            onComplete={async () => {
              await completeMutation.mutateAsync({ onboarding_completed: true });
              localStorage.removeItem(STORAGE_KEY);
              toast.success("You're all set!");
              navigate("/app/dashboard", { replace: true });
            }}
            isLoading={completeMutation.isPending}
          />
        )}
      </div>
    </div>
  );
}

/* ============ STEP 1: Password ============ */

function ChangePasswordStep({ onNext }: { onNext: () => Promise<void> }) {
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ pw?: string; confirm?: string; root?: string }>({});

  const rules = [
    { ok: pw.length >= 8, label: "At least 8 characters" },
    { ok: /[A-Z]/.test(pw), label: "One uppercase letter" },
    { ok: /[a-z]/.test(pw), label: "One lowercase letter" },
    { ok: /[0-9]/.test(pw), label: "One number" },
    { ok: pw !== "" && pw !== "student@123", label: "Different from default" },
  ];

  const submit = async () => {
    const next: typeof errors = {};
    const v = passwordSchema.safeParse(pw);
    if (!v.success) next.pw = v.error.issues[0].message;
    if (pw && confirm && pw !== confirm) next.confirm = "Passwords don't match";
    setErrors(next);
    if (next.pw || next.confirm) return;

    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) throw error;
      toast.success("Password updated");
      await onNext();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update password";
      setErrors({ root: msg });
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-primary" />
        <h2 className="font-semibold">Set your new password</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        For security, you must change the default password (<code className="text-xs">student@123</code>) before continuing.
      </p>

      <div className="space-y-3">
        <div>
          <Label htmlFor="pw">New password</Label>
          <div className="relative">
            <Input
              id="pw"
              type={show ? "text" : "password"}
              value={pw}
              onChange={(e) => { setPw(e.target.value); setErrors((p) => ({ ...p, pw: undefined, root: undefined })); }}
              aria-invalid={!!errors.pw}
              className={errors.pw ? "border-destructive" : ""}
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
              aria-label={show ? "Hide password" : "Show password"}
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.pw && <p className="text-xs text-destructive mt-1">{errors.pw}</p>}
        </div>

        <ul className="space-y-1">
          {rules.map((r) => (
            <li key={r.label} className={`text-xs flex items-center gap-1.5 ${r.ok ? "text-success" : "text-muted-foreground"}`}>
              <CheckCircle2 className={`h-3 w-3 ${r.ok ? "" : "opacity-40"}`} />
              {r.label}
            </li>
          ))}
        </ul>

        <div>
          <Label htmlFor="confirm">Confirm password</Label>
          <Input
            id="confirm"
            type={show ? "text" : "password"}
            value={confirm}
            onChange={(e) => { setConfirm(e.target.value); setErrors((p) => ({ ...p, confirm: undefined })); }}
            aria-invalid={!!errors.confirm}
            className={errors.confirm ? "border-destructive" : ""}
          />
          {errors.confirm && <p className="text-xs text-destructive mt-1">{errors.confirm}</p>}
        </div>
      </div>

      {errors.root && (
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-xs">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>{errors.root}</span>
        </div>
      )}

      <Button onClick={submit} disabled={submitting} className="w-full">
        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
        Continue
      </Button>
    </Card>
  );
}

/* ============ Read-only field ============ */

function ReadOnlyField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <div className="flex items-center gap-1.5">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        <Lock className="h-3 w-3 text-muted-foreground" />
      </div>
      <div className="mt-1 px-3 py-2 rounded-lg bg-surface-2 border border-border-subtle text-sm">
        {value || "—"}
      </div>
    </div>
  );
}

/* ============ STEP 2: Profile ============ */

function CompleteProfileStep({
  profile,
  onNext,
}: {
  profile: Record<string, unknown>;
  onNext: (patch: Record<string, unknown>) => Promise<void>;
}) {
  const [bio, setBio] = useState((profile.bio as string) ?? "");
  const [phone, setPhone] = useState((profile.phone as string) ?? (profile.mobile as string) ?? "");
  const [emergency, setEmergency] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ phone?: string; emergency?: string; bio?: string; root?: string }>({});

  const submit = async () => {
    const v = profileSchema.safeParse({ phone, emergency, bio });
    if (!v.success) {
      const fe = v.error.flatten().fieldErrors;
      setErrors({ phone: fe.phone?.[0], emergency: fe.emergency?.[0], bio: fe.bio?.[0] });
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      await onNext({ phone, bio });
    } catch (err) {
      setErrors({ root: err instanceof Error ? err.message : "Failed to save" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="p-5 space-y-4">
      <h2 className="font-semibold">Complete your profile</h2>
      <p className="text-xs text-muted-foreground">
        Fields synced from your college's ERP are locked. Complete the personal details below.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <ReadOnlyField label="Name" value={profile.name as string} />
        <ReadOnlyField label="Email" value={profile.email as string} />
        <ReadOnlyField label="Enrollment No." value={profile.enrollment_no as string} />
        <ReadOnlyField label="Roll No." value={profile.roll_no as string} />
      </div>

      <div className="space-y-3">
        <div>
          <Label htmlFor="phone">Personal phone *</Label>
          <Input
            id="phone"
            value={phone}
            onChange={(e) => { setPhone(e.target.value); setErrors((p) => ({ ...p, phone: undefined })); }}
            placeholder="+91 ..."
            aria-invalid={!!errors.phone}
            className={errors.phone ? "border-destructive" : ""}
          />
          {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone}</p>}
        </div>
        <div>
          <Label htmlFor="emerg">Emergency contact</Label>
          <Input
            id="emerg"
            value={emergency}
            onChange={(e) => { setEmergency(e.target.value); setErrors((p) => ({ ...p, emergency: undefined })); }}
            placeholder="Name + phone"
            aria-invalid={!!errors.emergency}
            className={errors.emergency ? "border-destructive" : ""}
          />
          {errors.emergency && <p className="text-xs text-destructive mt-1">{errors.emergency}</p>}
        </div>
        <div>
          <Label htmlFor="bio">Short bio (optional)</Label>
          <Textarea
            id="bio"
            value={bio}
            onChange={(e) => { setBio(e.target.value); setErrors((p) => ({ ...p, bio: undefined })); }}
            rows={3}
            aria-invalid={!!errors.bio}
            className={errors.bio ? "border-destructive" : ""}
          />
          {errors.bio && <p className="text-xs text-destructive mt-1">{errors.bio}</p>}
        </div>
      </div>

      {errors.root && (
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-xs">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>{errors.root}</span>
        </div>
      )}

      <Button className="w-full" disabled={submitting} onClick={submit}>
        {submitting && <Loader2 className="h-4 w-4 animate-spin" />} Continue
      </Button>
    </Card>
  );
}

/* ============ STEP 3: Avatar ============ */

function UploadAvatarStep({
  profile,
  onNext,
}: {
  profile: Record<string, unknown>;
  onNext: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [url, setUrl] = useState<string | null>((profile.avatar_url as string) ?? null);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File) => {
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file (jpg, png, webp).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be under 5 MB.");
      return;
    }
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const path = `${user.id}/${Date.now()}_${file.name}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      await supabase.from("profiles").update({ avatar_url: pub.publicUrl }).eq("user_id", user.id);
      setUrl(pub.publicUrl);
      toast.success("Photo uploaded");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="p-5 space-y-4 text-center">
      <h2 className="font-semibold">Upload a profile photo</h2>
      <p className="text-xs text-muted-foreground">Optional, but recommended.</p>
      <Avatar className="h-24 w-24 mx-auto">
        <AvatarImage src={url ?? undefined} />
        <AvatarFallback>{(profile.name as string)?.[0] ?? "?"}</AvatarFallback>
      </Avatar>
      <input
        type="file" accept="image/*" id="avatar-upload" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }}
      />
      {error && (
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-xs text-left">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      <div className="flex gap-2 justify-center">
        <Button asChild variant="outline" disabled={uploading}>
          <label htmlFor="avatar-upload">
            <Camera className="h-4 w-4" /> {uploading ? "Uploading..." : url ? "Change" : "Choose photo"}
          </label>
        </Button>
        <Button onClick={onNext} variant={url ? "default" : "ghost"} disabled={uploading}>
          {url ? "Continue" : "Skip"}
        </Button>
      </div>
    </Card>
  );
}

/* ============ STEP 4: Terms ============ */

function AcceptTermsStep({ onComplete, isLoading }: { onComplete: () => Promise<void>; isLoading: boolean }) {
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handle = async () => {
    if (!accepted) {
      setError("You must accept the terms to continue.");
      return;
    }
    setError(null);
    try {
      await onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not finish onboarding");
    }
  };

  return (
    <Card className="p-5 space-y-4">
      <h2 className="font-semibold">Terms & community guidelines</h2>
      <div className="text-xs text-muted-foreground space-y-2 max-h-[200px] overflow-y-auto p-3 bg-surface-2 rounded-lg">
        <p>By using Campus Connect you agree to use the platform respectfully, follow your college's code of conduct, and keep your login credentials private.</p>
        <p>Your ERP data is managed by your college administration. Personal fields you add are visible per platform privacy settings.</p>
      </div>
      <label className="flex items-start gap-2 text-sm">
        <Checkbox checked={accepted} onCheckedChange={(v) => { setAccepted(!!v); setError(null); }} className="mt-0.5" />
        <span>I have read and accept the terms and community guidelines.</span>
      </label>
      {error && (
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-xs">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      <Button onClick={handle} disabled={isLoading} className="w-full">
        {isLoading && <Loader2 className="h-4 w-4 animate-spin" />} Enter Campus Connect
      </Button>
    </Card>
  );
}
