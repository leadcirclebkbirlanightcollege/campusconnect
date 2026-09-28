import { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "@/components/icons";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import AppShell from "@/components/layout/AppShell";
import AdminShell from "@/components/layout/AdminShell";

export default function RoleShell({ children }: { children: ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();

  const roleQuery = useQuery({
    queryKey: ["role_shell", "role", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const uid = user!.id;
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid)
        .maybeSingle();
      if (error) throw error;
      return (data?.role as "admin" | "student" | "super_admin" | null) ?? null;
    },
  });

  if (authLoading || (user?.id && roleQuery.isLoading)) {
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
