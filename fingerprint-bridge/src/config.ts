import dotenv from 'dotenv'
import path from 'path'

// Path to the .env file — used both for initial load and hot-reload watching
export const envPath = path.resolve(process.cwd(), '.env')

// Load .env file
dotenv.config({ path: envPath })

export const config = {
  service: {
    port: parseInt(process.env.BRIDGE_PORT || '5050', 10),
    reconnectIntervalMs: parseInt(process.env.RECONNECT_INTERVAL_MS || '10000', 10),
    // API key for authenticating requests to the bridge itself
    authKey: process.env.BRIDGE_API_KEY || '',
  },
  api: {
    baseUrl: process.env.API_BASE_URL || 'http://localhost:3000',
    key: process.env.API_KEY || ''
  },
  device: {
    id: process.env.DEVICE_ID || 'mock-device-uuid',
    ip: process.env.DEVICE_IP || '192.168.100.16',
    port: parseInt(process.env.DEVICE_PORT || '4370', 10),
    password: process.env.DEVICE_PASSWORD || ''
  },
  sync: {
    intervalMinutes: parseInt(process.env.SYNC_INTERVAL_MINUTES || '5', 10),
    retryIntervalMs: parseInt(process.env.RETRY_INTERVAL_MS || '60000', 10)
  },
  mode: (process.env.MODE || 'simulator') as 'real' | 'simulator'
}

/**
 * Re-read the .env file and update config fields that support hot-reload.
 * Call this when the .env file changes on disk (e.g. device IP updated via web UI).
 * Currently hot-reloadable: device.ip, device.port
 * Returns a list of changed fields, or throws if the file can't be read.
 */
export function reloadConfig(): string[] {
  let raw: string
  try {
    raw = require('fs').readFileSync(envPath, 'utf-8')
  } catch (err: any) {
    throw new Error(`Cannot reload config — .env file not readable: ${err.message}`)
  }

  const freshEnv = dotenv.parse(raw)

  const newIp = (freshEnv.DEVICE_IP || '').trim()
  const newPort = parseInt(freshEnv.DEVICE_PORT || '4370', 10)
  const newPassword = (freshEnv.DEVICE_PASSWORD || '').trim()
  const newMode = (freshEnv.MODE || 'simulator') as 'real' | 'simulator'

  const changed: string[] = []

  if (newIp && newIp !== config.device.ip) {
    config.device.ip = newIp
    changed.push(`ip → ${newIp}`)
  }
  if (newPort > 0 && newPort !== config.device.port) {
    config.device.port = newPort
    changed.push(`port → ${newPort}`)
  }
  if (newPassword !== config.device.password) {
    config.device.password = newPassword
  }
  if (newMode !== config.mode) {
    config.mode = newMode
    changed.push(`mode → ${newMode}`)
  }

  return changed
}
