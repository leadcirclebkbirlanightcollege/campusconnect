// Super Admin: hard-delete student accounts. Optionally scoped to a single college.
// Returns per-table deletion counts plus auth-user deletion counts.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.90.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// Tables that store student-owned rows. Column key tells us which FK column to filter on.
const STUDENT_TABLES: Array<{ table: string; col: 'user_id' | 'student_user_id' }> = [
  { table: 'attendance',                     col: 'student_user_id' },
  { table: 'attendance_audit_log',           col: 'student_user_id' },
  { table: 'points_ledger',                  col: 'user_id' },
  { table: 'point_claims',                   col: 'user_id' },
  { table: 'student_programme_allotments',   col: 'user_id' },
  { table: 'student_intelligence',           col: 'user_id' },
  { table: 'student_streaks',                col: 'user_id' },
  { table: 'student_achievements',           col: 'user_id' },
  { table: 'daily_checkins',                 col: 'user_id' },
  { table: 'daily_rewards_log',              col: 'user_id' },
  { table: 'notification_recipients',        col: 'user_id' },
  { table: 'login_activity',                 col: 'user_id' },
  { table: 'feedback',                       col: 'user_id' },
  { table: 'account_deletion_requests',      col: 'user_id' },
  { table: 'stall_registrations',            col: 'user_id' },
  { table: 'notification_preferences',       col: 'user_id' },
]

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) return json(401, { error: 'Unauthorized', step: 'auth_header' })

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseServiceKey) return json(500, { error: 'Backend not configured', step: 'service_key' })

    const caller = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: userData, error: userErr } = await caller.auth.getUser()
    if (userErr || !userData?.user) return json(401, { error: 'Unauthorized', step: 'get_user' })
    const callerId = userData.user.id

    const { data: roleRow } = await caller
      .from('user_roles').select('role').eq('user_id', callerId).eq('role', 'super_admin').maybeSingle()
    if (!roleRow) return json(403, { error: 'Super admin access required', step: 'role_check' })

    let body: { confirm?: string; college_id?: string | null } = {}
    try { body = await req.json() } catch { /* allow empty */ }
    if (body.confirm !== 'DELETE ALL STUDENTS') {
      return json(400, { error: 'Confirmation phrase mismatch', step: 'confirm' })
    }

    const admin = createClient(supabaseUrl, supabaseServiceKey)
    const collegeId = body.college_id ?? null

    // Collect target student user IDs
    let rolesQ = admin.from('user_roles').select('user_id').eq('role', 'student')
    if (collegeId) rolesQ = rolesQ.eq('college_id', collegeId)
    const { data: studentRoles, error: rolesErr } = await rolesQ
    if (rolesErr) return json(500, { error: rolesErr.message, step: 'list_students' })

    const ids = (studentRoles ?? []).map(r => r.user_id as string)
    if (!ids.length) {
      return json(200, { deleted: 0, scope: collegeId ? 'college' : 'platform', college_id: collegeId, message: 'No student accounts to delete' })
    }

    // Per-table deletion with counts (batched in 500-id chunks to stay under URL limits)
    const tableCounts: Record<string, number> = {}
    const tableErrors: Record<string, string> = {}
    const CHUNK = 500
    for (const { table, col } of STUDENT_TABLES) {
      let total = 0
      for (let i = 0; i < ids.length; i += CHUNK) {
        const slice = ids.slice(i, i + CHUNK)
        const { data, error } = await admin.from(table).delete().in(col, slice).select('*', { count: 'exact', head: false })
        if (error) {
          tableErrors[table] = error.message
          break
        }
        total += (data?.length ?? 0)
      }
      tableCounts[table] = total
    }

    // Role + profile rows
    let roleDeleted = 0
    let profileDeleted = 0
    for (let i = 0; i < ids.length; i += CHUNK) {
      const slice = ids.slice(i, i + CHUNK)
      const { data: r } = await admin.from('user_roles').delete().in('user_id', slice).eq('role', 'student').select('id')
      roleDeleted += r?.length ?? 0
      const { data: p } = await admin.from('profiles').delete().in('user_id', slice).select('user_id')
      profileDeleted += p?.length ?? 0
    }

    // Delete auth users
    let authDeleted = 0
    const authErrors: string[] = []
    for (const uid of ids) {
      const { error } = await admin.auth.admin.deleteUser(uid)
      if (error) authErrors.push(`${uid}: ${error.message}`)
      else authDeleted++
    }

    try {
      await admin.from('audit_logs').insert({
        action: 'students_hard_reset',
        performed_by: callerId,
        target_entity: 'students',
        college_id: collegeId,
        details: {
          scope: collegeId ? 'college' : 'platform',
          deleted: authDeleted,
          total_targets: ids.length,
          table_counts: tableCounts,
          role_deleted: roleDeleted,
          profile_deleted: profileDeleted,
          table_errors: tableErrors,
          auth_error_count: authErrors.length,
        },
      })
    } catch { /* non-blocking */ }

    return json(200, {
      deleted: authDeleted,
      total_targets: ids.length,
      scope: collegeId ? 'college' : 'platform',
      college_id: collegeId,
      table_counts: tableCounts,
      role_deleted: roleDeleted,
      profile_deleted: profileDeleted,
      table_errors: Object.keys(tableErrors).length ? tableErrors : undefined,
      auth_errors: authErrors.length ? authErrors.slice(0, 5) : undefined,
    })
  } catch (e) {
    console.error('super-admin-reset-students error', e)
    return json(500, { error: (e as Error).message ?? 'Unexpected error', step: 'unhandled' })
  }
})
