import { ReactNode } from "react";

import AppShell from "@/components/layout/AppShell";
import AdminShell from "@/components/layout/AdminShell";
import FullPageLoader from "@/components/system/FullPageLoader";
import { useAuth } from "@/contexts/AuthContext";

export default function RoleShell({ children }: { children: ReactNode }) {
  const { status, role } = useAuth();

  if (status === "loading") return <FullPageLoader label="Checking session…" />;

  if (role === "admin") {
    return <AdminShell>{children}</AdminShell>;
  }

  return <AppShell>{children}</AppShell>;
}
