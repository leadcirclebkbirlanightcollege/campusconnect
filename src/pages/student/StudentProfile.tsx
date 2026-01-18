import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Camera, LogOut, Save, UserRound } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const profileSchema = z.object({
  name: z.string().min(2, "Name is required"),
  phone: z.string().optional(),
  student_id: z.string().optional(),
  department: z.string().optional(),
  class_name: z.string().optional(),
});

type ProfileForm = z.infer<typeof profileSchema>;

type ProfileRow = {
  name: string;
  email: string;
  phone: string | null;
  student_id: string | null;
  department: string | null;
  class_name: string | null;
  avatar_url: string | null;
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
        .select("name,email,phone,student_id,department,class_name,avatar_url")
        .eq("user_id", uid)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as ProfileRow | null;
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
    navigate("/auth");
  };

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
    </main>
  );
}
