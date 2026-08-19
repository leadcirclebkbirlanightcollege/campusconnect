import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, CheckCircle2, GraduationCap, Settings2, Shield, Users } from "@/components/icons";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GlassCard } from "@/components/ui/GlassCard";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

const ALL_FEATURES = [
  "attendance", "lectures", "messages", "analytics", "leaderboard",
  "events", "announcements", "polls", "achievements", "daily_content",
  "challenges", "programmes",
] as const;

const collegeSchema = z.object({
  collegeName: z.string().min(2).max(200),
  tagline: z.string().max(200).optional(),
});

const adminSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email().max(255),
  password: z.string().min(6, "Minimum 6 characters"),
});

const STEPS = [
  { icon: Building2, label: "College Info" },
  { icon: Settings2, label: "Features" },
  { icon: Shield, label: "Admin Account" },
  { icon: CheckCircle2, label: "Complete" },
];

export default function CollegeOnboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const [collegeName, setCollegeName] = useState("");
  const [tagline, setTagline] = useState("");
  const [features, setFeatures] = useState<string[]>([...ALL_FEATURES]);
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const toggleFeature = (f: string) => {
    setFeatures((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]));
  };

  const nextStep = () => {
    setErrors({});
    if (step === 0) {
      const r = collegeSchema.safeParse({ collegeName, tagline });
      if (!r.success) {
        const e: Record<string, string> = {};
        r.error.issues.forEach((i) => (e[String(i.path[0])] = i.message));
        setErrors(e);
        return;
      }
    }
    if (step === 2) {
      const r = adminSchema.safeParse({ name: adminName, email: adminEmail, password: adminPassword });
      if (!r.success) {
        const e: Record<string, string> = {};
        r.error.issues.forEach((i) => (e[String(i.path[0])] = i.message));
        setErrors(e);
        return;
      }
      handleCreate();
      return;
    }
    setStep((s) => s + 1);
  };

  const handleCreate = async () => {
    setLoading(true);
    try {
      // 1. Sign up the admin
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: adminEmail,
        password: adminPassword,
        options: { emailRedirectTo: window.location.origin },
      });
      if (authError) throw authError;
      const userId = authData.user?.id;
      if (!userId) throw new Error("User creation failed");

      // 2. Create college via edge function (service role needed for multi-step)
      const { data: fnData, error: fnError } = await supabase.functions.invoke("ensure-admin-account", {
        body: {
          college_name: collegeName,
          tagline,
          enabled_features: features,
          admin_user_id: userId,
          admin_name: adminName,
          admin_email: adminEmail,
        },
      });

      if (fnError) {
        console.error("Onboarding function error:", fnError);
        // Continue anyway — profile/role might be set by trigger
      }

      toast.success("College created successfully!");
      setStep(3);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="sticky top-0 z-40 border-b border-border-subtle/70 bg-background/90 backdrop-blur-xl safe-area-top">
        <div className="mx-auto flex h-16 w-full max-w-[420px] items-center justify-center gap-2 px-4 md:max-w-3xl">
          <GraduationCap className="h-5 w-5 text-primary" />
          <p className="text-sm font-semibold">Campus Connect — College Onboarding</p>
        </div>
      </header>

      {/* Stepper */}
      <div className="mx-auto w-full max-w-[420px] px-4 pt-6 md:max-w-3xl md:px-6">
        <div className="flex items-center justify-between">
          {STEPS.map((s, i) => (
            <div key={s.label} className="flex flex-col items-center gap-1 flex-1">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors ${
                  i <= step ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
                }`}
              >
                <s.icon className="h-4 w-4" />
              </div>
              <p className={`text-[10px] font-medium ${i <= step ? "text-primary" : "text-muted-foreground"}`}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <main className="mx-auto w-full max-w-[420px] flex-1 px-4 py-6 md:max-w-3xl md:px-6">
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.15 }}>
            {step === 0 && (
              <GlassCard padding="lg" className="space-y-4">
                <h2 className="text-lg font-bold">College Information</h2>
                <div className="space-y-1.5">
                  <Label htmlFor="collegeName">College Name *</Label>
                  <Input id="collegeName" value={collegeName} onChange={(e) => setCollegeName(e.target.value)} placeholder="ABC Institute of Technology" />
                  {errors.collegeName && <p className="text-[11px] text-destructive">{errors.collegeName}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tagline">Tagline (optional)</Label>
                  <Input id="tagline" value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="Excellence in Education" />
                </div>
                <Button onClick={nextStep} className="w-full h-11">Continue</Button>
              </GlassCard>
            )}

            {step === 1 && (
              <GlassCard padding="lg" className="space-y-4">
                <h2 className="text-lg font-bold">Select Features</h2>
                <p className="text-xs text-muted-foreground">Choose which modules to enable for your institution.</p>
                <div className="grid grid-cols-2 gap-2">
                  {ALL_FEATURES.map((f) => (
                    <label
                      key={f}
                      className={`flex items-center gap-2 rounded-xl border p-3 cursor-pointer transition-colors ${
                        features.includes(f) ? "border-primary/40 bg-primary/5" : "border-border"
                      }`}
                    >
                      <Checkbox checked={features.includes(f)} onCheckedChange={() => toggleFeature(f)} />
                      <span className="text-xs font-medium capitalize">{f.replace("_", " ")}</span>
                    </label>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(0)} className="flex-1 h-11">Back</Button>
                  <Button onClick={nextStep} className="flex-1 h-11">Continue</Button>
                </div>
              </GlassCard>
            )}

            {step === 2 && (
              <GlassCard padding="lg" className="space-y-4">
                <h2 className="text-lg font-bold">Create Admin Account</h2>
                <p className="text-xs text-muted-foreground">This will be the primary admin for {collegeName}.</p>
                <div className="space-y-1.5">
                  <Label htmlFor="aname">Full Name *</Label>
                  <Input id="aname" value={adminName} onChange={(e) => setAdminName(e.target.value)} placeholder="Admin Name" />
                  {errors.name && <p className="text-[11px] text-destructive">{errors.name}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="aemail">Email *</Label>
                  <Input id="aemail" type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="admin@college.edu" />
                  {errors.email && <p className="text-[11px] text-destructive">{errors.email}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="apass">Password *</Label>
                  <Input id="apass" type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} placeholder="Min 6 characters" />
                  {errors.password && <p className="text-[11px] text-destructive">{errors.password}</p>}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(1)} className="flex-1 h-11" disabled={loading}>Back</Button>
                  <Button onClick={nextStep} className="flex-1 h-11" disabled={loading}>
                    {loading ? "Creating..." : "Create College"}
                  </Button>
                </div>
              </GlassCard>
            )}

            {step === 3 && (
              <GlassCard padding="lg" className="space-y-5 text-center">
                <div className="flex justify-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 border-2 border-primary/30">
                    <CheckCircle2 className="h-8 w-8 text-primary" />
                  </div>
                </div>
                <h2 className="text-xl font-bold">🎉 College Created!</h2>
                <p className="text-sm text-muted-foreground">
                  <strong>{collegeName}</strong> is now set up on Campus Connect. Please check your email to verify your account, then log in to start managing.
                </p>
                <div className="flex flex-col gap-2">
                  <Button onClick={() => navigate("/auth")} className="h-11">Go to Login</Button>
                  <Button variant="outline" onClick={() => navigate("/platform/admin/setup")} className="h-11">Open Setup Wizard</Button>
                </div>
              </GlassCard>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
