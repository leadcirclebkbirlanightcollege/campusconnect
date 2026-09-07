import type { SupabaseClient } from "@supabase/supabase-js";
import type { QueryClient } from "@tanstack/react-query";

/**
 * Authoritative query for current approved, active students.
 * Business rules:
 * - role = 'student'
 * - approval_status = 'approved'
 * - is_deleted = false
 * - matches college_id if provided
 */
export async function fetchApprovedStudentCount(
  supabase: SupabaseClient<any>,
  collegeId?: string | null
): Promise<number> {
  // Primary: Authoritative database function
  try {
    const { data, error } = await supabase.rpc(
      "get_approved_student_count",
      collegeId ? { p_college_id: collegeId } : {}
    );
    if (!error && typeof data === "number") {
      return data;
    }
    if (error) {
      console.warn("get_approved_student_count RPC error, using resilient fallback:", error);
    }
  } catch (rpcErr) {
    console.warn("get_approved_student_count RPC invocation failed:", rpcErr);
  }

  // Resilient fallback:
  // 1. Fetch user IDs with role='student' (scoped to college if provided)
  try {
    let rolesQuery = supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "student");

    if (collegeId) {
      rolesQuery = rolesQuery.eq("college_id", collegeId);
    }

    const { data: roles, error: rolesErr } = await rolesQuery;
    if (rolesErr || !roles || roles.length === 0) {
      return 0;
    }

    const userIds = roles.map((r) => r.user_id).filter(Boolean);
    if (userIds.length === 0) return 0;

    // 2. Count approved, active profiles among those student user IDs
    const { count, error: countErr } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .in("user_id", userIds)
      .eq("approval_status", "approved")
      .eq("is_deleted", false);

    if (countErr) {
      console.error("Failed to count approved student profiles fallback:", countErr);
      return 0;
    }

    return count ?? 0;
  } catch (err) {
    console.error("Error in student count fallback:", err);
    return 0;
  }
}

/**
 * Invalidates all queries affected by student mutations
 * (approvals, rejections, additions, soft-deletes, restores, promotions).
 */
export async function invalidateStudentQueries(qc: QueryClient) {
  await Promise.all([
    qc.invalidateQueries({ queryKey: ["admin", "students"] }),
    qc.invalidateQueries({ queryKey: ["admin", "cc", "metrics"] }),
    qc.invalidateQueries({ queryKey: ["admin", "student_count"] }),
    qc.invalidateQueries({ queryKey: ["verification"] }),
    qc.invalidateQueries({ queryKey: ["admin_overview"] }),
  ]);
}
