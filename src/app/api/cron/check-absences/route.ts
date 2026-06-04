import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  // Authenticate Cron Job
  const authHeader = request.headers.get('authorization')
  if (
    process.env.CRON_SECRET && 
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = getSupabase()
    const { data: members, error: membersError } = await supabase
      .from('members')
      .select('id, joining_date, exemption_month')
      .eq('status', 'Active')

    if (membersError) throw membersError

    const now = new Date()
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

    const updatedMembers = []

    for (const member of (members || [])) {
      if (member.exemption_month === currentMonthStr) {
        continue
      }

      const { data: latestAttendance } = await supabase
        .from('attendance')
        .select('date')
        .eq('member_id', member.id)
        .order('date', { ascending: false })
        .limit(1)
        .single()

      let startDate = new Date(member.joining_date || new Date())
      if (latestAttendance) {
        startDate = new Date(latestAttendance.date)
      }

      let workingDaysAbsent = 0
      const current = new Date(startDate)
      current.setDate(current.getDate() + 1) // Start counting from the day after

      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

      while (current < todayStart) {
        if (current.getDay() !== 0) { // 0 is Sunday
          workingDaysAbsent++
        }
        current.setDate(current.getDate() + 1)
      }

      if (workingDaysAbsent >= 10) {
        await supabase
          .from('members')
          .update({ status: 'Inactive' })
          .eq('id', member.id)
        
        updatedMembers.push(member.id)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Checked ${members?.length || 0} active members. Marked ${updatedMembers.length} inactive.`,
      updatedMembers
    })
  } catch (error: any) {
    console.error('Cron check-absences error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to check absences' },
      { status: 500 }
    )
  }
}
