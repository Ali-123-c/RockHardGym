import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { writeFile, readFile } from 'fs/promises'
import { join } from 'path'

const DEFAULT_DEVICE = {
  device_name: 'ZKTeco K70',
  device_model: 'ZKTeco K70',
  ip_address: '192.168.100.17',
  port: 4370,
  device_number: 1,
  communication_key: 0,
}

function toInteger(value: unknown, fallback: number) {
  const parsed = Number(value)
  return Number.isInteger(parsed) ? parsed : fallback
}

async function updateFingerprintBridgeEnv(ipAddress: string, port: number) {
  // Only attempt filesystem writes in non-serverless environments
  // Vercel serverless functions cannot write to the filesystem
  if (process.env.VERCEL || process.env.NEXT_PUBLIC_VERCEL_ENV === 'production') {
    console.log('Skipping fingerprint-bridge/.env update (serverless environment)')
    return
  }

  try {
    const envPath = join(process.cwd(), 'fingerprint-bridge', '.env')
    
    // Try to read existing .env file
    let envContent = ''
    try {
      envContent = await readFile(envPath, 'utf-8')
    } catch {
      // File doesn't exist yet, create new content
      envContent = ''
    }

    // Parse existing env vars
    const envVars = new Map<string, string>()
    envContent.split('\n').forEach((line) => {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=')
        if (key) envVars.set(key.trim(), valueParts.join('=').trim())
      }
    })

    // Update or add IP and port
    envVars.set('DEVICE_IP', ipAddress)
    envVars.set('DEVICE_PORT', String(port))

    // Rebuild env file
    const newEnvContent = Array.from(envVars.entries())
      .map(([key, value]) => `${key}=${value}`)
      .join('\n')
      .trim() + '\n'

    // Write back to file
    await writeFile(envPath, newEnvContent, 'utf-8')
    console.log(`Updated fingerprint-bridge/.env with DEVICE_IP=${ipAddress} DEVICE_PORT=${port}`)
  } catch (error: any) {
    console.warn('Could not update fingerprint-bridge/.env:', error.message)
    // Don't fail the entire request if env update fails
  }
}

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('fingerprint_devices')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(1)

    if (error) throw error

    const device = data?.[0] ?? null
    let healthLogs: any[] = []

    if (device) {
      const { data: logs, error: logsError } = await supabase
        .from('device_health_logs')
        .select('*')
        .eq('device_id', device.id)
        .order('created_at', { ascending: false })
        .limit(10)

      if (logsError) throw logsError
      healthLogs = logs ?? []
    }

    return NextResponse.json({
      success: true,
      device: device ?? DEFAULT_DEVICE,
      is_configured: Boolean(device),
      health_logs: healthLogs,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to load device settings' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const deviceName = String(body.device_name || '').trim()
    const ipAddress = String(body.ip_address || '').trim()
    const port = toInteger(body.port, 4370)
    const deviceNumber = toInteger(body.device_number, 1)
    const communicationKey = toInteger(body.communication_key, 0)

    if (!deviceName || !ipAddress) {
      return NextResponse.json(
        { success: false, error: 'Device name and IP address are required' },
        { status: 400 }
      )
    }

    if (port < 1 || port > 65535) {
      return NextResponse.json(
        { success: false, error: 'Device port must be between 1 and 65535' },
        { status: 400 }
      )
    }

    const payload = {
      device_name: deviceName,
      device_model: body.device_model || 'ZKTeco K70',
      ip_address: ipAddress,
      port,
      device_number: deviceNumber,
      communication_key: communicationKey,
      communication_password: String(communicationKey),
      updated_at: new Date().toISOString(),
    }

    const query = body.id
      ? supabase.from('fingerprint_devices').update(payload).eq('id', body.id)
      : supabase.from('fingerprint_devices').insert(payload)

    const { data, error } = await query.select().single()

    if (error) throw error

    // Update fingerprint-bridge/.env with new IP and port (only in local environment)
    await updateFingerprintBridgeEnv(ipAddress, port)

    return NextResponse.json({
      success: true,
      message: 'Device settings saved and fingerprint-bridge config updated',
      device: data,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to save device settings' },
      { status: 500 }
    )
  }
}
