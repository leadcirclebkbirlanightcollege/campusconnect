// College Admin: hard-delete every student account belonging to the caller's college.
// Mirrors super-admin-reset-students but scopes deletes to the admin's college_id.
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) return json(401, { error: 'Unauthorized' })

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseServiceKey) return json(500, { error: 'Backend not configured' })

    const caller = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: userData, error: userErr } = await caller.auth.getUser()
    if (userErr || !userData?.user) return json(401, { error: 'Unauthorized' })
    const callerId = userData.user.id

    const { data: callerRole } = await caller
      .from('user_roles').select('role, college_id').eq('user_id', callerId).maybeSingle()
    if (!callerRole || (callerRole.role !== 'admin' && callerRole.role !== 'super_admin')) {
      return json(403, { error: 'Admin access required' })
    }
    const collegeId = callerRole.college_id as string | null
    if (!collegeId) return json(400, { error: 'Admin has no college assigned' })

    let body: { confirm?: string } = {}
    try { body = await req.json() } catch { /* allow empty */ }
    if (body.confirm !== 'DELETE ALL STUDENTS') {
      return json(400, { error: 'Confirmation phrase mismatch' })
    }

    const admin = createClient(supabaseUrl, supabaseServiceKey)

    // Collect student user IDs scoped to this college
    const { data: studentRoles, error: rolesErr } = await admin
      .from('user_roles').select('user_id').eq('role', 'student').eq('college_id', collegeId)
    if (rolesErr) return json(500, { error: 'Failed to list students' })

    const ids = (studentRoles ?? []).map(r => r.user_id as string)
    if (!ids.length) return json(200, { deleted: 0, message: 'No student accounts to delete in this college' })

    const studentTables = [
      'attendance',
      'attendance_audit_log',
      'points_ledger',
      'point_claims',
      'student_programme_allotments',
      'student_intelligence',
      'student_streaks',
      'student_achievements',
      'daily_checkins',
      'daily_rewards_log',
      'notification_recipients',
      'login_activity',
      'feedback',
      'account_deletion_requests',
      'stall_registrations',
    ]

    const tableErrors: Record<string, string> = {}
    for (const table of studentTables) {
      const col = table === 'attendance' || table === 'attendance_audit_log' ? 'student_user_id' : 'user_id'
      const { error } = await admin.from(table).delete().in(col, ids)
      if (error) tableErrors[table] = error.message
    }

    await admin.from('user_roles').delete().in('user_id', ids).eq('role', 'student')
    await admin.from('profiles').delete().in('user_id', ids)

    let deleted = 0
    const authErrors: string[] = []
    for (const uid of ids) {
      const { error } = await admin.auth.admin.deleteUser(uid)
      if (error) authErrors.push(`${uid}: ${error.message}`)
      else deleted++
    }

    try {
      await admin.from('audit_logs').insert({
        action: 'college_students_hard_reset',
        performed_by: callerId,
        target_entity: 'students',
        college_id: collegeId,
        details: { deleted, total_targets: ids.length, table_errors: tableErrors, auth_errors: authErrors.length },
      })
    } catch { /* non-blocking */ }

    return json(200, {
      deleted,
      total_targets: ids.length,
      table_errors: Object.keys(tableErrors).length ? tableErrors : undefined,
      auth_errors: authErrors.length ? authErrors.slice(0, 5) : undefined,
    })
  } catch (e) {
    console.error('admin-reset-college-students error', e)
    return json(500, { error: (e as Error).message ?? 'Unexpected error' })
  }
})
