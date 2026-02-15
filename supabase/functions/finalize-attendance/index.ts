import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Client scoped to the caller (for auth only)
    const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    // Admin/system client (bypasses RLS) for server-side writes
    const serviceSupabase = createClient(supabaseUrl, supabaseServiceRoleKey)

    // Verify caller
    const { data: { user }, error: userError } = await userSupabase.auth.getUser()
    if (userError || !user) {
      console.error('Unauthorized caller:', userError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify admin role (use service client to avoid RLS on user_roles)
    const { data: roleData, error: roleError } = await serviceSupabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (roleError) {
      console.error('Error checking admin role:', roleError)
    }

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

    // Ensure lecture exists (prevents FK failures when inserting attendance rows)
    const { data: lecture, error: lectureError } = await serviceSupabase
      .from('lectures')
      .select('id')
      .eq('id', lectureId)
      .maybeSingle()

    if (lectureError) {
      console.error('Error verifying lecture:', lectureError)
      return new Response(
        JSON.stringify({ error: 'Failed to verify lecture' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!lecture) {
      return new Response(
        JSON.stringify({ error: 'Lecture not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    // Get all students
    const { data: allStudents, error: studentsError } = await serviceSupabase
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
    const { data: presentStudents, error: presentError } = await serviceSupabase
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

    const presentStudentIds = new Set(
      (presentStudents ?? []).map((s: { student_user_id: string }) => s.student_user_id)
    )

    // Mark absent students
    const absentStudents = (allStudents ?? [])
      .filter((s: { user_id: string }) => !presentStudentIds.has(s.user_id))
      .map((s: { user_id: string }) => ({
        lecture_id: lectureId,
        student_user_id: s.user_id,
        status: 'absent',
        points_earned: 0,
      }))

    if (absentStudents.length > 0) {
      const { error: absentError } = await serviceSupabase
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
    await serviceSupabase
      .from('attendance_tokens')
      .update({ is_active: false })
      .eq('lecture_id', lectureId)

    // Trigger intelligence recomputation for all students (best-effort)
    try {
      await fetch(`${supabaseUrl}/functions/v1/recompute-intelligence`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${supabaseServiceRoleKey}` },
        body: JSON.stringify({}),
      });
    } catch (e) {
      console.error("finalize-attendance: intelligence recompute failed", e);
    }

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