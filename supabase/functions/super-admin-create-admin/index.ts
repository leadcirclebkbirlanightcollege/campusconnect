import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.90.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-upgraded, x-supabase-client-version',
}

type Body = {
  name: string
  email: string
  college_id: string
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
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Verify caller is super_admin
    const caller = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user }, error: userError } = await caller.auth.getUser()
    if (userError || !user) return json(401, { error: 'Unauthorized' })

    const { data: roleData } = await caller
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle()

    if (roleData?.role !== 'super_admin') return json(403, { error: 'Super admin access required' })

    const body = (await req.json()) as Body
    const email = (body.email ?? '').trim().toLowerCase()
    const name = (body.name ?? '').trim()
    const college_id = (body.college_id ?? '').trim()

    if (!email || !email.includes('@')) return json(400, { error: 'Valid email is required' })
    if (!name) return json(400, { error: 'Name is required' })
    if (!college_id) return json(400, { error: 'College is required' })

    const admin = createClient(supabaseUrl, supabaseServiceKey)

    // Check duplicate
    const { data: existing } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
    if (existing?.users?.find((u) => (u.email ?? '').toLowerCase() === email)) {
      return json(409, { error: 'A user with this email already exists' })
    }

    const defaultPassword = 'admin123'

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password: defaultPassword,
      email_confirm: true,
      user_metadata: { name, role: 'admin' },
    })

    if (createError || !created.user) {
      console.error('Error creating user:', createError)
      return json(500, { error: 'Failed to create admin account' })
    }

    const newUserId = created.user.id

    // Insert profile
    const { error: profileError } = await admin.from('profiles').insert({
      user_id: newUserId,
      name,
      email,
      college_id,
    })

    if (profileError) {
      console.error('Profile insert error:', profileError)
      await admin.auth.admin.deleteUser(newUserId)
      return json(500, { error: 'Failed to create admin profile' })
    }

    // Assign admin role with college_id
    const { error: roleError } = await admin.from('user_roles').insert({
      user_id: newUserId,
      role: 'admin',
      college_id,
    })

    if (roleError) {
      console.error('Role insert error:', roleError)
      await admin.from('profiles').delete().eq('user_id', newUserId)
      await admin.auth.admin.deleteUser(newUserId)
      return json(500, { error: 'Failed to assign admin role' })
    }

    console.log('College admin created by super_admin', { by: user.id, new_admin: newUserId, college_id })

    return json(200, {
      message: 'College admin created',
      userId: newUserId,
      email,
      defaultPassword,
    })
  } catch (err) {
    console.error('Unexpected error:', err)
    return json(500, { error: 'An unexpected error occurred' })
  }
})
