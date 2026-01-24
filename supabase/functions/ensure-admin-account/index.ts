import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const adminEmail = Deno.env.get('ADMIN_EMAIL')
    const adminPassword = Deno.env.get('ADMIN_PASSWORD')

    const sharedAdminEmail = Deno.env.get('SHARED_ADMIN_EMAIL')
    const sharedAdminPassword = Deno.env.get('SHARED_ADMIN_PASSWORD')

    if (!adminEmail || !adminPassword) {
      console.error('Missing ADMIN_EMAIL or ADMIN_PASSWORD environment variables')
      return new Response(
        JSON.stringify({ error: 'Admin credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Fetch users once, then ensure the required admin accounts exist.
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers()

    if (listError) {
      console.error('Error listing users:', listError)
      return new Response(
        JSON.stringify({ error: 'Failed to check existing users' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const ensureAdminAccount = async (email: string, password: string, displayName: string) => {
      const existing = existingUsers.users.find((u) => u.email === email)
      const userId = existing?.id

      let ensuredUserId = userId
      if (!ensuredUserId) {
        const { data: created, error: createError } = await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        })

        if (createError || !created?.user?.id) {
          console.error('Error creating admin user:', createError)
          throw new Error('Failed to create admin user')
        }

        ensuredUserId = created.user.id
        console.log('Admin account created:', ensuredUserId)
      }

      // Ensure profile exists
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('user_id', ensuredUserId)
        .maybeSingle()

      if (!profile) {
        const { error: profileError } = await supabase.from('profiles').insert({
          user_id: ensuredUserId,
          name: displayName,
          email,
        })
        if (profileError) {
          // Not fatal; role is more important than profile.
          console.error('Error creating admin profile:', profileError)
        }
      }

      // Ensure admin role exists
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', ensuredUserId)
        .eq('role', 'admin')
        .maybeSingle()

      if (!roleData) {
        const { error: roleError } = await supabase.from('user_roles').insert({
          user_id: ensuredUserId,
          role: 'admin',
        })

        if (roleError) {
          console.error('Error creating admin role:', roleError)
          throw new Error('Failed to assign admin role')
        }
      }

      return ensuredUserId
    }

    const results: Record<string, string> = {}

    results.primaryAdminUserId = await ensureAdminAccount(
      adminEmail,
      adminPassword,
      'System Administrator'
    )

    if (sharedAdminEmail && sharedAdminPassword) {
      results.sharedAdminUserId = await ensureAdminAccount(
        sharedAdminEmail,
        sharedAdminPassword,
        'Shared Admin'
      )
    } else {
      console.log('Shared admin secrets not set; skipping shared admin provisioning')
    }

    return new Response(
      JSON.stringify({ message: 'Admin accounts ensured', ...results }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})