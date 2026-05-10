import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, ShieldCheck, User, Camera, FileCheck2, Eye, EyeOff, Lock } from "lucide-react";
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
];

const passwordSchema = z
  .string()
  .min(8, "At least 8 characters")
  .regex(/[A-Z]/, "Needs an uppercase letter")
  .regex(/[a-z]/, "Needs a lowercase letter")
  .regex(/[0-9]/, "Needs a number");

export default function OnboardingFlow() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [step, setStep] = useState<Step>(0);

  const { data: profile } = useQuery({
    queryKey: ["onboarding", "profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const completeMutation = useMutation({
    mutationFn: async (patch: Record<string, unknown>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("profiles")
        .update(patch)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["onboarding"] }),
  });

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      <div className="px-5 pt-8 pb-4">
        <h1 className="text-2xl font-bold">Welcome to Campus Connect</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Let's set up your account in 4 quick steps.
        </p>

        <div className="flex items-center gap-2 mt-5">
          {STEPS.map((s, i) => (
            <div key={i} className="flex-1 flex items-center gap-2">
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center border ${
                  i < step
                    ? "bg-success/20 border-success text-success"
                    : i === step
                    ? "bg-primary border-primary text-primary-foreground"
                    : "bg-surface-2 border-border-subtle text-muted-foreground"
                }`}
              >
                <s.icon className="h-4 w-4" />
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 ${i < step ? "bg-success" : "bg-border-subtle"}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 px-5 pb-8">
        {step === 0 && (
          <ChangePasswordStep
            onNext={async () => {
              await completeMutation.mutateAsync({ must_change_password: false, password_changed: true });
              setStep(1);
            }}
          />
        )}
        {step === 1 && profile && (
          <CompleteProfileStep
            profile={profile}
            onNext={async (patch) => {
              await completeMutation.mutateAsync({ ...patch, profile_completed: true });
              setStep(2);
            }}
          />
        )}
        {step === 2 && profile && (
          <UploadAvatarStep
            profile={profile}
            onNext={() => setStep(3)}
          />
        )}
        {step === 3 && (
          <AcceptTermsStep
            onComplete={async () => {
              await completeMutation.mutateAsync({ onboarding_completed: true });
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

function ChangePasswordStep({ onNext }: { onNext: () => Promise<void> }) {
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    const v = passwordSchema.safeParse(pw);
    if (!v.success) return toast.error(v.error.issues[0].message);
    if (pw !== confirm) return toast.error("Passwords don't match");
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) throw error;
      toast.success("Password updated");
      await onNext();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
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
        For security, you must change the default password before continuing.
      </p>

      <div className="space-y-3">
        <div>
          <Label htmlFor="pw">New password</Label>
          <div className="relative">
            <Input id="pw" type={show ? "text" : "password"} value={pw} onChange={(e) => setPw(e.target.value)} />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <div>
          <Label htmlFor="confirm">Confirm password</Label>
          <Input id="confirm" type={show ? "text" : "password"} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>
      </div>

      <Button onClick={submit} disabled={submitting} className="w-full">
        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
        Continue
      </Button>
    </Card>
  );
}

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
          <Label htmlFor="phone">Personal phone</Label>
          <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 ..." />
        </div>
        <div>
          <Label htmlFor="emerg">Emergency contact</Label>
          <Input id="emerg" value={emergency} onChange={(e) => setEmergency(e.target.value)} placeholder="Name + phone" />
        </div>
        <div>
          <Label htmlFor="bio">Short bio (optional)</Label>
          <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} rows={3} />
        </div>
      </div>

      <Button
        className="w-full"
        disabled={submitting || !phone}
        onClick={async () => {
          setSubmitting(true);
          try {
            await onNext({ phone, bio });
          } finally {
            setSubmitting(false);
          }
        }}
      >
        {submitting && <Loader2 className="h-4 w-4 animate-spin" />} Continue
      </Button>
    </Card>
  );
}

function UploadAvatarStep({
  profile,
  onNext,
}: {
  profile: Record<string, unknown>;
  onNext: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [url, setUrl] = useState<string | null>((profile.avatar_url as string) ?? null);

  const upload = async (file: File) => {
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
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="p-5 space-y-4 text-center">
      <h2 className="font-semibold">Upload a profile photo</h2>
      <Avatar className="h-24 w-24 mx-auto">
        <AvatarImage src={url ?? undefined} />
        <AvatarFallback>{(profile.name as string)?.[0] ?? "?"}</AvatarFallback>
      </Avatar>
      <input
        type="file"
        accept="image/*"
        id="avatar-upload"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload(f);
        }}
      />
      <div className="flex gap-2 justify-center">
        <Button asChild variant="outline" disabled={uploading}>
          <label htmlFor="avatar-upload">
            <Camera className="h-4 w-4" /> {uploading ? "Uploading..." : url ? "Change" : "Choose photo"}
          </label>
        </Button>
        <Button onClick={onNext} variant={url ? "default" : "ghost"}>
          {url ? "Continue" : "Skip"}
        </Button>
      </div>
    </Card>
  );
}

function AcceptTermsStep({ onComplete, isLoading }: { onComplete: () => Promise<void>; isLoading: boolean }) {
  const [accepted, setAccepted] = useState(false);
  return (
    <Card className="p-5 space-y-4">
      <h2 className="font-semibold">Terms & community guidelines</h2>
      <div className="text-xs text-muted-foreground space-y-2 max-h-[200px] overflow-y-auto p-3 bg-surface-2 rounded-lg">
        <p>By using Campus Connect you agree to use the platform respectfully, follow your college's code of conduct, and keep your login credentials private.</p>
        <p>Your ERP data is managed by your college administration. Personal fields you add are visible per platform privacy settings.</p>
      </div>
      <label className="flex items-start gap-2 text-sm">
        <Checkbox checked={accepted} onCheckedChange={(v) => setAccepted(!!v)} className="mt-0.5" />
        <span>I have read and accept the terms and community guidelines.</span>
      </label>
      <Button onClick={onComplete} disabled={!accepted || isLoading} className="w-full">
        {isLoading && <Loader2 className="h-4 w-4 animate-spin" />} Enter Campus Connect
      </Button>
    </Card>
  );
}
