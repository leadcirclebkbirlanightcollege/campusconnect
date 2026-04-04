import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.90.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-upgraded, x-supabase-client-version',
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
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Verify caller identity
    const caller = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user: callerUser }, error: userErr } = await caller.auth.getUser()
    if (userErr || !callerUser) return json(401, { error: 'Unauthorized' })

    // Get caller role
    const { data: callerRole } = await caller
      .from('user_roles')
      .select('role, college_id')
      .eq('user_id', callerUser.id)
      .maybeSingle()

    const role = callerRole?.role as string | undefined
    if (role !== 'admin' && role !== 'super_admin') {
      return json(403, { error: 'Admin or Super Admin access required' })
    }

    // Parse & validate body
    const body = await req.json()
    const targetUserId = (body.user_id ?? '').trim()
    const newEmail = (body.new_email ?? '').trim().toLowerCase()

    if (!targetUserId) return json(400, { error: 'user_id is required' })
    if (!newEmail || !newEmail.includes('@') || newEmail.length < 5) {
      return json(400, { error: 'Valid email is required' })
    }

    const admin = createClient(supabaseUrl, serviceRoleKey)

    // Get target user's current profile + college
    const { data: targetProfile, error: profileErr } = await admin
      .from('profiles')
      .select('email, college_id')
      .eq('user_id', targetUserId)
      .maybeSingle()

    if (profileErr || !targetProfile) {
      return json(404, { error: 'Target user not found' })
    }

    const oldEmail = targetProfile.email ?? ''

    if (oldEmail.toLowerCase() === newEmail) {
      return json(400, { error: 'New email is the same as current email' })
    }

    // College-scoped permission check for admins
    if (role === 'admin') {
      const adminCollegeId = callerRole?.college_id
      if (!adminCollegeId || targetProfile.college_id !== adminCollegeId) {
        return json(403, { error: 'You can only update users in your own college' })
      }
    }

    // Check if new email already exists in auth
    const { data: existingUsers } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
    const duplicate = existingUsers?.users?.find(
      (u) => (u.email ?? '').toLowerCase() === newEmail && u.id !== targetUserId
    )
    if (duplicate) {
      return json(409, { error: 'A user with this email already exists' })
    }

    // Update email in Supabase Auth
    const { error: authUpdateErr } = await admin.auth.admin.updateUserById(targetUserId, {
      email: newEmail,
      email_confirm: true,
    })

    if (authUpdateErr) {
      console.error('Auth email update error:', authUpdateErr)
      return json(500, { error: 'Failed to update email in authentication system' })
    }

    // Update email in profiles table
    const { error: dbUpdateErr } = await admin
      .from('profiles')
      .update({ email: newEmail, updated_at: new Date().toISOString() })
      .eq('user_id', targetUserId)

    if (dbUpdateErr) {
      console.error('Profile email update error:', dbUpdateErr)
      // Attempt rollback of auth email
      await admin.auth.admin.updateUserById(targetUserId, { email: oldEmail, email_confirm: true })
      return json(500, { error: 'Failed to update email in database' })
    }

    // Audit log
    await admin.from('audit_logs').insert({
      action: 'email_updated',
      performed_by: callerUser.id,
      target_entity: 'profiles',
      target_id: targetUserId,
      college_id: targetProfile.college_id,
      details: { old_email: oldEmail, new_email: newEmail },
    })

    console.log('Email updated', {
      by: callerUser.id,
      target: targetUserId,
      old: oldEmail,
      new: newEmail,
    })

    return json(200, { message: 'Email updated successfully', old_email: oldEmail, new_email: newEmail })
  } catch (err) {
    console.error('Unexpected error:', err)
    return json(500, { error: 'An unexpected error occurred' })
  }
})
