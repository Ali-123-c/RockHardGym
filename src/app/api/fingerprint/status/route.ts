import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { validateFingerprintApiKey } from '@/lib/fingerprint-auth'

// The Bridge service calls this to report its health
export async function POST(req: Request) {
  const authError = validateFingerprintApiKey(req)
  if (authError) return authError

  try {
    const body = await req.json()
    const { device_id, status, response_time } = body

    if (!device_id || !status) {
      return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 })
    }

    const supabase = getSupabase()

    // Insert health log
    await supabase.from('device_health_logs').insert({
      device_id,
      status,
      response_time
    })

    // Update device status
    await supabase
      .from('fingerprint_devices')
      .update({ status })
      .eq('id', device_id)

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Status Error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// The Admin Dashboard can call this to get overall system status
export async function GET() {
  try {
    const supabase = getSupabase()
    const { data: devices, error } = await supabase
      .from('fingerprint_devices')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    // Get today's attendance count
    const today = new Date().toISOString().split('T')[0]
    const { count: attendanceCount, error: countError } = await supabase
      .from('attendance_logs')
      .select('*', { count: 'exact', head: true })
      .gte('timestamp', `${today}T00:00:00.000Z`)

    if (countError) throw countError

    return NextResponse.json({ 
      success: true, 
      devices,
      today_attendance: attendanceCount || 0
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
