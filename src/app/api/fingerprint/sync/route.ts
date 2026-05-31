import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { validateFingerprintApiKey } from '@/lib/fingerprint-auth'
import {
  buildMemberLookupMap,
  localDateFromTimestamp,
  normalizeEnrollKey,
  resolveMemberForEnroll,
  type MemberRow,
} from '@/lib/member-enroll'

async function markAttendance(
  memberId: string,
  timestamp: string
): Promise<'created' | 'exists' | 'error'> {
  const scanDate = localDateFromTimestamp(timestamp)

  const { data: existing } = await supabase
    .from('attendance')
    .select('id')
    .eq('member_id', memberId)
    .eq('date', scanDate)
    .maybeSingle()

  if (existing) return 'exists'

  const { error } = await supabase.from('attendance').insert({
    member_id: memberId,
    scan_time: timestamp,
    date: scanDate,
  })

  if (error) {
    if (error.code === '23505') return 'exists'
    console.error('Attendance insert failed:', error)
    return 'error'
  }

  return 'created'
}

export async function POST(req: Request) {
  const authError = validateFingerprintApiKey(req)
  if (authError) return authError

  try {
    const body = await req.json()
    const { device_id, logs } = body

    if (!device_id || !Array.isArray(logs)) {
      return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 })
    }

    const { data: allMembers, error: memberError } = await supabase
      .from('members')
      .select('id, membership_no, name, status')

    if (memberError) {
      console.error('Error fetching members:', memberError)
    }

    const memberMap = buildMemberLookupMap((allMembers || []) as MemberRow[])
    let recordsSynced = 0
    let attendanceMarked = 0
    const errors: string[] = []
    const unmatched = new Set<string>()

    for (const log of logs) {
      const enrollKey = normalizeEnrollKey(log.enrollNumber)
      if (!enrollKey) {
        errors.push('Skipped log with empty enrollNumber')
        continue
      }

      const memberInfo = resolveMemberForEnroll(memberMap, log.enrollNumber)
      const memberId = memberInfo?.id || null
      const memberName = memberInfo?.name || `Unknown (${enrollKey})`
      const eventType = log.event_type || 'checkin'

      if (!memberInfo) {
        unmatched.add(enrollKey)
      }

      const { error: insertError } = await supabase.from('attendance_logs').insert({
        member_id: memberId,
        member_name: memberName,
        device_id,
        event_type: eventType,
        timestamp: log.timestamp,
      })

      const isDuplicateLog = insertError?.code === '23505'

      if (insertError && !isDuplicateLog) {
        errors.push(`Log ${enrollKey}: ${insertError.message}`)
        continue
      }

      if (!insertError) {
        recordsSynced++
      }

      if (memberId && eventType === 'checkin') {
        const result = await markAttendance(memberId, log.timestamp)
        if (result === 'created') attendanceMarked++
      }
    }

    const syncStatus =
      errors.length === 0 ? 'Success' : recordsSynced > 0 || attendanceMarked > 0 ? 'Partial' : 'Failed'
    const errorMessage = errors.length > 0 ? errors.join(' | ').substring(0, 500) : null
    const unmatchedList = [...unmatched]

    if (unmatchedList.length > 0) {
      console.warn('Unmatched device user IDs (no membership_no):', unmatchedList.join(', '))
    }

    await supabase.from('sync_logs').insert({
      device_id,
      sync_status: syncStatus,
      records_synced: recordsSynced,
      error_message:
        errorMessage ||
        (unmatchedList.length > 0
          ? `Unmatched device IDs: ${unmatchedList.join(', ').substring(0, 400)}`
          : null),
    })

    await supabase
      .from('fingerprint_devices')
      .update({ last_sync: new Date().toISOString(), status: 'Online' })
      .eq('id', device_id)

    return NextResponse.json({
      success: true,
      synced: recordsSynced,
      attendance_marked: attendanceMarked,
      unmatched: unmatchedList.length > 0 ? unmatchedList : undefined,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error: any) {
    console.error('Sync Error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
