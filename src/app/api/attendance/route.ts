import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { withRetry } from '@/lib/withRetry'

// POST /api/attendance - Mark attendance (from fingerprint or manual)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { member_id, scan_time, client_timezone, local_date, idempotency_key } = body

    if (!member_id) {
      return NextResponse.json(
        { success: false, error: 'Missing member_id' },
        { status: 400 }
      )
    }

    const supabase = getSupabase()

    // Check if member exists with retries for transient failures
    const member = await withRetry(async () => {
      const { data, error } = await supabase
        .from('members')
        .select('id, name, status, membership_no, joining_date, exemption_month')
        .eq('id', member_id)
        .single()
      
      if (error) throw error
      return data
    })

    if (!member) {
      return NextResponse.json(
        { success: false, error: 'Member not found' },
        { status: 404 }
      )
    }

    // ── 10-Day Absence Rule ────────────────────────────────────────────────
    // Block attendance if the member has missed 10+ working days (Mon–Sat)
    if (member.status === 'Active') {
      const now = new Date()
      const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

      if (member.exemption_month !== currentMonthStr) {
        const { data: lastAttendance } = await supabase
          .from('attendance')
          .select('date')
          .eq('member_id', member_id)
          .order('date', { ascending: false })
          .limit(1)
          .maybeSingle()

        const startDate = lastAttendance?.date
          ? new Date(lastAttendance.date + 'T00:00:00')
          : new Date(member.joining_date + 'T00:00:00')

        startDate.setDate(startDate.getDate() + 1)

        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

        let workingDaysAbsent = 0
        const cursor = new Date(startDate)
        while (cursor < today) {
          if (cursor.getDay() !== 0) {
            workingDaysAbsent++
          }
          cursor.setDate(cursor.getDate() + 1)
        }

        if (workingDaysAbsent >= 10) {
          return NextResponse.json({
            success: false,
            error: 'requires_admin_review',
            message: `Member has been absent for ${workingDaysAbsent} working days. Admin review required.`,
            absentDays: workingDaysAbsent,
          }, { status: 403 })
        }
      }
    } else if (member.status === 'Inactive') {
       return NextResponse.json(
         { success: false, error: 'requires_admin_review', message: 'Member is currently inactive.' },
         { status: 403 }
       )
    }

    const scanTimeISO = scan_time
      ? new Date(scan_time * 1000).toISOString()
      : new Date().toISOString()

    let attendanceDate: string
    if (local_date) {
      attendanceDate = local_date
    } else if (client_timezone) {
      attendanceDate = new Date().toLocaleDateString('en-CA', { timeZone: client_timezone })
    } else {
      attendanceDate = new Date().toISOString().split('T')[0]
    }

    // Check if already marked for today
    const existingAttendance = await withRetry(async () => {
      const { data, error } = await supabase
        .from('attendance')
        .select('id')
        .eq('member_id', member_id)
        .eq('date', attendanceDate)
        .maybeSingle()
      
      if (error && error.code !== 'PGRST116') throw error
      return data
    })

    if (existingAttendance) {
      if (idempotency_key) {
        return NextResponse.json(
          { success: true, message: 'Attendance already marked for today (idempotent)', data: existingAttendance, member, idempotent: true },
          { status: 200 }
        )
      }
      return NextResponse.json(
        { success: false, error: 'Attendance already marked for today' },
        { status: 400 }
      )
    }

    // Insert attendance record with retry logic
    const insertedData = await withRetry(async () => {
      const { data, error } = await supabase
        .from('attendance')
        .insert([{ member_id, scan_time: scanTimeISO, date: attendanceDate }])
        .select()
        .single()
      
      if (error) throw error
      return data
    })

    const response = NextResponse.json(
      { success: true, message: 'Attendance marked successfully', data: insertedData, member },
      { status: 201 }
    )
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    return response
  } catch (error: any) {
    console.error('POST /attendance error:', error)
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

    const supabase = getSupabase()
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

    const response = NextResponse.json({
      success: true,
      data: data || [],
      count: data?.length || 0,
    })
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
    response.headers.set('Pragma', 'no-cache')
    return response
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch attendance' },
      { status: 500 }
    )
  }
}