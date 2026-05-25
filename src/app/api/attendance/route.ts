import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// POST /api/attendance - Mark attendance (from fingerprint or manual)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    // client_timezone: e.g. "Asia/Karachi", local_date: e.g. "2026-05-24"
    const { member_id, scan_time, client_timezone, local_date } = body

    if (!member_id) {
      return NextResponse.json(
        { success: false, error: 'Missing member_id' },
        { status: 400 }
      )
    }

    // Check if member exists
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('id, name, status, membership_no, joining_date, exemption_month')
      .eq('id', member_id)
      .single()

    if (memberError || !member) {
      return NextResponse.json(
        { success: false, error: 'Member not found' },
        { status: 404 }
      )
    }

    // Compute the UTC ISO timestamp for scan_time
    const scanTimeISO = scan_time
      ? new Date(scan_time * 1000).toISOString()
      : new Date().toISOString()

    // Use client-supplied local date to avoid UTC date mismatch for non-UTC timezones.
    // Fall back to deriving it from scan_time if not provided.
    let attendanceDate: string
    if (local_date) {
      attendanceDate = local_date
    } else if (client_timezone) {
      attendanceDate = new Date().toLocaleDateString('en-CA', { timeZone: client_timezone })
    } else {
      // Last resort: UTC date (may be off by a day for UTC+ zones late at night)
      attendanceDate = new Date().toISOString().split('T')[0]
    }

    // --- 10-Day Absence Check ---
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() // 0-11
    const currentMonthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`

    if (member.exemption_month !== currentMonthStr && member.status !== 'Inactive') {
      const start = new Date(currentYear, currentMonth, 1)
      if (member.joining_date) {
        const joinDate = new Date(member.joining_date)
        if (joinDate.getFullYear() === currentYear && joinDate.getMonth() === currentMonth) {
          start.setDate(Math.max(1, joinDate.getDate()))
        }
      }

      let workingDaysBeforeToday = 0
      const current = new Date(start)
      const todayStart = new Date(currentYear, currentMonth, now.getDate())
      
      while (current < todayStart) {
        if (current.getDay() !== 0) { // 0 is Sunday
          workingDaysBeforeToday++
        }
        current.setDate(current.getDate() + 1)
      }

      const { data: currentMonthAttendance } = await supabase
        .from('attendance')
        .select('date')
        .eq('member_id', member_id)
        .like('date', `${currentMonthStr}-%`)

      const todayStr = now.toLocaleDateString('en-CA')
      const pastAttendance = (currentMonthAttendance || []).filter(a => a.date !== todayStr)
      const uniqueDaysPresentBeforeToday = new Set(pastAttendance.map(a => a.date)).size
      
      const daysAbsentBeforeToday = Math.max(0, workingDaysBeforeToday - uniqueDaysPresentBeforeToday)
      
      if (daysAbsentBeforeToday >= 10) {
        // Automatically mark as Inactive and notify admin
        await supabase.from('members').update({ status: 'Inactive' }).eq('id', member_id)
        
        return NextResponse.json(
          { success: false, error: 'requires_admin_review', message: 'Member has been absent for 10 days. Status set to Inactive. Admin review required.' },
          { status: 403 }
        )
      }
    } else if (member.status === 'Inactive') {
       return NextResponse.json(
         { success: false, error: 'requires_admin_review', message: 'Member is currently inactive due to absence.' },
         { status: 403 }
       )
    }
    // ----------------------------

    // Check if already marked for today
    const { data: existingAttendance } = await supabase
      .from('attendance')
      .select('id')
      .eq('member_id', member_id)
      .eq('date', attendanceDate)
      .single()

    if (existingAttendance) {
      return NextResponse.json(
        { success: false, error: 'Attendance already marked for today' },
        { status: 400 }
      )
    }

    // Insert attendance record
    const { data, error } = await supabase
      .from('attendance')
      .insert([
        {
          member_id,
          scan_time: scanTimeISO,
          date: attendanceDate,
        }
      ])
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(
      { success: true, message: 'Attendance marked successfully', data, member },
      { status: 201 }
    )
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to mark attendance' },
      { status: 500 }
    )
  }
}

// GET /api/attendance - Get attendance records
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const member_id = searchParams.get('member_id')

    let query = supabase
      .from('attendance')
      .select(`
        id,
        member_id,
        scan_time,
        date,
        created_at,
        members (
          name,
          membership_no,
          phone,
          status,
          fee_amount
        )
      `)

    if (date) {
      query = query.eq('date', date)
    }
    if (member_id) {
      query = query.eq('member_id', member_id)
    }

    const { data, error } = await query.order('scan_time', { ascending: false })

    if (error) throw error

    return NextResponse.json({
      success: true,
      data: data || [],
      count: data?.length || 0,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch attendance' },
      { status: 500 }
    )
  }
}
