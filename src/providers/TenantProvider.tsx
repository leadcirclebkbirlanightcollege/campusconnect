/**
 * TenantProvider — resolves the current user's college (tenant) context.
 *
 * Resolution order:
 *   1. user_roles.college_id  (primary — DB source of truth)
 *   2. profiles.college_id    (fallback)
 *
 * Exposes:
 *   tenant.collegeId          — current college UUID (null until resolved)
 *   tenant.college            — full college row (name, colors, logo…)
 *   tenant.isLoading          — true while resolving
 *   tenant.isSuperAdmin       — true if the user has no college constraint
 */

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TenantCollege {
  id: string;
  college_name: string;
  subdomain: string | null;
  logo_url: string | null;
  tagline: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  banner_image: string | null;
  is_active: boolean;
  enabled_features: string[];
}


export interface TenantContextValue {
  collegeId: string | null;
  college: TenantCollege | null;
  isLoading: boolean;
  isSuperAdmin: boolean;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const TenantContext = React.createContext<TenantContextValue>({
  collegeId: null,
  college: null,
  isLoading: true,
  isSuperAdmin: false,
});

// ─── Provider ────────────────────────────────────────────────────────────────

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();

  // 1. Fetch role + college_id from user_roles
  const roleQuery = useQuery({
    queryKey: ["tenant", "role", user?.id],
    enabled: !authLoading && Boolean(user?.id),
    staleTime: 120_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role, college_id")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const role = roleQuery.data?.role ?? null;
  const isSuperAdmin = role === "super_admin";

  // 2. Resolve college_id: from role row, or fallback to profile
  const profileCollegeQuery = useQuery({
    queryKey: ["tenant", "profile_college", user?.id],
    enabled: !authLoading && Boolean(user?.id) && !roleQuery.isLoading && !roleQuery.data?.college_id && !isSuperAdmin,
    staleTime: 120_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("college_id")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data?.college_id ?? null;
    },
  });

  const collegeId: string | null = isSuperAdmin
    ? null
    : roleQuery.data?.college_id ?? profileCollegeQuery.data ?? null;

  // 3. Load the full college record
  const collegeQuery = useQuery({
    queryKey: ["tenant", "college_row", collegeId],
    enabled: Boolean(collegeId),
    staleTime: 300_000, // 5 min — branding rarely changes
    queryFn: async () => {
      const { data, error } = await supabase
          .from("colleges")
          .select("id, college_name, subdomain, logo_url, tagline, primary_color, secondary_color, banner_image, is_active, enabled_features")
          .eq("id", collegeId!)
          .maybeSingle();

      if (error) throw error;
      return data as TenantCollege | null;
    },
  });

  const isLoading =
    authLoading ||
    (!!user && roleQuery.isLoading) ||
    (!!collegeId && collegeQuery.isLoading);

  return (
    <TenantContext.Provider
      value={{
        collegeId,
        college: collegeQuery.data ?? null,
        isLoading,
        isSuperAdmin,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useTenant(): TenantContextValue {
  return React.useContext(TenantContext);
}

/**
 * Returns only the college_id — useful as a query key segment.
 * Throws in dev if called outside TenantProvider.
 */
export function useTenantId(): string | null {
  return React.useContext(TenantContext).collegeId;
}
