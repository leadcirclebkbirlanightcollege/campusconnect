import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10'
import { crypto } from 'https://deno.land/std@0.177.0/crypto/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    // Verify student role
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!roleData || roleData.role !== 'student') {
      return new Response(
        JSON.stringify({ error: 'Student access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { lectureId, otp, token } = await req.json()
    
    if (!lectureId || (!otp && !token)) {
      return new Response(
        JSON.stringify({ error: 'lectureId and either otp or token are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch the token record
    const { data: tokenData, error: tokenError } = await supabase
      .from('attendance_tokens')
      .select('*')
      .eq('lecture_id', lectureId)
      .eq('is_active', true)
      .single()

    if (tokenError || !tokenData) {
      return new Response(
        JSON.stringify({ error: 'No active attendance token found for this lecture' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if token has expired
    if (new Date(tokenData.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: 'Attendance token has expired' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate OTP or token
    let isValid = false

    if (otp) {
      // Hash the provided OTP and compare
      const encoder = new TextEncoder()
      const otpData = encoder.encode(otp)
      const hashBuffer = await crypto.subtle.digest('SHA-256', otpData)
      const otpHash = Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
      
      isValid = otpHash === tokenData.otp_hash
    } else if (token) {
      isValid = token === tokenData.token
    }

    if (!isValid) {
      return new Response(
        JSON.stringify({ error: 'Invalid OTP or token' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if student has already marked attendance
    const { data: existingAttendance } = await supabase
      .from('attendance')
      .select('id')
      .eq('lecture_id', lectureId)
      .eq('student_user_id', user.id)
      .single()

    if (existingAttendance) {
      return new Response(
        JSON.stringify({ error: 'Attendance already marked for this lecture' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Mark attendance
    const pointsEarned = 10 // Default points for attendance
    
    const { error: attendanceError } = await supabase
      .from('attendance')
      .insert({
        lecture_id: lectureId,
        student_user_id: user.id,
        status: 'present',
        points_earned: pointsEarned
      })

    if (attendanceError) {
      console.error('Error marking attendance:', attendanceError)
      return new Response(
        JSON.stringify({ error: 'Failed to mark attendance' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Add points to ledger
    const { error: ledgerError } = await supabase
      .from('points_ledger')
      .insert({
        user_id: user.id,
        points: pointsEarned,
        source: 'attendance',
        source_id: lectureId,
        note: 'Attendance marked for lecture'
      })

    if (ledgerError) {
      console.error('Error adding to points ledger:', ledgerError)
    }

    // Increment used count
    await supabase
      .from('attendance_tokens')
      .update({ used_count: tokenData.used_count + 1 })
      .eq('id', tokenData.id)

    console.log('Attendance marked successfully for user:', user.id, 'lecture:', lectureId)

    return new Response(
      JSON.stringify({
        message: 'Attendance marked successfully',
        pointsEarned
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