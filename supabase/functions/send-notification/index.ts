import { createClient } from "npm:@supabase/supabase-js@2.90.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type TargetType =
  | "all_colleges"
  | "college"
  | "admins_only"
  | "students_only"
  | "college_students"
  | "class"
  | "user";

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function resolveRecipientIds(
  db: ReturnType<typeof createClient>,
  role: "admin" | "super_admin",
  callerCollegeId: string | null,
  targetType: TargetType,
  targetValue?: string | null,
) {
  const value = targetValue?.trim() || null;

  if (targetType === "user" && value) return [value];

  if (targetType === "all_colleges") {
    const { data, error } = await db.from("profiles").select("user_id,is_deleted").eq("is_deleted", false);
    if (error) throw error;
    return (data ?? []).map((r: any) => r.user_id);
  }

  if (targetType === "college") {
    if (!value) return [];
    const { data, error } = await db
      .from("user_roles")
      .select("user_id")
      .eq("college_id", value)
      .in("role", ["student", "admin"]);
    if (error) throw error;
    return (data ?? []).map((r: any) => r.user_id);
  }

  if (targetType === "admins_only") {
    const { data, error } = await db.from("user_roles").select("user_id").eq("role", "admin");
    if (error) throw error;
    return (data ?? []).map((r: any) => r.user_id);
  }

  if (targetType === "students_only") {
    const { data, error } = await db.from("user_roles").select("user_id").eq("role", "student");
    if (error) throw error;
    return (data ?? []).map((r: any) => r.user_id);
  }

  if (targetType === "college_students") {
    const collegeId = role === "admin" ? callerCollegeId : value;
    if (!collegeId) return [];
    const { data, error } = await db
      .from("user_roles")
      .select("user_id")
      .eq("role", "student")
      .eq("college_id", collegeId);
    if (error) throw error;
    return (data ?? []).map((r: any) => r.user_id);
  }

  if (targetType === "class") {
    if (!value || !callerCollegeId) return [];
    const { data, error } = await db
      .from("profiles")
      .select("user_id")
      .eq("college_id", callerCollegeId)
      .eq("class_name", value)
      .eq("is_deleted", false);
    if (error) throw error;
    return (data ?? []).map((r: any) => r.user_id);
  }

  return [];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json(401, { success: false, error: "Unauthorized" });

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData.user) return json(401, { success: false, error: "Invalid token" });

    const callerId = authData.user.id;
    const db = createClient(supabaseUrl, serviceKey);

    const { data: roles, error: roleError } = await db
      .from("user_roles")
      .select("role,college_id")
      .eq("user_id", callerId)
      .in("role", ["admin", "super_admin"]);

    if (roleError) throw roleError;
    const caller = (roles ?? []).find((r: any) => r.role === "super_admin") ?? (roles ?? [])[0];

    if (!caller) return json(403, { success: false, error: "Admin access required" });

    const role = caller.role as "admin" | "super_admin";
    const callerCollegeId = (caller.college_id as string | null) ?? null;

    const body = await req.json().catch(() => null) as {
      title?: string;
      message?: string;
      kind?: string;
      target_type?: TargetType;
      target_value?: string | null;
    } | null;

    const title = body?.title?.trim();
    const message = body?.message?.trim();
    const kind = body?.kind?.trim() || "general";
    const targetType = body?.target_type;
    const targetValue = body?.target_value ?? null;

    if (!title || !message || !targetType) {
      return json(400, { success: false, error: "title, message and target_type are required" });
    }

    const recipients = await resolveRecipientIds(db, role, callerCollegeId, targetType, targetValue);

    const nowIso = new Date().toISOString();
    const targetRole = targetType === "students_only" || targetType === "college_students" || targetType === "class"
      ? "student"
      : targetType === "admins_only"
        ? "admin"
        : null;
    const targetUserId = targetType === "user" ? targetValue : null;

    const { data: notification, error: notificationError } = await db
      .from("notifications")
      .insert({
        title,
        body: message,
        kind,
        created_by: callerId,
        status: "sent",
        sent_at: nowIso,
        target_role: targetRole,
        target_user_id: targetUserId,
      })
      .select("id")
      .single();

    if (notificationError) throw notificationError;

    const uniqRecipients = [...new Set(recipients)];
    if (uniqRecipients.length > 0) {
      const { error: recipientError } = await db.from("notification_recipients").insert(
        uniqRecipients.map((userId) => ({
          notification_id: notification.id,
          user_id: userId,
        }))
      );
      if (recipientError) throw recipientError;
    }

    return json(200, {
      success: true,
      notification_id: notification.id,
      recipients: uniqRecipients.length,
    });
  } catch (error) {
    console.error("send-notification error", error);
    return json(500, { success: false, error: "Internal server error" });
  }
});
