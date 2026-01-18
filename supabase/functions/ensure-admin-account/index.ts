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

    // Check if admin user already exists
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers()
    
    if (listError) {
      console.error('Error listing users:', listError)
      return new Response(
        JSON.stringify({ error: 'Failed to check existing users' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const existingAdmin = existingUsers.users.find(user => user.email === adminEmail)

    if (existingAdmin) {
      // Check if admin role exists
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', existingAdmin.id)
        .single()

      if (!roleData) {
        // Add admin role if missing
        await supabase.from('user_roles').insert({
          user_id: existingAdmin.id,
          role: 'admin'
        })

        console.log('Admin role added to existing user')
      }

      return new Response(
        JSON.stringify({ message: 'Admin account already exists', userId: existingAdmin.id }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create admin user
    const { data: authData, error: createError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true
    })

    if (createError) {
      console.error('Error creating admin user:', createError)
      return new Response(
        JSON.stringify({ error: 'Failed to create admin user' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create profile
    const { error: profileError } = await supabase.from('profiles').insert({
      user_id: authData.user.id,
      name: 'System Administrator',
      email: adminEmail
    })

    if (profileError) {
      console.error('Error creating admin profile:', profileError)
    }

    // Add admin role
    const { error: roleError } = await supabase.from('user_roles').insert({
      user_id: authData.user.id,
      role: 'admin'
    })

    if (roleError) {
      console.error('Error creating admin role:', roleError)
      return new Response(
        JSON.stringify({ error: 'Failed to assign admin role' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Admin account created successfully:', authData.user.id)

    return new Response(
      JSON.stringify({ 
        message: 'Admin account created successfully', 
        userId: authData.user.id 
      }),
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