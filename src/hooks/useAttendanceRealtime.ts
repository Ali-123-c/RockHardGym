import { useEffect, useRef } from 'react'
import { supabaseClient } from '@/lib/supabase-client'

export type AttendanceRecord = {
  id: string
  member_id: string
  scan_time: string
  date: string
  created_at: string
  members: {
    name: string
    membership_no: string
    phone: string
    status: string
    fee_amount: number
  }
}

/**
 * Hook: Subscribe to real-time attendance updates from Supabase
 *
 * @param date - The date to subscribe to (YYYY-MM-DD format)
 * @param onNewRecord - Callback fired when new attendance is inserted
 *
 * Usage:
 *   useAttendanceRealtime(date, (record) => {
 *     setRecords(prev => [...prev, record])
 *   })
 */
export function useAttendanceRealtime(
  date: string,
  onNewRecord: (record: AttendanceRecord) => void
) {
  const subscriptionRef = useRef<any>(null)

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]

    // Only subscribe for today's attendance
    // (Past dates use cached polling data)
    if (date !== today) {
      return
    }

    console.log(`[REALTIME] Subscribing to attendance changes for ${date}`)

    // Subscribe to new INSERT events on the attendance table
    // Filter by date to only get today's scans
    subscriptionRef.current = supabaseClient
      .channel(`attendance:${date}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'attendance',
          filter: `date=eq.${date}`,
        },
        async (payload) => {
          console.log('[REALTIME] New attendance event:', payload.new)

          // Fetch full record with member details
          await fetchAndNotifyNewRecord(payload.new.id, onNewRecord)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'attendance',
          filter: `date=eq.${date}`,
        },
        (payload) => {
          console.log('[REALTIME] Attendance deleted:', payload.old.id)
          // Optional: Handle deletion if needed
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[REALTIME] ✅ Subscribed to attendance/${date}`)
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`[REALTIME] ❌ Channel error for attendance/${date}`)
        } else {
          console.log(`[REALTIME] Status: ${status}`)
        }
      })

    // Cleanup: Unsubscribe when component unmounts or date changes
    return () => {
      if (subscriptionRef.current) {
        console.log(`[REALTIME] Unsubscribing from attendance/${date}`)
        supabaseClient.removeChannel(subscriptionRef.current)
        subscriptionRef.current = null
      }
    }
  }, [date, onNewRecord])
}

/**
 * Fetch full attendance record with member details and notify callback
 */
async function fetchAndNotifyNewRecord(
  attendanceId: string,
  callback: (record: AttendanceRecord) => void
) {
  try {
    const { data, error } = await supabaseClient
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
      .eq('id', attendanceId)
      .single()

    if (error) {
      console.error('[REALTIME] Failed to fetch record:', error)
      return
    }

    console.log('[REALTIME] 📍 New record fetched:', (data as any).members?.name)
    callback(data as unknown as AttendanceRecord)
  } catch (error) {
    console.error('[REALTIME] Error fetching new record:', error)
  }
}
