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

    // Verify admin role
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

    if (!roleData || roleData.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { lectureId } = await req.json()
    if (!lectureId) {
      return new Response(
        JSON.stringify({ error: 'lectureId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get all students
    const { data: allStudents, error: studentsError } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'student')

    if (studentsError) {
      console.error('Error fetching students:', studentsError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch students' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get students who already marked attendance
    const { data: presentStudents, error: presentError } = await supabase
      .from('attendance')
      .select('student_user_id')
      .eq('lecture_id', lectureId)

    if (presentError) {
      console.error('Error fetching present students:', presentError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch attendance records' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const presentStudentIds = new Set(presentStudents.map(s => s.student_user_id))
    
    // Mark absent students
    const absentStudents = allStudents
      .filter(s => !presentStudentIds.has(s.user_id))
      .map(s => ({
        lecture_id: lectureId,
        student_user_id: s.user_id,
        status: 'absent',
        points_earned: 0
      }))

    if (absentStudents.length > 0) {
      const { error: absentError } = await supabase
        .from('attendance')
        .insert(absentStudents)

      if (absentError) {
        console.error('Error marking absent students:', absentError)
        return new Response(
          JSON.stringify({ error: 'Failed to mark absent students' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Deactivate the token
    await supabase
      .from('attendance_tokens')
      .update({ is_active: false })
      .eq('lecture_id', lectureId)

    console.log('Attendance finalized for lecture:', lectureId, 'Absent students:', absentStudents.length)

    return new Response(
      JSON.stringify({
        message: 'Attendance finalized successfully',
        absentCount: absentStudents.length,
        presentCount: presentStudents.length
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