import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, ArrowRight, ArrowLeft, Upload, CheckCircle2, User as UserIcon, GraduationCap } from "lucide-react";
import { COURSES, ACADEMIC_YEARS } from "@/lib/courses";

type Gender = "male" | "female" | "other";

export default function OnboardingWizard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Google prefill
  const meta = (user?.user_metadata ?? {}) as Record<string, any>;
  const initialName = (meta.full_name || meta.name || "").trim();
  const [firstName, setFirstName] = useState(initialName.split(" ")[0] ?? "");
  const [lastName, setLastName] = useState(initialName.split(" ").slice(1).join(" "));
  const [avatarUrl, setAvatarUrl] = useState<string>(meta.avatar_url ?? meta.picture ?? "");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState<Gender | "">("");
  const [dob, setDob] = useState("");

  const [enrollment, setEnrollment] = useState("");
  const [studentId, setStudentId] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [year, setYear] = useState("");

  const email = user?.email ?? meta.email ?? "";

  const canNextStep1 = useMemo(
    () => firstName.trim() && lastName.trim() && phone.trim() && gender && dob,
    [firstName, lastName, phone, gender, dob]
  );
  const canSubmit = useMemo(
    () => canNextStep1 && enrollment.trim() && courseCode && year,
    [canNextStep1, enrollment, courseCode, year]
  );

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 4 * 1024 * 1024) {
      toast.error("Image must be under 4 MB");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `onboarding/${user.id}.${ext}`;
      const { error } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      setAvatarUrl(`${data.publicUrl}?v=${Date.now()}`);
      toast.success("Photo uploaded");
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit() {
    if (!user || !canSubmit) return;
    setLoading(true);
    try {
      const course = COURSES.find((c) => c.code === courseCode)!;
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();

      // Pre-check enrollment uniqueness (better UX than 23505)
      const { data: existing } = await supabase
        .from("profiles")
        .select("user_id")
        .ilike("enrollment_number", enrollment.trim())
        .neq("user_id", user.id)
        .maybeSingle();
      if (existing) throw new Error("This enrollment number is already registered.");

      const payload = {
        user_id: user.id,
        name: fullName,
        email,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim(),
        gender,
        date_of_birth: dob,
        avatar_url: avatarUrl || null,
        enrollment_number: enrollment.trim(),
        student_id: studentId.trim() || null,
        course_code: course.code,
        course_name: course.name,
        academic_year: year,
        profile_completed: true,
        profile_submitted_at: new Date().toISOString(),
      };

      // Upsert (covers Google first-login where no profile row exists yet)
      const { error } = await supabase
        .from("profiles")
        .upsert(payload, { onConflict: "user_id" });
      if (error) throw error;

      // Ensure student role exists (no college yet — admin assigns)
      await supabase
        .from("user_roles")
        .upsert({ user_id: user.id, role: "student" }, { onConflict: "user_id,role" });

      await qc.invalidateQueries({ queryKey: ["onboarding_status", user.id] });
      toast.success("Profile submitted for verification");
      navigate("/pending-approval", { replace: true });
    } catch (err: any) {
      const msg = err?.message ?? "Submission failed";
      toast.error(msg.includes("duplicate") ? "Enrollment number already exists." : msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-8 relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{ backgroundImage: "radial-gradient(circle at 1px 1px, hsl(var(--primary)) 1px, transparent 0)", backgroundSize: "32px 32px" }} />
      <div className="absolute top-1/4 -left-32 h-96 w-96 rounded-full bg-primary/10 blur-[120px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-[560px]">
        {/* Progress */}
        <div className="mb-6 flex items-center gap-3">
          {[1, 2].map((n) => (
            <div key={n} className="flex-1 flex items-center gap-2">
              <div className={`h-9 w-9 rounded-full flex items-center justify-center text-[13px] font-semibold border transition-colors ${step >= n ? "bg-primary text-primary-foreground border-primary" : "bg-surface-2 text-muted-foreground border-border-subtle"}`}>
                {step > n ? <CheckCircle2 className="h-4 w-4" /> : n}
              </div>
              <div className={`h-1 flex-1 rounded-full transition-colors ${step > n ? "bg-primary" : "bg-border-subtle"}`} />
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-border-subtle bg-surface-1/80 backdrop-blur-xl p-6 sm:p-8 shadow-2xl">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="s1" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.18 }}>
                <div className="flex items-center gap-3 mb-5">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <UserIcon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-[20px] font-semibold tracking-tight">Personal Details</h1>
                    <p className="text-[13px] text-muted-foreground">Tell us about yourself</p>
                  </div>
                </div>

                {/* Photo */}
                <div className="flex items-center gap-4 mb-5">
                  <div className="h-16 w-16 rounded-full overflow-hidden bg-surface-2 border border-border-subtle flex items-center justify-center">
                    {avatarUrl
                      ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                      : <UserIcon className="h-7 w-7 text-muted-foreground" />}
                  </div>
                  <label className="cursor-pointer">
                    <input type="file" accept="image/*" className="hidden" onChange={handlePhoto} disabled={uploading} />
                    <span className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border-subtle bg-surface-2 hover:bg-surface-3 text-[13px] font-medium transition-colors">
                      {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                      {avatarUrl ? "Change photo" : "Upload photo"}
                    </span>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="First Name" required>
                    <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="John" />
                  </Field>
                  <Field label="Last Name" required>
                    <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Doe" />
                  </Field>
                  <Field label="Phone" required>
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 …" inputMode="tel" />
                  </Field>
                  <Field label="Gender" required>
                    <Select value={gender} onValueChange={(v) => setGender(v as Gender)}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <div className="col-span-2">
                    <Field label="Date of Birth" required>
                      <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} max={new Date().toISOString().slice(0, 10)} />
                    </Field>
                  </div>
                  <div className="col-span-2">
                    <Field label="Email">
                      <Input value={email} disabled className="opacity-70" />
                    </Field>
                  </div>
                </div>

                <Button className="w-full mt-6 h-11 gap-2" disabled={!canNextStep1} onClick={() => setStep(2)}>
                  Continue <ArrowRight className="h-4 w-4" />
                </Button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="s2" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.18 }}>
                <div className="flex items-center gap-3 mb-5">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <GraduationCap className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-[20px] font-semibold tracking-tight">Academic Details</h1>
                    <p className="text-[13px] text-muted-foreground">Verify your enrollment</p>
                  </div>
                </div>

                <div className="space-y-3.5">
                  <Field
                    label="Mumbai University Enrollment Number"
                    required
                    hint="You can find this on your Mumbai University admission/application form."
                  >
                    <Input value={enrollment} onChange={(e) => setEnrollment(e.target.value)} placeholder="e.g. 2024XXXXXXX" />
                  </Field>

                  <Field label="College Student ID" hint="Leave blank if your college ID has not been assigned yet.">
                    <Input value={studentId} onChange={(e) => setStudentId(e.target.value)} placeholder="Optional" />
                  </Field>

                  <Field label="Course" required>
                    <Select value={courseCode} onValueChange={setCourseCode}>
                      <SelectTrigger><SelectValue placeholder="Select your course" /></SelectTrigger>
                      <SelectContent>
                        {COURSES.map((c) => (
                          <SelectItem key={c.code} value={c.code}>
                            {c.name} <span className="text-muted-foreground ml-1">({c.code})</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field label="Year" required>
                    <Select value={year} onValueChange={setYear}>
                      <SelectTrigger><SelectValue placeholder="Select year" /></SelectTrigger>
                      <SelectContent>
                        {ACADEMIC_YEARS.map((y) => (
                          <SelectItem key={y.value} value={y.value}>{y.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>

                <div className="flex gap-2.5 mt-6">
                  <Button variant="outline" className="flex-1 h-11 gap-2" onClick={() => setStep(1)} disabled={loading}>
                    <ArrowLeft className="h-4 w-4" /> Back
                  </Button>
                  <Button className="flex-1 h-11 gap-2" disabled={!canSubmit || loading} onClick={handleSubmit}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Submit <ArrowRight className="h-4 w-4" /></>}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <p className="text-center mt-4 text-[11px] text-muted-foreground">
          Step {step} of 2 · Your details will be verified by your college admin
        </p>
      </div>
    </div>
  );
}

function Field({
  label, required, hint, children,
}: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[13px] font-medium">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground leading-snug">{hint}</p>}
    </div>
  );
}
