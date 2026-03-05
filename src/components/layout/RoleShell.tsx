import { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/layout/AppShell";
import AdminShell from "@/components/layout/AdminShell";

export default function RoleShell({ children }: { children: ReactNode }) {
  const authQuery = useQuery({
    queryKey: ["role_shell", "auth"],
    queryFn: async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      return data.user ?? null;
    },
  });

  const roleQuery = useQuery({
    queryKey: ["role_shell", "role", authQuery.data?.id],
    enabled: Boolean(authQuery.data?.id),
    queryFn: async () => {
      const uid = authQuery.data!.id;
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid)
        .maybeSingle();
      if (error) throw error;
      return (data?.role as "admin" | "student" | "super_admin" | null) ?? null;
    },
  });

  if (authQuery.isLoading || roleQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-primary/5">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (roleQuery.data === "super_admin") {
    // super_admin has their own shell-less dashboard
    return <>{children}</>;
  }

  if (roleQuery.data === "admin") {
    return <AdminShell>{children}</AdminShell>;
  }

  return <AppShell>{children}</AppShell>;
}
