/**
 * College-scoped data hooks.
 *
 * All hooks automatically scope queries to the current tenant (college_id)
 * obtained from TenantProvider.  Super admins pass an explicit collegeId.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/providers/TenantProvider";

// ─── Departments ─────────────────────────────────────────────────────────────

export function useDepartments(overrideCollegeId?: string | null) {
  const tenantId = useTenantId();
  const cid = overrideCollegeId ?? tenantId;

  return useQuery({
    queryKey: ["departments", cid],
    enabled: Boolean(cid),
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departments")
        .select("id, college_id, name, description, is_active, created_at")
        .eq("college_id", cid!)
        .eq("is_active", true)
        .order("name", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

// ─── Classes ─────────────────────────────────────────────────────────────────

export function useClasses(overrideCollegeId?: string | null, departmentId?: string | null) {
  const tenantId = useTenantId();
  const cid = overrideCollegeId ?? tenantId;

  return useQuery({
    queryKey: ["classes", cid, departmentId],
    enabled: Boolean(cid),
    staleTime: 60_000,
    queryFn: async () => {
      let query = supabase
        .from("classes")
        .select("id, college_id, department_id, name, year, section, is_active, created_at")
        .eq("college_id", cid!)
        .eq("is_active", true)
        .order("year", { ascending: true })
        .order("name", { ascending: true });

      if (departmentId) {
        query = query.eq("department_id", departmentId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });
}

// ─── College-scoped students ──────────────────────────────────────────────────

export function useCollegeStudents(overrideCollegeId?: string | null) {
  const tenantId = useTenantId();
  const cid = overrideCollegeId ?? tenantId;

  return useQuery({
    queryKey: ["college_students", cid],
    enabled: Boolean(cid),
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, name, email, student_id, class_name, department, is_verified, avatar_url, college_id, created_at")
        .eq("college_id", cid!)
        .eq("is_deleted", false)
        .order("name", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

// ─── College-scoped lectures ──────────────────────────────────────────────────

export function useCollegeLectures(
  overrideCollegeId?: string | null,
  opts?: { status?: string; limit?: number }
) {
  const tenantId = useTenantId();
  const cid = overrideCollegeId ?? tenantId;
  const { status, limit = 50 } = opts ?? {};

  return useQuery({
    queryKey: ["college_lectures", cid, status, limit],
    enabled: Boolean(cid),
    staleTime: 30_000,
    queryFn: async () => {
      let query = supabase
        .from("lectures")
        .select("id, college_id, topic, venue, lecture_date, start_time, end_time, status, created_at")
        .eq("college_id", cid!)
        .order("lecture_date", { ascending: false })
        .limit(limit);

      if (status) {
        query = query.eq("status", status as "scheduled" | "live" | "ended");
      }

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });
}

// ─── College-scoped analytics ─────────────────────────────────────────────────

export function useCollegeAnalytics(overrideCollegeId?: string | null) {
  const tenantId = useTenantId();
  const cid = overrideCollegeId ?? tenantId;

  return useQuery({
    queryKey: ["college_analytics", cid],
    enabled: Boolean(cid),
    staleTime: 60_000,
    queryFn: async () => {
      const [studentsRes, lecturesRes, attendanceRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("college_id", cid!)
          .eq("is_deleted", false),
        supabase
          .from("lectures")
          .select("id", { count: "exact", head: true })
          .eq("college_id", cid!),
        supabase
          .from("attendance")
          .select("id", { count: "exact", head: true })
          .eq("college_id", cid!)
          .eq("status", "present"),
      ]);

      return {
        totalStudents: studentsRes.count ?? 0,
        totalLectures: lecturesRes.count ?? 0,
        totalAttendance: attendanceRes.count ?? 0,
      };
    },
  });
}
