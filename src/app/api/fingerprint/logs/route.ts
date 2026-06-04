import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const deviceId = searchParams.get('device_id')
    const limit = parseInt(searchParams.get('limit') || '50')

    const supabase = getSupabase()
    let query = supabase
      .from('sync_logs')
      .select('*, fingerprint_devices(device_name)')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (deviceId) {
      query = query.eq('device_id', deviceId)
    }

    const { data: logs, error } = await query

    if (error) throw error

    return NextResponse.json({ success: true, logs })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
