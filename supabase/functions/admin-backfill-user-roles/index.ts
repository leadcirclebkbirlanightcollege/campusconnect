import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.90.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

type BackfillBody = {
  dryRun?: boolean
  includeDeleted?: boolean
}

// Deno typecheck can be strict around SupabaseClient generics; runtime is unaffected.
// Keep helpers loosely typed to avoid cross-version generic mismatches.
async function getAllProfileUserIds(admin: any, includeDeleted: boolean) {
  const userIds: string[] = []

  // Conservative pagination to avoid response limits.
  const pageSize = 1000
  for (let offset = 0; offset < 20000; offset += pageSize) {
    const query = admin
      .from('profiles')
      .select('user_id', { count: 'exact' })
      .range(offset, offset + pageSize - 1)

    if (!includeDeleted) query.eq('is_deleted', false)

    const { data, error } = await query
    if (error) throw error

    const ids = (data ?? []).map((r: any) => String(r.user_id)).filter(Boolean)
    userIds.push(...ids)

    if (ids.length < pageSize) break
  }

  // Deduplicate
  return Array.from(new Set(userIds))
}

async function getExistingRoleUserIds(admin: any, userIds: string[]) {
  const existing = new Set<string>()
  const chunkSize = 1000
  for (let i = 0; i < userIds.length; i += chunkSize) {
    const chunk = userIds.slice(i, i + chunkSize)
    const { data, error } = await admin.from('user_roles').select('user_id').in('user_id', chunk)
    if (error) throw error
    for (const row of data ?? []) existing.add(String((row as any).user_id))
  }
  return existing
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) return json(401, { error: 'Unauthorized' })

    const jwt = authHeader.replace('Bearer ', '')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseServiceKey) {
      console.error('Missing SUPABASE_SERVICE_ROLE_KEY in function environment')
      return json(500, { error: 'Backend is not configured for admin role backfill' })
    }

    // Caller client (RLS applies) -> used for verifying admin.
    const caller = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: claimsData, error: claimsError } = await caller.auth.getClaims(jwt)
    if (claimsError || !claimsData?.claims?.sub) {
      console.error('Invalid JWT:', claimsError)
      return json(401, { error: 'Unauthorized' })
    }

    const callerUserId = claimsData.claims.sub

    const { data: roleData, error: roleError } = await caller
      .from('user_roles')
      .select('role')
      .eq('user_id', callerUserId)
      .maybeSingle()

    if (roleError) {
      console.error('Error reading role:', roleError)
      return json(500, { error: 'Failed to verify role' })
    }

    if (!roleData || roleData.role !== 'admin') return json(403, { error: 'Admin access required' })

    const body = (await req.json().catch(() => ({}))) as BackfillBody
    const dryRun = Boolean(body.dryRun)
    const includeDeleted = Boolean(body.includeDeleted)

    const admin = createClient(supabaseUrl, supabaseServiceKey)

    const profileUserIds = await getAllProfileUserIds(admin, includeDeleted)
    const existingRoleUserIds = await getExistingRoleUserIds(admin, profileUserIds)

    const missingUserIds = profileUserIds.filter((id) => !existingRoleUserIds.has(id))
    const missingRows = missingUserIds.map((id) => ({ user_id: id, role: 'student' }))

    if (dryRun) {
      return json(200, {
        dryRun: true,
        includeDeleted,
        totalProfiles: profileUserIds.length,
        existingRoles: existingRoleUserIds.size,
        missingRoles: missingRows.length,
        inserted: 0,
      })
    }

    let inserted = 0
    if (missingRows.length) {
      const chunkSize = 500
      for (let i = 0; i < missingRows.length; i += chunkSize) {
        const chunk = missingRows.slice(i, i + chunkSize)
        const { error } = await admin.from('user_roles').insert(chunk)
        if (error) {
          console.error('Error inserting roles:', error)
          return json(500, { error: 'Failed to insert missing roles' })
        }
        inserted += chunk.length
      }
    }

    console.log('Backfilled roles', {
      admin_user_id: callerUserId,
      total_profiles: profileUserIds.length,
      existing_roles: existingRoleUserIds.size,
      inserted,
      includeDeleted,
    })

    return json(200, {
      dryRun: false,
      includeDeleted,
      totalProfiles: profileUserIds.length,
      existingRoles: existingRoleUserIds.size,
      missingRoles: missingRows.length,
      inserted,
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return json(500, { error: 'An unexpected error occurred' })
  }
})
