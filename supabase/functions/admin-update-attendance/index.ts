import { createClient } from "npm:@supabase/supabase-js@2.90.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  try {
    // 1. Validate JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json(401, { success: false, error: "Unauthorized" });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims) {
      return json(401, { success: false, error: "Invalid token" });
    }
    const adminId = claims.claims.sub as string;

    // 2. Verify admin role
    const db = createClient(supabaseUrl, serviceKey);
    const { data: roleRow } = await db
      .from("user_roles")
      .select("role")
      .eq("user_id", adminId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleRow) {
      return json(403, { success: false, error: "Admin access required" });
    }

    // 3. Parse body
    let body: any = {};
    try { body = await req.json(); } catch {
      return json(400, { success: false, error: "Invalid request body" });
    }

    const { attendanceId, newStatus, reason } = body;
    if (!attendanceId || !newStatus || !reason) {
      return json(400, { success: false, error: "attendanceId, newStatus, and reason are required" });
    }

    if (!["present", "absent"].includes(newStatus)) {
      return json(400, { success: false, error: "newStatus must be 'present' or 'absent'" });
    }

    if (typeof reason !== "string" || reason.trim().length < 3) {
      return json(400, { success: false, error: "Reason must be at least 3 characters" });
    }

    // 4. Rate limit: 20 edits per admin per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentEdits } = await db
      .from("attendance_audit_log")
      .select("id", { count: "exact", head: true })
      .eq("changed_by", adminId)
      .gte("changed_at", oneHourAgo);

    if ((recentEdits ?? 0) >= 20) {
      return json(429, { success: false, error: "Rate limit exceeded. Max 20 edits per hour." });
    }

    // 5. Fetch attendance row
    const { data: attRow, error: attErr } = await db
      .from("attendance")
      .select("id, lecture_id, student_user_id, status")
      .eq("id", attendanceId)
      .maybeSingle();

    if (attErr) {
      return json(500, { success: false, error: "Database error" });
    }
    if (!attRow) {
      return json(404, { success: false, error: "Attendance record not found" });
    }

    // 6. If status unchanged → return success without update
    if (attRow.status === newStatus) {
      return json(200, { success: true, old_status: attRow.status, new_status: newStatus, message: "No change needed" });
    }

    const oldStatus = attRow.status;

    // 7. Update attendance
    const { error: updateErr } = await db
      .from("attendance")
      .update({
        status: newStatus,
        edited_by: adminId,
        edited_at: new Date().toISOString(),
      })
      .eq("id", attendanceId);

    if (updateErr) {
      return json(500, { success: false, error: "Failed to update attendance" });
    }

    // 8. Insert audit log
    await db.from("attendance_audit_log").insert({
      attendance_id: attendanceId,
      lecture_id: attRow.lecture_id,
      student_user_id: attRow.student_user_id,
      old_status: oldStatus,
      new_status: newStatus,
      changed_by: adminId,
      reason: reason.trim(),
    });

    // 9. Trigger intelligence recompute (fire and forget)
    try {
      await db.functions.invoke("recompute-intelligence", {
        body: { userId: attRow.student_user_id },
      });
    } catch (e) {
      console.error("Intelligence recompute failed (non-blocking):", e);
    }

    // 10. Return structured JSON
    return json(200, {
      success: true,
      old_status: oldStatus,
      new_status: newStatus,
      student_user_id: attRow.student_user_id,
    });
  } catch (error) {
    console.error("admin-update-attendance error:", error);
    return json(500, { success: false, error: "Internal server error" });
  }
});
