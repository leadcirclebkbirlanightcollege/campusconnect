import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import {
  UserCircle, Mail, Phone, Building2, Shield,
  Lock, KeyRound, Camera, Trash2, CheckCircle2,
  AlertCircle, Save, X, Sparkles, GraduationCap,
  BadgeCheck, LogOut, Loader2
} from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageCropper } from "@/components/image/ImageCropper";

// Validation schema for profile details
const profileSchema = z.object({
  name: z.string().trim().min(2, "Full name must be at least 2 characters").max(100),
  email: z.string().trim().email("Invalid email address"),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  department: z.string().trim().max(100).optional().or(z.literal("")),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

// Password change schema
const passwordSchema = z.object({
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Confirm password required"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type PasswordFormValues = z.infer<typeof passwordSchema>;

export default function FacultyProfile() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Fetch full faculty profile data
  const { data: profile, isLoading, error: profileError } = useQuery({
    queryKey: ["faculty", "profile", user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("name,email,phone,department,college_id,avatar_url,created_at,colleges(college_name)")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      department: "",
    },
  });

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Sync profile data to form
  useEffect(() => {
    if (profile) {
      form.reset({
        name: profile.name || "",
        email: profile.email || user?.email || "",
        phone: profile.phone || "",
        department: profile.department || "",
      });
      setAvatarPreview(profile.avatar_url || null);
    }
  }, [profile, user, form]);

  // Update Profile Mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (values: ProfileFormValues) => {
      if (!user?.id) throw new Error("Authentication required");

      // Check if email changed
      if (values.email && values.email.toLowerCase() !== (profile?.email || user.email)?.toLowerCase()) {
        const { error: emailErr } = await supabase.auth.updateUser({ email: values.email });
        if (emailErr) throw new Error(`Failed to update auth email: ${emailErr.message}`);
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          name: values.name.trim(),
          email: values.email.trim(),
          phone: values.phone?.trim() || null,
          department: values.department?.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profile updated successfully!");
      setIsEditing(false);
      qc.invalidateQueries({ queryKey: ["faculty", "profile"] });
      qc.invalidateQueries({ queryKey: ["settings", "profile"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update profile. Please try again.");
    },
  });

  // Upload Avatar Mutation
  const uploadAvatarMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!user?.id) throw new Error("Authentication required");
      
      // File validation
      if (!file.type.startsWith("image/")) {
        throw new Error("Please select an image file (JPG, PNG, WebP)");
      }
      if (file.size > 3 * 1024 * 1024) {
        throw new Error("Image file size must be less than 3MB");
      }

      const ext = (file.name.split(".").pop() || "jpg").replace(/[^a-z0-9]/gi, "").toLowerCase();
      const path = `${user.id}/avatar-${Date.now()}.${ext || "jpg"}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });

      if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

      const { data: publicUrl } = supabase.storage.from("avatars").getPublicUrl(path);

      const { error: dbError } = await supabase
        .from("profiles")
        .update({
          avatar_url: publicUrl.publicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (dbError) throw dbError;

      return publicUrl.publicUrl;
    },
    onSuccess: (url) => {
      setAvatarPreview(url);
      toast.success("Profile photo updated!");
      qc.invalidateQueries({ queryKey: ["faculty", "profile"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to upload photo");
    },
  });

  // Remove Avatar Mutation
  const removeAvatarMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Authentication required");
      const { error } = await supabase
        .from("profiles")
        .update({
          avatar_url: null,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      setAvatarPreview(null);
      toast.success("Profile photo removed");
      qc.invalidateQueries({ queryKey: ["faculty", "profile"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to remove photo");
    },
  });

  // Password Update Mutation
  const updatePasswordMutation = useMutation({
    mutationFn: async (values: PasswordFormValues) => {
      const { error } = await supabase.auth.updateUser({
        password: values.newPassword,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Password changed successfully!");
      passwordForm.reset();
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update password");
    },
  });

  const displayName = profile?.name || "Faculty Member";
  const collegeName = (profile as any)?.colleges?.college_name || "Campus Connect Institution";
  const departmentName = profile?.department || "Department not specified";
  const designationTitle = "Faculty Member";

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl">
        <Skeleton className="h-44 w-full rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-80 rounded-2xl" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl pb-12">
      {/* Page Header */}
      <div>
        <h1 className="text-[20px] font-bold text-foreground tracking-tight">Faculty Profile</h1>
        <p className="text-[13px] text-muted-foreground mt-0.5">
          Manage your faculty identity, contact details, and account security.
        </p>
      </div>

      {/* Main Profile Header Card */}
      <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-2xs">
        <ImageCropper
          aspectRatio={1}
          cropShape="rect"
          title="Crop Faculty Profile Photo"
          description="Drag to reposition and zoom your profile photo inside the square."
          isSaving={uploadAvatarMutation.isPending}
          onCropComplete={async ({ file }) => {
            await uploadAvatarMutation.mutateAsync(file);
          }}
        >
          {({ triggerFileInput }) => (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                {/* Avatar with Overlay Upload Button */}
                <div className="relative group shrink-0">
                  <div className="h-20 w-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden text-primary font-bold text-2xl shadow-xs">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt={displayName} className="h-full w-full object-cover" />
                    ) : (
                      displayName.charAt(0).toUpperCase()
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={triggerFileInput}
                    disabled={uploadAvatarMutation.isPending}
                    aria-label="Upload profile photo"
                    className="absolute inset-0 rounded-2xl bg-foreground/60 text-background opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 cursor-pointer"
                  >
                    {uploadAvatarMutation.isPending ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        <Camera className="h-5 w-5" />
                        <span className="text-[9.5px] font-medium">Change</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Identity Text */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-[18px] font-bold text-foreground tracking-tight truncate">{displayName}</h2>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20">
                      <BadgeCheck className="h-3 w-3" /> Faculty
                    </span>
                  </div>
                  <p className="text-[13px] text-muted-foreground mt-0.5 flex items-center gap-1.5 truncate">
                    <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                    <span>{designationTitle} · {departmentName}</span>
                  </p>
                  <p className="text-[11.5px] text-muted-foreground/80 mt-1 truncate">
                    {collegeName}
                  </p>
                </div>
              </div>

              {/* Quick Avatar Actions */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={triggerFileInput}
                  disabled={uploadAvatarMutation.isPending}
                  className="rounded-xl text-[12px] h-9 gap-1.5 flex-1 sm:flex-initial"
                >
                  <Camera className="h-3.5 w-3.5" />
                  Change Photo
                </Button>
                {avatarPreview && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeAvatarMutation.mutate()}
                    disabled={removeAvatarMutation.isPending}
                    className="rounded-xl text-[12px] h-9 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          )}
        </ImageCropper>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Editable Information */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-2xs">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-border/40">
              <div>
                <h3 className="text-[14px] font-bold text-foreground">Faculty Information</h3>
                <p className="text-[11.5px] text-muted-foreground">
                  Update your contact details and academic role
                </p>
              </div>
              {!isEditing ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="rounded-xl text-[12px] h-8.5 font-medium"
                >
                  Edit Profile
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsEditing(false);
                    form.reset();
                  }}
                  className="rounded-xl text-[12px] h-8.5 text-muted-foreground"
                >
                  <X className="h-3.5 w-3.5 mr-1" /> Cancel
                </Button>
              )}
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit((v) => updateProfileMutation.mutate(v))} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[12px] font-medium text-foreground">Full Name</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            disabled={!isEditing}
                            placeholder="Dr. Full Name"
                            className="rounded-xl text-[13px] bg-background border-border/50 disabled:bg-muted/40 disabled:text-foreground"
                          />
                        </FormControl>
                        <FormMessage className="text-[11px]" />
                      </FormItem>
                    )}
                  />

                  {/* Email */}
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[12px] font-medium text-foreground">Email Address</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            disabled={!isEditing}
                            type="email"
                            placeholder="faculty@university.edu"
                            className="rounded-xl text-[13px] bg-background border-border/50 disabled:bg-muted/40 disabled:text-foreground"
                          />
                        </FormControl>
                        <FormMessage className="text-[11px]" />
                      </FormItem>
                    )}
                  />

                  {/* Phone */}
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[12px] font-medium text-foreground">Phone Number</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            disabled={!isEditing}
                            placeholder="+91 98765 43210"
                            className="rounded-xl text-[13px] bg-background border-border/50 disabled:bg-muted/40 disabled:text-foreground"
                          />
                        </FormControl>
                        <FormMessage className="text-[11px]" />
                      </FormItem>
                    )}
                  />

                  {/* Department */}
                  <FormField
                    control={form.control}
                    name="department"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel className="text-[12px] font-medium text-foreground">Department</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            disabled={!isEditing}
                            placeholder="Computer Science / IT"
                            className="rounded-xl text-[13px] bg-background border-border/50 disabled:bg-muted/40 disabled:text-foreground"
                          />
                        </FormControl>
                        <FormMessage className="text-[11px]" />
                      </FormItem>
                    )}
                  />
                </div>

                {isEditing && (
                  <div className="pt-3 flex justify-end gap-2 border-t border-border/40">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsEditing(false);
                        form.reset();
                      }}
                      className="rounded-xl text-[12px] h-9"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={updateProfileMutation.isPending}
                      className="rounded-xl text-[12px] h-9 gap-1.5 px-4"
                    >
                      {updateProfileMutation.isPending ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…
                        </>
                      ) : (
                        <>
                          <Save className="h-3.5 w-3.5" /> Save Changes
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </form>
            </Form>
          </div>

          {/* Security / Password Change */}
          <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-2xs">
            <div className="pb-4 mb-4 border-b border-border/40 flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Lock className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-[14px] font-bold text-foreground">Account Security</h3>
                <p className="text-[11.5px] text-muted-foreground">
                  Update your authentication password
                </p>
              </div>
            </div>

            <Form {...passwordForm}>
              <form onSubmit={passwordForm.handleSubmit((v) => updatePasswordMutation.mutate(v))} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={passwordForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[12px] font-medium text-foreground">New Password</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="password"
                            placeholder="At least 6 characters"
                            className="rounded-xl text-[13px] bg-background border-border/50"
                          />
                        </FormControl>
                        <FormMessage className="text-[11px]" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={passwordForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[12px] font-medium text-foreground">Confirm Password</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="password"
                            placeholder="Re-type new password"
                            className="rounded-xl text-[13px] bg-background border-border/50"
                          />
                        </FormControl>
                        <FormMessage className="text-[11px]" />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    type="submit"
                    size="sm"
                    variant="outline"
                    disabled={updatePasswordMutation.isPending}
                    className="rounded-xl text-[12px] h-9 gap-1.5"
                  >
                    {updatePasswordMutation.isPending ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Updating…
                      </>
                    ) : (
                      <>
                        <KeyRound className="h-3.5 w-3.5" /> Update Password
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </div>

        {/* Right 1 Col: Institution & System Metadata */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-2xs space-y-4">
            <h3 className="text-[13.5px] font-bold text-foreground flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-primary" />
              Institutional Scope
            </h3>

            <div className="space-y-3 text-[12.5px]">
              <div className="p-3 rounded-xl bg-muted/30 border border-border/40">
                <p className="text-[11px] text-muted-foreground font-medium">Affiliated College</p>
                <p className="text-[13px] font-semibold text-foreground mt-0.5">{collegeName}</p>
                <p className="text-[10px] text-muted-foreground mt-1">System managed affiliation</p>
              </div>

              <div className="p-3 rounded-xl bg-muted/30 border border-border/40">
                <p className="text-[11px] text-muted-foreground font-medium">Account Role</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="h-2 w-2 rounded-full bg-success inline-block" />
                  <span className="text-[13px] font-semibold text-foreground">Verified Faculty</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-muted/30 border border-border/40">
                <p className="text-[11px] text-muted-foreground font-medium">Account ID</p>
                <p className="text-[11px] font-mono text-muted-foreground mt-0.5 truncate">{user?.id}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
