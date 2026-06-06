import axios from 'axios'
import { config } from '../config'
import { logger } from '../utils/logger'

interface DeviceConfigResponse {
  success: boolean
  configured: boolean
  device_id?: string
  ip_address?: string
  port?: number
  message?: string
}

const apiClient = axios.create({
  baseURL: config.api.baseUrl,
  headers: {
    'x-api-key': config.api.key,
    'Content-Type': 'application/json',
  },
  timeout: 10000,
})

let lastLoggedConfigured = false

/**
 * Fetch the active device configuration from the GymFlow API.
 * This allows the bridge to discover the device IP/port from the database
 * (set by the admin via the Web UI) instead of relying solely on .env.
 *
 * Returns whether the config changed and the bridge should reconnect.
 */
export async function syncConfigFromApi(): Promise<{
  changed: boolean
  ip_address: string | null
  port: number | null
  device_id: string | null
}> {
  try {
    const response = await apiClient.get<DeviceConfigResponse>('/api/device-settings/active')
    const data = response.data

    if (!data.success) {
      logger.warn(`Config sync: API returned error — ${data.message || 'unknown'}`)
      return { changed: false, ip_address: null, port: null, device_id: null }
    }

    if (!data.configured || !data.ip_address) {
      if (lastLoggedConfigured) {
        logger.warn('Config sync: No device configured in database yet.')
        lastLoggedConfigured = false
      }
      return { changed: false, ip_address: null, port: null, device_id: null }
    }

    lastLoggedConfigured = true

    const apiIp = data.ip_address.trim()
    const apiPort = data.port ?? 4370
    const apiDeviceId = data.device_id || ''

    let changed = false

    // Check if IP or port differs from current config
    if (apiIp !== config.device.ip) {
      logger.info(`Config sync: IP changed from ${config.device.ip} → ${apiIp}`)
      config.device.ip = apiIp
      changed = true
    }

    if (apiPort !== config.device.port) {
      logger.info(`Config sync: Port changed from ${config.device.port} → ${apiPort}`)
      config.device.port = apiPort
      changed = true
    }

    // Also update device ID from the database (overrides .env)
    if (apiDeviceId && apiDeviceId !== config.device.id) {
      logger.info(`Config sync: Device ID changed from ${config.device.id} → ${apiDeviceId}`)
      config.device.id = apiDeviceId
    }

    if (changed) {
      logger.info(`Config synced from API: ${config.device.ip}:${config.device.port} (device: ${config.device.id})`)
    }

    return { changed, ip_address: apiIp, port: apiPort, device_id: apiDeviceId }
  } catch (error: any) {
    // Don't log errors on every retry — just silently fail
    // The bridge will continue using its current config from .env
    if (error?.code === 'ECONNREFUSED' || error?.code === 'ECONNABORTED') {
      logger.device(`Config sync: API unreachable (${error.code}) — using .env config`)
    } else {
      logger.device(`Config sync failed: ${error?.message || error} — using .env config`)
    }
    return { changed: false, ip_address: null, port: null, device_id: null }
  }
}
