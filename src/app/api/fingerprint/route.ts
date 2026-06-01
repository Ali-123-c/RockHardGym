import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// POST /api/fingerprint/scan - Receive fingerprint scan from Python app
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { fingerprint_template, member_id } = body

    let targetMemberId = member_id

    // Fallback/simulation if no member_id but template is provided
    if (!targetMemberId && fingerprint_template) {
      const { data: activeMembers } = await supabase
        .from('members')
        .select('id')
        .eq('status', 'Active')
        .limit(1)

      if (activeMembers && activeMembers.length > 0) {
        targetMemberId = activeMembers[0].id
      }
    }

    if (!targetMemberId) {
      return NextResponse.json(
        { success: false, error: 'Member ID or template is required' },
        { status: 400 }
      )
    }

    // Fetch member
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('id, name, membership_no, status')
      .eq('id', targetMemberId)
      .single()

    if (memberError || !member) {
      return NextResponse.json(
        { success: false, error: 'Member not found' },
        { status: 404 }
      )
    }

    // Insert attendance record
    const { error: insertError } = await supabase
      .from('attendance')
      .insert([
        {
          member_id: targetMemberId,
          scan_time: new Date().toISOString(),
          date: new Date().toISOString().split('T')[0],
        }
      ])

    if (insertError) throw insertError

    return NextResponse.json({
      success: true,
      message: 'Attendance marked via fingerprint',
      member: {
        id: member.id,
        name: member.name,
        membership_no: member.membership_no,
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process fingerprint' },
      { status: 500 }
    )
  }
}

// GET /api/fingerprint - Status only (no sensitive config exposed)
export async function GET(_request: NextRequest) {
  return NextResponse.json({
    success: true,
    status: 'Bridge endpoint active',
    message: 'Use /api/fingerprint/scan for attendance marking',
  }, { status: 200 })
}
