// One-shot: HARD-DELETE every non-(admin/super_admin) user and ensure the two
// canonical staff accounts exist with the requested credentials.
// Auth: Bearer <SETUP_SECRET>
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.90.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (s: number, b: unknown) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const STUDENT_TABLES: Array<{ table: string; col: string }> = [
  { table: "attendance", col: "student_user_id" },
  { table: "attendance_audit_log", col: "student_user_id" },
  { table: "points_ledger", col: "user_id" },
  { table: "point_claims", col: "user_id" },
  { table: "student_programme_allotments", col: "user_id" },
  { table: "student_intelligence", col: "user_id" },
  { table: "student_streaks", col: "user_id" },
  { table: "student_achievements", col: "user_id" },
  { table: "daily_checkins", col: "user_id" },
  { table: "daily_rewards_log", col: "user_id" },
  { table: "notification_recipients", col: "user_id" },
  { table: "login_activity", col: "user_id" },
  { table: "feedback", col: "user_id" },
  { table: "account_deletion_requests", col: "user_id" },
  { table: "stall_registrations", col: "user_id" },
  { table: "notification_preferences", col: "user_id" },
  { table: "exam_results", col: "student_user_id" },
  { table: "messages", col: "sender_id" },
];

const SUPER = { email: "atharvajadhav2765@gmail.com", password: "SA@1328__", role: "super_admin", name: "Super Admin" };
const ADMIN = { email: "bkbnc.11@gmail.com", password: "admin123", role: "admin", name: "Administrator" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const setupSecret = Deno.env.get("SETUP_SECRET");
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!setupSecret || token !== setupSecret) return json(401, { error: "Unauthorized" });

  const url = Deno.env.get("SUPABASE_URL")!;
  const svc = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, svc);

  try {
    // 1) Identify users to KEEP (any user with admin or super_admin role) + the canonical emails.
    const { data: staffRoles, error: rolesErr } = await admin
      .from("user_roles")
      .select("user_id")
      .in("role", ["admin", "super_admin"]);
    if (rolesErr) return json(500, { error: rolesErr.message, step: "list_staff" });
    const keepIds = new Set((staffRoles ?? []).map((r) => r.user_id as string));

    // 2) List ALL auth users (paginate)
    const allUsers: { id: string; email?: string | null }[] = [];
    let page = 1;
    while (true) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) return json(500, { error: error.message, step: "list_users" });
      allUsers.push(...data.users.map((u) => ({ id: u.id, email: u.email })));
      if (data.users.length < 1000) break;
      page++;
    }

    // Always keep the two canonical accounts (will be ensured below even if they don't exist yet)
    for (const u of allUsers) {
      if (u.email && (u.email === SUPER.email || u.email === ADMIN.email)) keepIds.add(u.id);
    }

    // 3) Compute deletion set
    const deleteIds = allUsers.filter((u) => !keepIds.has(u.id)).map((u) => u.id);

    // 4) Delete dependent rows in chunks
    const tableCounts: Record<string, number> = {};
    const tableErrors: Record<string, string> = {};
    const CHUNK = 500;
    if (deleteIds.length) {
      for (const { table, col } of STUDENT_TABLES) {
        let total = 0;
        for (let i = 0; i < deleteIds.length; i += CHUNK) {
          const slice = deleteIds.slice(i, i + CHUNK);
          const { data, error } = await admin.from(table).delete().in(col, slice).select("*", { count: "exact", head: false });
          if (error) { tableErrors[table] = error.message; break; }
          total += data?.length ?? 0;
        }
        tableCounts[table] = total;
      }
      // user_roles + profiles
      let rolesDel = 0, profDel = 0;
      for (let i = 0; i < deleteIds.length; i += CHUNK) {
        const slice = deleteIds.slice(i, i + CHUNK);
        const { data: r } = await admin.from("user_roles").delete().in("user_id", slice).select("id");
        rolesDel += r?.length ?? 0;
        const { data: p } = await admin.from("profiles").delete().in("user_id", slice).select("user_id");
        profDel += p?.length ?? 0;
      }
      tableCounts["user_roles"] = rolesDel;
      tableCounts["profiles"] = profDel;
    }

    // 5) Delete auth users
    let authDeleted = 0;
    const authErrors: string[] = [];
    for (const uid of deleteIds) {
      const { error } = await admin.auth.admin.deleteUser(uid);
      if (error) authErrors.push(`${uid}: ${error.message}`);
      else authDeleted++;
    }

    // 6) Ensure canonical accounts exist with correct password + role
    const ensure = async (acct: typeof SUPER) => {
      const existing = allUsers.find((u) => u.email === acct.email);
      let uid = existing?.id;
      if (!uid) {
        const { data: created, error } = await admin.auth.admin.createUser({
          email: acct.email,
          password: acct.password,
          email_confirm: true,
        });
        if (error || !created?.user) throw new Error(`create ${acct.email}: ${error?.message}`);
        uid = created.user.id;
      } else {
        const { error } = await admin.auth.admin.updateUserById(uid, {
          password: acct.password,
          email_confirm: true,
        });
        if (error) throw new Error(`update ${acct.email}: ${error.message}`);
      }
      // Profile
      await admin.from("profiles").upsert(
        { user_id: uid, email: acct.email, name: acct.name, profile_completed: true, approval_status: "approved", college_assigned: true },
        { onConflict: "user_id" }
      );
      // Wipe any other role rows for this user, then upsert the correct one
      await admin.from("user_roles").delete().eq("user_id", uid);
      const { error: rerr } = await admin.from("user_roles").insert({ user_id: uid, role: acct.role });
      if (rerr) throw new Error(`role ${acct.email}: ${rerr.message}`);
      return uid;
    };

    const superId = await ensure(SUPER);
    const adminId = await ensure(ADMIN);

    return json(200, {
      ok: true,
      deleted_users: authDeleted,
      targeted_users: deleteIds.length,
      kept_users: keepIds.size,
      table_counts: tableCounts,
      table_errors: Object.keys(tableErrors).length ? tableErrors : undefined,
      auth_errors: authErrors.length ? authErrors.slice(0, 10) : undefined,
      super_admin_user_id: superId,
      admin_user_id: adminId,
    });
  } catch (e) {
    return json(500, { error: (e as Error).message ?? "unhandled", step: "unhandled" });
  }
});
