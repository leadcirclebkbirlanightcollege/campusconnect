import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10'
import bcrypt from 'https://esm.sh/bcryptjs@2.4.3?target=deno'
import { crypto as stdCrypto } from 'https://deno.land/std@0.177.0/crypto/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  const debugId = (globalThis.crypto as Crypto)?.randomUUID?.() ?? `dbg_${Date.now()}`

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const json = (status: number, body: Record<string, unknown>) =>
    new Response(JSON.stringify({ debugId, ...body }), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.warn(`[${debugId}] Missing authorization header`)
      return json(401, { error: 'Missing authorization header' })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    // Verify admin role
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      console.warn(`[${debugId}] Unauthorized: getUser failed`, userError)
      return json(401, { error: 'Unauthorized' })
    }

    console.log(`[${debugId}] admin-generate-attendance: user=${user.id}`)

    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    console.log(`[${debugId}] role check result`, { role: roleData?.role, roleError: roleError?.message })

    if (roleError) {
      console.error(`[${debugId}] role lookup error`, roleError)
      return json(500, { error: 'Failed to verify role' })
    }

    if (!roleData || roleData.role !== 'admin') {
      console.warn(`[${debugId}] Forbidden: role=${roleData?.role}`)
      return json(403, { error: 'Admin access required' })
    }

    const body = await req.json().catch(() => null)
    const lectureId = body?.lectureId

    console.log(`[${debugId}] request`, { lectureId })

    if (!lectureId) {
      return json(400, { error: 'lectureId is required' })
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString()

    // Generate random token for QR code
    const tokenBytes = new Uint8Array(32)
    stdCrypto.getRandomValues(tokenBytes)
    const token = Array.from(tokenBytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')

    // Hash the OTP (bcrypt)
    // NOTE: mark-attendance supports both bcrypt + legacy SHA-256 during transition.
    const otpHash = (bcrypt as any).hashSync(otp, 10)

    // Set expiry to 10 minutes from now
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

    // Upsert token for this lecture (lecture_id is unique)
    const { data: upsertData, error: upsertError } = await supabase
      .from('attendance_tokens')
      .upsert(
        {
          lecture_id: lectureId,
          token,
          otp_hash: otpHash,
          expires_at: expiresAt,
          is_active: true,
          used_count: 0,
          created_by: user.id,
          created_at: new Date().toISOString(),
        },
        { onConflict: 'lecture_id' },
      )
      .select('id, lecture_id')
      .maybeSingle()

    console.log(`[${debugId}] upsert result`, {
      upsertError: upsertError?.message,
      tokenRowId: upsertData?.id,
      lectureId: upsertData?.lecture_id,
    })

    if (upsertError) {
      console.error(`[${debugId}] Error upserting token`, upsertError)
      return json(500, { error: 'Failed to generate attendance token' })
    }

    console.log(`[${debugId}] Attendance token generated for lecture: ${lectureId}`)

    return json(200, {
      otp,
      token,
      expiresAt,
      success: true,
      message: 'Attendance token generated successfully. OTP and QR code are valid for 10 minutes.',
    })
  } catch (error) {
    console.error(`[${debugId}] Unexpected error`, error)
    return json(500, { error: 'An unexpected error occurred' })
  }
})