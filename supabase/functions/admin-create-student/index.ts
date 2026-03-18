import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.90.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type CreateUserBody = {
  email: string
  name: string
  password?: string | null
  phone?: string | null
  student_id?: string | null
  department?: string | null
  class_name?: string | null
  college_id?: string | null   // super_admin may pass explicit college_id
  role?: 'student' | 'faculty' // defaults to 'student'
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

    const jwt = authHeader.replace('Bearer ', '')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseServiceKey) {
      console.error('Missing SUPABASE_SERVICE_ROLE_KEY in function environment')
      return json(500, { error: 'Backend is not configured for admin user creation' })
    }

    // Client bound to the caller (RLS applies) — used only for role + college_id lookup.
    const caller = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: claimsData, error: claimsError } = await caller.auth.getClaims(jwt)
    if (claimsError || !claimsData?.claims?.sub) {
      console.error('Invalid JWT:', claimsError)
      return json(401, { error: 'Unauthorized' })
    }

    const callerUserId = claimsData.claims.sub

    // Fetch caller role AND college_id in one query
    const { data: roleData, error: roleError } = await caller
      .from('user_roles')
      .select('role, college_id')
      .eq('user_id', callerUserId)
      .single()

    if (roleError) {
      console.error('Error reading role:', roleError)
      return json(500, { error: 'Failed to verify role' })
    }

    if (!roleData || !['admin', 'super_admin'].includes(roleData.role)) {
      return json(403, { error: 'Admin access required' })
    }

    // college_id of the admin performing the creation — may be null for super_admin
    const callerCollegeId: string | null = roleData.college_id ?? null

    const body = (await req.json()) as CreateUserBody

    const email = (body.email ?? '').trim().toLowerCase()
    const name  = (body.name  ?? '').trim()
    const targetRole = body.role === 'faculty' ? 'faculty' : 'student'
    // Allow caller to pass explicit college_id (super_admin use case), otherwise use caller's
    const targetCollegeId: string | null = body.college_id ?? callerCollegeId

    if (!email || !email.includes('@')) return json(400, { error: 'Valid email is required' })
    if (!name)                          return json(400, { error: 'Name is required' })

    // Admin client bypasses RLS for inserts / role assignment.
    const admin = createClient(supabaseUrl, supabaseServiceKey)

    // Prevent duplicates
    const { data: existing, error: existingError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
    if (existingError) {
      console.error('Error listing users:', existingError)
      return json(500, { error: 'Failed to validate existing users' })
    }

    const already = existing.users.find((u) => (u.email ?? '').toLowerCase() === email)
    if (already) {
      return json(409, { error: 'A user with this email already exists' })
    }

    // Use provided password or fallback to role-based defaults
    const defaultPassword = body.password?.trim()
      ? body.password.trim()
      : targetRole === 'faculty' ? 'faculty123' : 'student'

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password: defaultPassword,
      email_confirm: true,
      user_metadata: { must_change_password: true },
    })

    if (createError || !created.user) {
      console.error('Error creating user:', createError)
      return json(500, { error: `Failed to create ${targetRole} account` })
    }

    const newUserId = created.user.id

    // Insert profile — include college_id so targeting queries work
    const { error: profileError } = await admin.from('profiles').insert({
      user_id:    newUserId,
      name,
      email,
      phone:      body.phone      ?? null,
      student_id: body.student_id ?? null,
      department: body.department ?? null,
      class_name: body.class_name ?? null,
      college_id: targetCollegeId,
    })

    if (profileError) {
      console.error('Error inserting profile:', profileError)
      try { await admin.auth.admin.deleteUser(newUserId) } catch (e) { console.error('Cleanup failed:', e) }
      return json(500, { error: `Failed to create ${targetRole} profile` })
    }

    // Insert role — include college_id so push-notification targeting works
    const { error: roleInsertError } = await admin.from('user_roles').insert({
      user_id:    newUserId,
      role:       targetRole,
      college_id: targetCollegeId,
    })

    if (roleInsertError) {
      console.error('Error assigning role:', roleInsertError)
      try {
        await admin.from('profiles').delete().eq('user_id', newUserId)
        await admin.auth.admin.deleteUser(newUserId)
      } catch (e) { console.error('Cleanup failed:', e) }
      return json(500, { error: `Failed to assign ${targetRole} role` })
    }

    console.log(`${targetRole} created`, { admin_user_id: callerUserId, new_user_id: newUserId, college_id: targetCollegeId })

    return json(200, {
      message: `${targetRole.charAt(0).toUpperCase() + targetRole.slice(1)} account created`,
      userId: newUserId,
      email,
      defaultPassword,
      college_id: targetCollegeId,
      role: targetRole,
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return json(500, { error: 'An unexpected error occurred' })
  }
})
