import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Loader2,
  ArrowRight,
  ArrowLeft,
  Upload,
  CheckCircle2,
  User as UserIcon,
  GraduationCap,
  ShieldCheck,
  Building2,
} from "@/components/icons";
import { COURSES, ACADEMIC_YEARS } from "@/lib/courses";
import { ImageCropper } from "@/components/image/ImageCropper";
import { CollegeIdUploadCard } from "@/components/onboarding/CollegeIdUploadCard";

type Gender = "male" | "female" | "other";

export default function OnboardingWizard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  // College ID card state
  const [idCardFile, setIdCardFile] = useState<File | null>(null);
  const [idCardPreviewUrl, setIdCardPreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Prefill metadata from Auth
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

  // Fetch existing profile if student was previously rejected or editing
  const { data: existingProfile } = useQuery({
    queryKey: ["onboarding_profile", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    staleTime: 60_000,
  });

  // Populate fields from existing profile
  useEffect(() => {
    if (!existingProfile) return;
    if (existingProfile.first_name) setFirstName(existingProfile.first_name);
    if (existingProfile.last_name) setLastName(existingProfile.last_name);
    if (existingProfile.phone) setPhone(existingProfile.phone);
    if (existingProfile.gender) setGender(existingProfile.gender as Gender);
    if (existingProfile.date_of_birth) setDob(existingProfile.date_of_birth);
    if (existingProfile.avatar_url) setAvatarUrl(existingProfile.avatar_url);
    if (existingProfile.enrollment_number) setEnrollment(existingProfile.enrollment_number);
    if (existingProfile.student_id) setStudentId(existingProfile.student_id);
    if (existingProfile.course_code) setCourseCode(existingProfile.course_code);
    if (existingProfile.academic_year) setYear(existingProfile.academic_year);

    // If previously submitted an ID card, create signed URL for preview
    if (existingProfile.id_card_path && !idCardFile) {
      supabase.storage
        .from("student-id-cards")
        .createSignedUrl(existingProfile.id_card_path, 600)
        .then(({ data }) => {
          if (data?.signedUrl) {
            setIdCardPreviewUrl(data.signedUrl);
          }
        })
        .catch(() => {});
    }

    // If previously rejected, open directly to Step 2 so student can replace ID card
    if (existingProfile.approval_status === "rejected") {
      setStep(2);
    }
  }, [existingProfile]);

  const canNextStep1 = useMemo(
    () =>
      firstName.trim().length > 0 &&
      lastName.trim().length > 0 &&
      phone.trim().length > 0 &&
      Boolean(gender) &&
      Boolean(dob) &&
      Boolean(courseCode) &&
      Boolean(year),
    [firstName, lastName, phone, gender, dob, courseCode, year]
  );

  const canSubmit = useMemo(() => {
    if (!canNextStep1) return false;
    if (existingProfile?.approval_status === "rejected") {
      // Must upload a fresh, valid photo to replace the rejected one
      return idCardFile !== null;
    }
    return idCardFile !== null || Boolean(existingProfile?.id_card_path);
  }, [canNextStep1, idCardFile, existingProfile?.approval_status, existingProfile?.id_card_path]);

  async function handleCroppedPhoto(file: File) {
    if (!file || !user) return;
    setAvatarUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `onboarding/${user.id}.${ext}`;
      const { error } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      setAvatarUrl(`${data.publicUrl}?v=${Date.now()}`);
      toast.success("Profile photo updated");
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
    } finally {
      setAvatarUploading(false);
    }
  }

  function handleSelectIdFile(file: File) {
    setIdCardFile(file);
    const objectUrl = URL.createObjectURL(file);
    setIdCardPreviewUrl(objectUrl);
  }

  function handleRemoveIdFile() {
    if (idCardPreviewUrl && idCardFile) {
      URL.revokeObjectURL(idCardPreviewUrl);
    }
    setIdCardFile(null);
    setIdCardPreviewUrl(null);
  }

  async function handleSubmit() {
    if (!user || !canSubmit) return;
    setLoading(true);
    setUploadProgress(15);

    try {
      const course = COURSES.find((c) => c.code === courseCode)!;
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();

      // If enrollment number was entered, check uniqueness
      if (enrollment.trim()) {
        const { data: existing } = await supabase
          .from("profiles")
          .select("user_id")
          .ilike("enrollment_number", enrollment.trim())
          .neq("user_id", user.id)
          .maybeSingle();
        if (existing) {
          throw new Error("This enrollment number is already registered to another account.");
        }
      }

      let storagePath = existingProfile?.id_card_path || "";

      // 1. Upload College ID Card to private Storage bucket if newly selected
      if (idCardFile) {
        setUploadProgress(40);
        const rawExt = idCardFile.name.split(".").pop()?.toLowerCase() || "jpg";
        const safeExt = ["jpg", "jpeg", "png", "webp"].includes(rawExt) ? rawExt : "jpg";
        storagePath = `${user.id}/college-id-${Date.now()}.${safeExt}`;

        const { error: uploadErr } = await supabase.storage
          .from("student-id-cards")
          .upload(storagePath, idCardFile, {
            upsert: true,
            contentType: idCardFile.type,
          });

        if (uploadErr) {
          throw new Error(`Failed to upload ID card image: ${uploadErr.message}`);
        }

        setUploadProgress(75);

        // 2. Insert into student_verifications audit table
        const { error: verifErr } = await supabase.from("student_verifications").insert({
          user_id: user.id,
          document_type: "college_id",
          storage_path: storagePath,
          file_name: idCardFile.name,
          file_size: idCardFile.size,
          mime_type: idCardFile.type,
          status: "pending",
        });

        if (verifErr) {
          console.error("Non-fatal verification log error:", verifErr);
        }
      }

      setUploadProgress(90);

      // 3. Upsert student profile with all details and pending verification status
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
        enrollment_number: enrollment.trim() || null,
        student_id: studentId.trim() || null,
        course_code: course.code,
        course_name: course.name,
        academic_year: year,
        profile_completed: true,
        approval_status: "pending",
        id_card_path: storagePath,
        id_card_status: "pending",
        id_card_submitted_at: new Date().toISOString(),
        profile_submitted_at: new Date().toISOString(),
        rejection_reason: null,
        id_card_rejection_reason: null,
      };

      const { error: profileErr } = await supabase
        .from("profiles")
        .upsert(payload, { onConflict: "user_id" });

      if (profileErr) throw profileErr;

      // Ensure student role exists
      await supabase
        .from("user_roles")
        .upsert({ user_id: user.id, role: "student" }, { onConflict: "user_id,role" });

      setUploadProgress(100);
      await qc.invalidateQueries({ queryKey: ["onboarding_status", user.id] });

      toast.success("Verification submitted! 🎉", {
        description: "Your college ID card has been submitted for administrative review.",
      });

      navigate("/pending-approval", { replace: true });
    } catch (err: any) {
      const msg = err?.message ?? "Submission failed. Please try again.";
      toast.error(msg);
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-8 relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, hsl(var(--primary)) 1px, transparent 0)",
          backgroundSize: "32px 32px",
        }}
      />
      <div className="absolute top-1/4 -left-32 h-96 w-96 rounded-full bg-primary/10 blur-[120px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-[620px]">
        {/* Step Indicator Header */}
        <div className="mb-6 flex items-center gap-3">
          {[
            { n: 1, label: "Student Details" },
            { n: 2, label: "College ID Verification" },
          ].map(({ n, label }) => (
            <div key={n} className="flex-1 flex items-center gap-2.5">
              <div
                className={`h-9 w-9 rounded-full flex items-center justify-center text-[13px] font-bold border transition-all ${
                  step >= n
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-surface-2 text-muted-foreground border-border-subtle"
                }`}
              >
                {step > n ? <CheckCircle2 className="h-4 w-4" /> : n}
              </div>
              <div className="min-w-0 flex-1">
                <p className={`text-[12px] font-semibold truncate ${step >= n ? "text-foreground" : "text-muted-foreground"}`}>
                  {label}
                </p>
                <div
                  className={`h-1 w-full rounded-full mt-1 transition-colors ${
                    step > n ? "bg-primary" : "bg-border-subtle"
                  }`}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Main Card Container */}
        <div className="rounded-2xl border border-border-subtle bg-surface-1/90 backdrop-blur-xl p-6 sm:p-8 shadow-2xl">
          <AnimatePresence mode="wait">
            {/* STEP 1: Personal & Academic Details */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.2 }}
                className="space-y-5"
              >
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <UserIcon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-[20px] font-bold tracking-tight">Basic Student Information</h1>
                    <p className="text-[13px] text-muted-foreground">
                      Tell us about yourself and your academic degree at BKBNC
                    </p>
                  </div>
                </div>

                {/* Profile Photo Cropper */}
                <ImageCropper
                  aspectRatio={1}
                  cropShape="round"
                  title="Crop Profile Photo"
                  description="Adjust and center your photo inside the circle for your student avatar."
                  isSaving={avatarUploading}
                  onCropComplete={async ({ file }) => {
                    await handleCroppedPhoto(file);
                  }}
                >
                  {({ triggerFileInput }) => (
                    <div className="flex items-center gap-4 p-3 rounded-xl border border-border-subtle bg-surface-2/50">
                      <div className="h-16 w-16 rounded-full overflow-hidden bg-surface-2 border border-border-subtle flex items-center justify-center shrink-0">
                        {avatarUrl ? (
                          <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <UserIcon className="h-7 w-7 text-muted-foreground" />
                        )}
                      </div>
                      <div className="space-y-1">
                        <button
                          type="button"
                          onClick={triggerFileInput}
                          disabled={avatarUploading}
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border-subtle bg-surface-2 hover:bg-surface-3 text-[12px] font-semibold transition-colors cursor-pointer"
                        >
                          {avatarUploading ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Upload className="h-3.5 w-3.5" />
                          )}
                          {avatarUrl ? "Change Photo" : "Upload Profile Avatar"}
                        </button>
                        <p className="text-[11px] text-muted-foreground">Optional profile photo for campus directory.</p>
                      </div>
                    </div>
                  )}
                </ImageCropper>

                {/* Name & Contact Grid */}
                <div className="grid grid-cols-2 gap-3.5">
                  <Field label="First Name" required>
                    <Input
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="e.g. Rahul"
                      className="h-10"
                    />
                  </Field>
                  <Field label="Last Name" required>
                    <Input
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="e.g. Sharma"
                      className="h-10"
                    />
                  </Field>
                  <Field label="Phone Number" required>
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98XXXXXXXX"
                      inputMode="tel"
                      className="h-10"
                    />
                  </Field>
                  <Field label="Gender" required>
                    <Select value={gender} onValueChange={(v) => setGender(v as Gender)}>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <div className="col-span-2">
                    <Field label="Date of Birth" required>
                      <Input
                        type="date"
                        value={dob}
                        onChange={(e) => setDob(e.target.value)}
                        max={new Date().toISOString().slice(0, 10)}
                        className="h-10"
                      />
                    </Field>
                  </div>
                  <div className="col-span-2">
                    <Field label="College Email">
                      <Input value={email} disabled className="opacity-70 h-10" />
                    </Field>
                  </div>
                </div>

                {/* Academic Degree Section */}
                <div className="pt-2 border-t border-border-subtle space-y-3.5">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-primary" />
                    <span className="text-[13px] font-bold text-foreground">Academic Programme</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <Field label="Degree Course" required>
                      <Select value={courseCode} onValueChange={setCourseCode}>
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="Select your course" />
                        </SelectTrigger>
                        <SelectContent>
                          {COURSES.map((c) => (
                            <SelectItem key={c.code} value={c.code}>
                              {c.name} <span className="text-muted-foreground ml-1">({c.code})</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>

                    <Field label="Academic Year" required>
                      <Select value={year} onValueChange={setYear}>
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="Select year" />
                        </SelectTrigger>
                        <SelectContent>
                          {ACADEMIC_YEARS.map((y) => (
                            <SelectItem key={y.value} value={y.value}>
                              {y.label} ({y.value})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>

                  {/* Optional MU Enrollment Number & College Student ID */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                    <Field
                      label="MU Enrollment Number / PRN"
                      hint="Optional — if already issued by Mumbai University. You can also add this later in your profile."
                    >
                      <Input
                        value={enrollment}
                        onChange={(e) => setEnrollment(e.target.value)}
                        placeholder="e.g. 2024XXXXXXX (Optional)"
                        className="h-10 font-mono text-[13px]"
                      />
                    </Field>

                    <Field
                      label="College Student ID / Roll No"
                      hint="Optional — if assigned on your college fee receipt or card."
                    >
                      <Input
                        value={studentId}
                        onChange={(e) => setStudentId(e.target.value)}
                        placeholder="e.g. CS-2024-001 (Optional)"
                        className="h-10 font-mono text-[13px]"
                      />
                    </Field>
                  </div>
                </div>

                <Button
                  className="w-full mt-6 h-11 gap-2 text-[14px] font-bold shadow-md shadow-primary/20"
                  disabled={!canNextStep1}
                  onClick={() => setStep(2)}
                >
                  Continue to College ID Verification <ArrowRight className="h-4 w-4" />
                </Button>
              </motion.div>
            )}

            {/* STEP 2: Verify College Identity (Upload College ID Card) */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.2 }}
                className="space-y-5"
              >
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <ShieldCheck className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-[20px] font-bold tracking-tight">Verify Your College Identity</h1>
                    <p className="text-[13px] text-muted-foreground">
                      Upload a clear photo of your valid college ID card to confirm that you're a student of B. K. Birla Night College.
                    </p>
                  </div>
                </div>

                {/* College ID Upload Component */}
                <CollegeIdUploadCard
                  selectedFile={idCardFile}
                  previewUrl={idCardPreviewUrl}
                  onFileSelect={handleSelectIdFile}
                  onFileRemove={handleRemoveIdFile}
                  isUploading={loading}
                  uploadProgress={uploadProgress}
                  disabled={loading}
                  previousRejectionReason={existingProfile?.id_card_rejection_reason || existingProfile?.rejection_reason}
                />

                {/* Bottom Navigation CTAs */}
                <div className="flex gap-2.5 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1 h-11 gap-2 border-border-subtle"
                    onClick={() => setStep(1)}
                    disabled={loading}
                  >
                    <ArrowLeft className="h-4 w-4" /> Back to Details
                  </Button>
                  <Button
                    className="flex-[1.5] h-11 gap-2 font-bold shadow-md shadow-primary/25"
                    disabled={!canSubmit || loading}
                    onClick={handleSubmit}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Submitting Verification…
                      </>
                    ) : (
                      <>
                        Submit ID for Verification <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <p className="text-center mt-4 text-[12px] text-muted-foreground">
          Step {step} of 2 · Secured by B. K. Birla Night College Administrative Verification
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[13px] font-semibold text-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground leading-snug">{hint}</p>}
    </div>
  );
}
