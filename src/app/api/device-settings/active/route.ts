import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { validateFingerprintApiKey } from '@/lib/fingerprint-auth'

/**
 * GET /api/device-settings/active
 *
 * Returns the active fingerprint device's IP and port from Supabase.
 * The fingerprint bridge calls this endpoint to discover which device
 * to connect to, instead of relying solely on the local .env file.
 *
 * This is authenticated via the shared FINGERPRINT_API_KEY so the bridge
 * (running on a local PC or separate server) can securely fetch the config.
 */
export async function GET(req: Request) {
  const authError = validateFingerprintApiKey(req)
  if (authError) return authError

  try {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('fingerprint_devices')
      .select('id, ip_address, port')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (error) throw error

    if (!data) {
      return NextResponse.json({
        success: true,
        configured: false,
        message: 'No fingerprint device configured yet. Go to Admin → Devices to add one.',
      })
    }

    return NextResponse.json({
      success: true,
      configured: true,
      device_id: data.id,
      ip_address: data.ip_address,
      port: data.port,
    })
  } catch (error: any) {
    console.error('Failed to fetch active device config:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch device config' },
      { status: 500 }
    )
  }
}
