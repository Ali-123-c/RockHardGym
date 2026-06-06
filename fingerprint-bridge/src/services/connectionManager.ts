import { config } from '../config'
import { logger } from '../utils/logger'
import { SimulatorDevice } from '../zkteco/simulator'
import { ZKDevice, ZkAttendance, ZkDeviceUser } from '../zkteco/device'
import { handleRealtimeScan } from './realtimeSync'
import { syncConfigFromApi } from './configSync'

type BridgeDevice = {
  connect(): Promise<boolean>
  disconnect(): Promise<void>
  getAttendanceLogs(): Promise<Array<ZkAttendance | { deviceUserId: string; recordTime: string }>>
  clearAttendanceLogs(): Promise<boolean>
  getUsers(): Promise<ZkDeviceUser[]>
  upsertUser(params: { userId: string; name: string; uid?: number }): Promise<{ created: boolean; user: ZkDeviceUser }>
  startFingerprintEnrollment(userId: string, fingerIndex?: number): Promise<{ success: boolean; mode: string }>
  startRealtimeListener?(
    onScan: (log: { deviceUserId: string; userSn?: string; recordTime: Date }) => void
  ): void
}

export interface ConnectionStatus {
  connected: boolean
  state: 'connecting' | 'online' | 'offline' | 'error'
  ip: string
  port: number
  mode: 'real' | 'simulator'
  lastConnectedAt: string | null
  lastDisconnectedAt: string | null
  lastError: string | null
  reconnectAttempts: number
  nextReconnectAt: string | null
}

class ConnectionManager {
  private device: BridgeDevice
  private reconnectTimer: NodeJS.Timeout | null = null
  private connecting = false
  private status: ConnectionStatus = {
    connected: false,
    state: 'offline',
    ip: config.device.ip,
    port: config.device.port,
    mode: config.mode,
    lastConnectedAt: null,
    lastDisconnectedAt: null,
    lastError: null,
    reconnectAttempts: 0,
    nextReconnectAt: null
  }

  constructor() {
    this.device = config.mode === 'simulator' ? new SimulatorDevice() : new ZKDevice()
  }

  getStatus() {
    return { ...this.status }
  }

  async start() {
    logger.connection(`Starting connection manager for ${config.device.ip}:${config.device.port}`)

    // Fetch the active device config from the GymFlow API first.
    // This overrides the .env file with whatever the admin configured in the Web UI.
    // If the API is unreachable, the bridge falls back to .env values gracefully.
    const synced = await syncConfigFromApi()
    if (synced.changed) {
      logger.connection(`Config updated from API: ${synced.ip_address}:${synced.port}`)
      // Recreate the device instance so it uses the updated config.device.ip/port
      this.device = config.mode === 'simulator' ? new SimulatorDevice() : new ZKDevice()
    }

    await this.connect()
  }

  async stop() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    await this.disconnect()
  }

  async connect() {
    if (this.connecting) return this.status.connected

    this.connecting = true
    this.status.state = 'connecting'

    try {
      const connected = await this.device.connect()

      if (!connected) {
        this.status = {
          ...this.status,
          state: 'error',
          lastDisconnectedAt: new Date().toISOString(),
          lastError: `TCP connection to ${config.device.ip}:${config.device.port} failed — check IP, power, and firewall`,
        }
        logger.error(this.status.lastError || 'Connection failed')
        this.scheduleReconnect()
        return false
      }

      this.status = {
        ...this.status,
        connected: true,
        state: 'online',
        lastConnectedAt: new Date().toISOString(),
        lastError: null,
        reconnectAttempts: 0,
        nextReconnectAt: null
      }

      logger.connection(`Device connection established at ${config.device.ip}:${config.device.port}`)
      this.startRealtimeIfSupported()
      return true
    } catch (error: any) {
      this.status = {
        ...this.status,
        connected: false,
        state: 'error',
        lastDisconnectedAt: new Date().toISOString(),
        lastError: error.message || String(error)
      }

      logger.error('Device connection failed', error)
      this.scheduleReconnect()
      return false
    } finally {
      this.connecting = false
    }
  }

  async disconnect() {
    try {
      await this.device.disconnect()
    } finally {
      this.status = {
        ...this.status,
        connected: false,
        state: 'offline',
        lastDisconnectedAt: new Date().toISOString()
      }
      logger.connection('Device disconnected')
    }
  }

  private async ensureConnected() {
    const connected = this.status.connected || (await this.connect())
    if (!connected) {
      throw new Error(this.status.lastError || 'Device is offline')
    }
  }

  async getDeviceUsers() {
    await this.ensureConnected()

    try {
      return await this.device.getUsers()
    } catch (error: any) {
      this.status = {
        ...this.status,
        connected: false,
        state: 'error',
        lastDisconnectedAt: new Date().toISOString(),
        lastError: error?.message || String(error)
      }
      logger.error('Failed to read device users from device', error)
      this.scheduleReconnect()
      throw error
    }
  }

  async registerMemberOnDevice(params: { userId: string; name: string }) {
    await this.ensureConnected()
    const user = await this.device.upsertUser(params)
    return user
  }

  async startMemberEnrollment(userId: string, fingerIndex = 0) {
    await this.ensureConnected()
    return this.device.startFingerprintEnrollment(userId, fingerIndex)
  }

  async getAttendanceLogs() {
    const connected = this.status.connected || await this.connect()

    if (!connected) {
      throw new Error(this.status.lastError || 'Device is offline')
    }

    try {
      const logs = await this.device.getAttendanceLogs()
      logger.device(`Fetched ${logs.length} attendance logs from device`)
      return logs
    } catch (error: any) {
      this.status = {
        ...this.status,
        connected: false,
        state: 'error',
        lastDisconnectedAt: new Date().toISOString(),
        lastError: error.message || String(error)
      }
      logger.error('Failed to read attendance logs from device', error)
      this.scheduleReconnect()
      throw error
    }
  }

  private startRealtimeIfSupported() {
    if (typeof this.device.startRealtimeListener !== 'function') return

    this.device.startRealtimeListener((log) => {
      handleRealtimeScan(log).catch((error) => {
        logger.error('Realtime attendance sync failed', error)
      })
    })
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return

    const nextReconnectAt = new Date(Date.now() + config.service.reconnectIntervalMs).toISOString()
    this.status.reconnectAttempts += 1
    this.status.nextReconnectAt = nextReconnectAt

    logger.connection(
      `Scheduling reconnect attempt ${this.status.reconnectAttempts} at ${nextReconnectAt}`
    )

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null
      await this.connect()
    }, config.service.reconnectIntervalMs)
  }

  /**
   * Hot-reload: disconnect from the current device, create a new device instance
   * using the updated config, and attempt to reconnect.
   * Returns the new connection status.
   */
  async reconnectWithConfig() {
    logger.connection('Hot-reload triggered — reconnecting device with new config...')

    // Cancel any pending reconnect timers
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    // Before reconnecting, pull the latest device config from the GymFlow API.
    // This ensures the bridge always uses the IP/port set in the Web UI,
    // even if the .env file is stale or was never updated (e.g., on Vercel).
    const synced = await syncConfigFromApi()
    if (synced.changed) {
      logger.connection(`Config refreshed from API: ${synced.ip_address}:${synced.port}`)
    }

    // Disconnect from the old device
    await this.disconnect()

    // Create a new device instance with the updated config
    this.device = config.mode === 'simulator' ? new SimulatorDevice() : new ZKDevice()

    // Update status with new IP/port
    this.status.ip = config.device.ip
    this.status.port = config.device.port
    this.status.reconnectAttempts = 0

    // Attempt new connection
    await this.connect()

    logger.connection(`Hot-reload complete — device status: ${this.status.state}`)
    return this.getStatus()
  }
}

export const connectionManager = new ConnectionManager()
