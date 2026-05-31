import { config } from '../config'
import { logger } from '../utils/logger'
import { SimulatorDevice } from '../zkteco/simulator'
import { ZKDevice, ZkAttendance, ZkDeviceUser } from '../zkteco/device'

type BridgeDevice = {
  connect(): Promise<boolean>
  disconnect(): Promise<void>
  getAttendanceLogs(): Promise<Array<ZkAttendance | { deviceUserId: string; recordTime: string }>>
  clearAttendanceLogs(): Promise<boolean>
  getUsers(): Promise<ZkDeviceUser[]>
  upsertUser(params: { userId: string; name: string; uid?: number }): Promise<{ created: boolean; user: ZkDeviceUser }>
  startFingerprintEnrollment(userId: string, fingerIndex?: number): Promise<{ success: boolean; mode: string }>
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
        throw new Error(`Unable to connect to device at ${config.device.ip}:${config.device.port}`)
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
    return this.device.getUsers()
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
}

export const connectionManager = new ConnectionManager()
