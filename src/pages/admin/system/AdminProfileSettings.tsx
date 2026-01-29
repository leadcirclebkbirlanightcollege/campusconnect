import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { KeyRound, Save, Shield } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import AdminRoleBackfillPanel from "@/pages/admin/system/AdminRoleBackfillPanel";

const profileSchema = z.object({
  name: z.string().min(2, "Name is required"),
  phone: z.string().optional(),
});

type ProfileRow = {
  name: string;
  email: string;
  phone: string | null;
};

const passwordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirm: z.string().min(8),
  })
  .refine((v) => v.password === v.confirm, { message: "Passwords do not match", path: ["confirm"] });

export default function AdminProfileSettings() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const meQuery = useQuery({
    queryKey: ["admin", "me"],
    queryFn: async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      if (!data.user) throw new Error("Not logged in");
      return data.user;
    },
  });

  const profileQuery = useQuery({
    queryKey: ["admin", "profile", meQuery.data?.id],
    enabled: Boolean(meQuery.data?.id),
    queryFn: async (): Promise<ProfileRow | null> => {
      const uid = meQuery.data!.id;
      const { data, error } = await supabase
        .from("profiles")
        .select("name,email,phone")
        .eq("user_id", uid)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as ProfileRow | null;
    },
  });

  useEffect(() => {
    if (!profileQuery.data) return;
    setName(profileQuery.data.name ?? "");
    setPhone(profileQuery.data.phone ?? "");
  }, [profileQuery.data]);

  const saveProfileMutation = useMutation({
    mutationFn: async () => {
      const parsed = profileSchema.safeParse({ name, phone });
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid profile");

      const uid = meQuery.data?.id;
      if (!uid) throw new Error("Not logged in");

      const { error } = await supabase
        .from("profiles")
        .update({
          name: parsed.data.name,
          phone: parsed.data.phone?.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", uid);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Admin info updated");
      await profileQuery.refetch();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to update"),
  });

  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      const parsed = passwordSchema.safeParse({ password, confirm });
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid password");

      const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Password updated");
      setPassword("");
      setConfirm("");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to update password"),
  });

  const busy =
    meQuery.isLoading ||
    profileQuery.isLoading ||
    saveProfileMutation.isPending ||
    changePasswordMutation.isPending;

  return (
    <div className="space-y-6">
      <Card className="border-primary/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Admin Profile
          </CardTitle>
          <CardDescription>Manage your admin information and security settings.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {profileQuery.isLoading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : profileQuery.isError ? (
            <div className="text-sm text-muted-foreground">Couldn’t load admin profile.</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Admin name</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Admin email</label>
                <Input value={profileQuery.data?.email ?? ""} disabled />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Phone</label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2">
            <Button type="button" className="gap-2" onClick={() => saveProfileMutation.mutate()} disabled={busy}>
              <Save className="h-4 w-4" />
              Save admin info
            </Button>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-primary" />
              <div className="font-medium">Change password</div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">New password</label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Confirm password</label>
                <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                onClick={() => changePasswordMutation.mutate()}
                disabled={busy || !password || !confirm}
              >
                <KeyRound className="h-4 w-4" />
                Update password
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              For security, use a strong password (8+ characters). You may need to log in again on some devices.
            </p>
          </div>
        </CardContent>
      </Card>

      <AdminRoleBackfillPanel />
    </div>
  );
}
