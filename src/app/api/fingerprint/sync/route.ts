import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { validateFingerprintApiKey } from '@/lib/fingerprint-auth'

export async function POST(req: Request) {
  // 1. Validate API Key
  const authError = validateFingerprintApiKey(req)
  if (authError) return authError

  try {
    const body = await req.json()
    const { device_id, logs } = body

    if (!device_id || !Array.isArray(logs)) {
      return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 })
    }

    let recordsSynced = 0
    let errors = []

    // 2. Fetch members by membership_no to map enrollNumber to member_id
    const enrollNumbers = [...new Set(logs.map((l: any) => l.enrollNumber))]
    const { data: members, error: memberError } = await supabase
      .from('members')
      .select('id, membership_no, name')
      .in('membership_no', enrollNumbers)
    
    if (memberError) {
      console.error('Error fetching members:', memberError)
    }

    const memberMap = new Map(members?.map(m => [m.membership_no, { id: m.id, name: m.name }]) || [])

    // 3. Insert Logs
    for (const log of logs) {
      const memberInfo = memberMap.get(log.enrollNumber.toString())
      const memberId = memberInfo?.id || null
      const memberName = memberInfo?.name || `Unknown (${log.enrollNumber})`
      const eventType = log.event_type || 'checkin'

      const { error: insertError } = await supabase
        .from('attendance_logs')
        .insert({
          member_id: memberId,
          member_name: memberName,
          device_id,
          event_type: eventType,
          timestamp: log.timestamp
        })

      if (insertError) {
        // Suppress duplicate errors from the UNIQUE constraint
        if (insertError.code !== '23505') {
          errors.push(`Failed for ${log.enrollNumber}: ${insertError.message}`)
        }
      } else {
        recordsSynced++
        
        // Also insert into main attendance table if checkin and member exists
        if (memberId && eventType === 'checkin') {
          const scanDate = new Date(log.timestamp).toISOString().split('T')[0]
          const { data: existing } = await supabase
            .from('attendance')
            .select('id')
            .eq('member_id', memberId)
            .eq('date', scanDate)
            .maybeSingle()

          if (!existing) {
            await supabase.from('attendance').insert({
              member_id: memberId,
              scan_time: log.timestamp,
              date: scanDate,
            })
          }
        }
      }
    }

    // 4. Record Sync Log
    const syncStatus = errors.length === 0 ? 'Success' : recordsSynced > 0 ? 'Partial' : 'Failed'
    const errorMessage = errors.length > 0 ? errors.join(' | ').substring(0, 500) : null

    await supabase.from('sync_logs').insert({
      device_id,
      sync_status: syncStatus,
      records_synced: recordsSynced,
      error_message: errorMessage
    })

    // Update Device last_sync
    await supabase
      .from('fingerprint_devices')
      .update({ last_sync: new Date().toISOString(), status: 'Online' })
      .eq('id', device_id)

    return NextResponse.json({
      success: true,
      synced: recordsSynced,
      errors: errors.length > 0 ? errors : undefined
    })

  } catch (error: any) {
    console.error('Sync Error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
