import { NextRequest, NextResponse } from 'next/server'
import { testDeviceConnection } from '@/lib/device-connection'
import { supabase } from '@/lib/supabase'

export const runtime = 'nodejs'

function toInteger(value: unknown, fallback: number) {
  const parsed = Number(value)
  return Number.isInteger(parsed) ? parsed : fallback
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const deviceId = body.id ? String(body.id) : null
    const ipAddress = String(body.ip_address || '').trim()
    const port = toInteger(body.port, 4370)

    if (!ipAddress) {
      return NextResponse.json(
        { success: false, error: 'Device IP address is required' },
        { status: 400 }
      )
    }

    const result = await testDeviceConnection({ ipAddress, port })

    if (deviceId) {
      const healthPayload = {
        device_id: deviceId,
        status: result.status,
        response_time: result.responseTime,
      }

      const { error: healthError } = await supabase.from('device_health_logs').insert(healthPayload)
      if (healthError) throw healthError

      const { error: deviceError } = await supabase
        .from('fingerprint_devices')
        .update({
          status: result.status,
          last_checked_at: result.checkedAt,
          last_response_time_ms: result.responseTime,
          updated_at: result.checkedAt,
        })
        .eq('id', deviceId)

      if (deviceError) throw deviceError
    }

    const message = result.status === 'Online'
      ? result.portReachable
        ? result.pingReachable
          ? 'Device is online (ping and ZKTeco port OK)'
          : 'Device is online via ZKTeco port (ping blocked — normal for many devices)'
        : 'Device is online on the LAN; ZKTeco port did not answer the SDK probe'
      : result.error || 'Device is offline'

    return NextResponse.json({
      success: true,
      message,
      result,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Connection test failed' },
      { status: 500 }
    )
  }
}
