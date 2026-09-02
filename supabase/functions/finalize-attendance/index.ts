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

    // Verify role (admin, super_admin, or faculty)
    const { data: roleData, error: roleError } = await serviceSupabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (roleError) {
      console.error('Error checking role:', roleError)
    }

    const isStaff = roleData?.role === 'admin' || roleData?.role === 'super_admin' || roleData?.role === 'faculty';
    if (!roleData || !isStaff) {
      return new Response(
        JSON.stringify({ error: 'Admin or Faculty access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { lectureId } = await req.json()
    if (!lectureId) {
      return new Response(
        JSON.stringify({ error: 'Missing lectureId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // If faculty, verify ownership of this lecture
    if (roleData.role === 'faculty') {
      const { data: lec, error: lecErr } = await serviceSupabase
        .from('lectures')
        .select('created_by')
        .eq('id', lectureId)
        .single()

      if (lecErr || !lec || lec.created_by !== user.id) {
        return new Response(
          JSON.stringify({ error: 'Faculty can only finalize their own lectures' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // 1. Verify lecture exists
    const { data: lecture, error: lectureError } = await serviceSupabase
      .from('lectures')
      .select('id, topic, status, college_id')
      .eq('id', lectureId)
      .single()

    if (lectureError || !lecture) {
      return new Response(
        JSON.stringify({ error: 'Lecture not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Fetch all enrolled students for this lecture
    const { data: tags } = await serviceSupabase
      .from('lecture_programme_tags')
      .select('programme_id')
      .eq('lecture_id', lectureId)

    const programmeIds = (tags || []).map((t: any) => t.programme_id)

    let enrolledUserIds: string[] = []
    if (programmeIds.length > 0) {
      const { data: allotments } = await serviceSupabase
        .from('student_programme_allotments')
        .select('student_user_id')
        .in('programme_id', programmeIds)

      enrolledUserIds = [...new Set((allotments || []).map((a: any) => a.student_user_id))]
    }

    // 3. Fetch all students who marked present
    const { data: presentRecords } = await serviceSupabase
      .from('attendance')
      .select('student_user_id')
      .eq('lecture_id', lectureId)
      .eq('status', 'present')

    const presentUserIds = new Set((presentRecords || []).map((p: any) => p.student_user_id))

    // 4. Determine absent students
    const absentUserIds = enrolledUserIds.filter(id => !presentUserIds.has(id))

    // 5. Insert absent records
    if (absentUserIds.length > 0) {
      const absentRows = absentUserIds.map(student_user_id => ({
        lecture_id: lectureId,
        student_user_id,
        status: 'absent',
        points_earned: 0,
        college_id: lecture.college_id,
      }))

      const { error: insertError } = await serviceSupabase
        .from('attendance')
        .upsert(absentRows, { onConflict: 'lecture_id,student_user_id' })

      if (insertError) {
        console.error('Error inserting absent records:', insertError)
      }
    }

    // 6. Mark token as inactive
    await serviceSupabase
      .from('attendance_tokens')
      .update({ is_active: false, expires_at: new Date().toISOString() })
      .eq('lecture_id', lectureId)

    // 7. Update lecture status to ended
    await serviceSupabase
      .from('lectures')
      .update({ status: 'ended', updated_at: new Date().toISOString() })
      .eq('id', lectureId)

    const totalEnrolled = enrolledUserIds.length
    const presentCount = presentUserIds.size
    const absentCount = absentUserIds.length
    const percentage = totalEnrolled > 0 ? Math.round((presentCount / totalEnrolled) * 100) : 0

    return new Response(
      JSON.stringify({
        message: 'Attendance finalized successfully',
        stats: {
          totalEnrolled,
          presentCount,
          absentCount,
          percentage,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err: any) {
    console.error('Unexpected error in finalize-attendance:', err)
    return new Response(
      JSON.stringify({ error: err.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})