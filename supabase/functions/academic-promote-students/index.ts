// Academic Promotion Engine
//   action=preview  → returns counts of students that would move per rule
//   action=execute  → applies promotion, writes a run record with per-student deltas
//   action=rollback → reverts a previous run using the saved deltas
//
// Auth: caller must be admin (scoped to their college_id) or super_admin (any college).
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

type Rule = {
  from_class: string
  to_class: string | null
  graduates: boolean
  next_year: number | null
}

type Student = {
  user_id: string
  class_name: string | null
  current_year: number | null
  academic_session: string | null
  graduation_status: string | null
}

type Delta = {
  user_id: string
  before: { class_name: string | null; current_year: number | null; academic_session: string | null; graduation_status: string | null }
  after:  { class_name: string | null; current_year: number | null; academic_session: string | null; graduation_status: string | null }
}

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
    const { data: userData } = await caller.auth.getUser()
    if (!userData?.user) return json(401, { error: 'Unauthorized', step: 'get_user' })
    const callerId = userData.user.id

    const { data: roleRow } = await caller
      .from('user_roles').select('role, college_id').eq('user_id', callerId).maybeSingle()
    if (!roleRow || !['admin', 'super_admin'].includes(roleRow.role)) {
      return json(403, { error: 'Admin access required', step: 'role_check' })
    }
    const isSuper = roleRow.role === 'super_admin'

    let body: {
      action?: 'preview' | 'execute' | 'rollback'
      college_id?: string
      to_session?: string
      run_id?: string
    } = {}
    try { body = await req.json() } catch { /* allow */ }

    const action = body.action ?? 'preview'
    const collegeId = isSuper ? (body.college_id ?? (roleRow.college_id as string | null)) : (roleRow.college_id as string | null)
    if (!collegeId) return json(400, { error: 'college_id required', step: 'scope' })

    const admin = createClient(supabaseUrl, supabaseServiceKey)

    // ── ROLLBACK ───────────────────────────────────────────────────────────
    if (action === 'rollback') {
      if (!body.run_id) return json(400, { error: 'run_id required', step: 'rollback_args' })
      const { data: run, error: runErr } = await admin
        .from('academic_promotion_runs').select('*').eq('id', body.run_id).maybeSingle()
      if (runErr || !run) return json(404, { error: 'Run not found', step: 'rollback_lookup' })
      if (!isSuper && run.college_id !== collegeId) return json(403, { error: 'Run is from another college', step: 'rollback_scope' })
      if (run.reversed_at) return json(400, { error: 'Run already reversed', step: 'rollback_state' })

      const deltas: Delta[] = (run.details as { deltas?: Delta[] })?.deltas ?? []
      let restored = 0
      for (const d of deltas) {
        const { error } = await admin.from('profiles').update({
          class_name:        d.before.class_name,
          current_year:      d.before.current_year,
          academic_session:  d.before.academic_session,
          graduation_status: d.before.graduation_status,
          promoted_at:       null,
        }).eq('user_id', d.user_id)
        if (!error) restored++
      }
      await admin.from('academic_promotion_runs').update({
        reversed_at: new Date().toISOString(),
        reversed_by: callerId,
      }).eq('id', run.id)

      return json(200, { ok: true, action: 'rollback', restored, total: deltas.length })
    }

    // ── Load rules + eligible students ─────────────────────────────────────
    const { data: rulesData, error: rulesErr } = await admin
      .from('class_promotion_rules')
      .select('from_class, to_class, graduates, next_year')
      .eq('college_id', collegeId)
    if (rulesErr) return json(500, { error: rulesErr.message, step: 'load_rules' })
    const rules = (rulesData ?? []) as Rule[]
    if (!rules.length) return json(400, { error: 'No promotion rules configured for this college', step: 'rules_empty' })

    const ruleMap = new Map(rules.map(r => [r.from_class.trim().toLowerCase(), r]))

    // Pull active students in the college
    const { data: roles } = await admin
      .from('user_roles').select('user_id').eq('role', 'student').eq('college_id', collegeId)
    const ids = (roles ?? []).map(r => r.user_id as string)
    if (!ids.length) return json(200, { ok: true, action, summary: [], total_promoted: 0, total_graduated: 0 })

    // chunk fetch profiles
    const profiles: Student[] = []
    const CHUNK = 500
    for (let i = 0; i < ids.length; i += CHUNK) {
      const slice = ids.slice(i, i + CHUNK)
      const { data } = await admin
        .from('profiles')
        .select('user_id, class_name, current_year, academic_session, graduation_status')
        .in('user_id', slice)
        .eq('is_deleted', false)
        .neq('graduation_status', 'graduated')
      if (data) profiles.push(...(data as Student[]))
    }

    // Build summary + deltas
    const summary: Record<string, { from: string; to: string | null; graduates: boolean; count: number }> = {}
    const deltas: Delta[] = []
    let promotedCount = 0
    let graduatedCount = 0

    for (const p of profiles) {
      const key = (p.class_name ?? '').trim().toLowerCase()
      if (!key) continue
      const rule = ruleMap.get(key)
      if (!rule) continue

      const sumKey = `${rule.from_class}→${rule.graduates ? '🎓' : rule.to_class ?? ''}`
      if (!summary[sumKey]) summary[sumKey] = { from: rule.from_class, to: rule.to_class, graduates: rule.graduates, count: 0 }
      summary[sumKey].count++

      if (rule.graduates) graduatedCount++; else promotedCount++

      deltas.push({
        user_id: p.user_id,
        before: {
          class_name: p.class_name,
          current_year: p.current_year,
          academic_session: p.academic_session,
          graduation_status: p.graduation_status,
        },
        after: {
          class_name: rule.graduates ? p.class_name : rule.to_class,
          current_year: rule.next_year ?? (rule.graduates ? p.current_year : (p.current_year ?? 0) + 1),
          academic_session: body.to_session ?? p.academic_session,
          graduation_status: rule.graduates ? 'graduated' : (p.graduation_status ?? 'active'),
        },
      })
    }

    // ── PREVIEW ────────────────────────────────────────────────────────────
    if (action === 'preview') {
      return json(200, {
        ok: true,
        action: 'preview',
        college_id: collegeId,
        total_eligible: deltas.length,
        total_promoted: promotedCount,
        total_graduated: graduatedCount,
        summary: Object.values(summary),
        rules_count: rules.length,
        students_in_college: profiles.length,
      })
    }

    // ── EXECUTE ────────────────────────────────────────────────────────────
    if (action !== 'execute') return json(400, { error: 'Unknown action', step: 'dispatch' })
    if (!body.to_session) return json(400, { error: 'to_session required (e.g. "2026-27")', step: 'execute_args' })
    if (!deltas.length) return json(200, { ok: true, action: 'execute', total_promoted: 0, total_graduated: 0, message: 'No eligible students' })

    const nowIso = new Date().toISOString()
    let updated = 0
    const updateErrors: Record<string, string> = {}
    for (const d of deltas) {
      const { error } = await admin.from('profiles').update({
        class_name:        d.after.class_name,
        current_year:      d.after.current_year,
        academic_session:  d.after.academic_session,
        graduation_status: d.after.graduation_status,
        promoted_at:       nowIso,
      }).eq('user_id', d.user_id)
      if (error) updateErrors[d.user_id] = error.message
      else updated++
    }

    const { data: runRow, error: runInsErr } = await admin
      .from('academic_promotion_runs')
      .insert({
        college_id: collegeId,
        performed_by: callerId,
        to_session: body.to_session,
        total_promoted: promotedCount,
        total_graduated: graduatedCount,
        details: { deltas, summary: Object.values(summary), errors_count: Object.keys(updateErrors).length },
      })
      .select('id')
      .maybeSingle()
    if (runInsErr) console.error('run insert failed', runInsErr)

    try {
      await admin.from('audit_logs').insert({
        action: 'academic_promotion_run',
        performed_by: callerId,
        target_entity: 'students',
        college_id: collegeId,
        details: { to_session: body.to_session, promoted: promotedCount, graduated: graduatedCount, updated, run_id: runRow?.id },
      })
    } catch { /* non-blocking */ }

    return json(200, {
      ok: true,
      action: 'execute',
      run_id: runRow?.id ?? null,
      total_eligible: deltas.length,
      updated,
      total_promoted: promotedCount,
      total_graduated: graduatedCount,
      summary: Object.values(summary),
      errors_count: Object.keys(updateErrors).length,
      errors_sample: Object.entries(updateErrors).slice(0, 5).map(([uid, msg]) => `${uid}: ${msg}`),
    })
  } catch (e) {
    console.error('academic-promote-students error', e)
    return json(500, { error: (e as Error).message ?? 'Unexpected error', step: 'unhandled' })
  }
})
