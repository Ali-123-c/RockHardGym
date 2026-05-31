// @ts-ignore
import ZKLib from 'node-zklib'
// @ts-ignore
import { COMMANDS } from 'node-zklib/constants'
import { config } from '../config'
import { logger } from '../utils/logger'
import { encodeUserData72 } from './userCodec'

export interface ZkAttendance {
  userSn: string
  deviceUserId: string // enrollNumber
  recordTime: string // timestamp
}

export interface ZkDeviceUser {
  uid: number
  role: number
  name: string
  userId: string
  cardno: number
}

export class ZKDevice {
  private zkInstance: any
  private isConnected = false
  private realtimeStarted = false

  constructor() {
    this.zkInstance = new ZKLib(config.device.ip, config.device.port, 10000, 4000)
  }

  async connect(): Promise<boolean> {
    try {
      await this.zkInstance.createSocket()
      this.isConnected = true
      logger.info(`Connected to ZKTeco device at ${config.device.ip}:${config.device.port}`)
      return true
    } catch (error) {
      logger.error(`Failed to connect to ZKTeco device:`, error)
      this.isConnected = false
      return false
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.isConnected) {
        await this.zkInstance.disconnect()
        this.isConnected = false
        logger.info('Disconnected from ZKTeco device')
      }
    } catch (error) {
      logger.error('Error disconnecting from device:', error)
    }
  }

  async getAttendanceLogs(): Promise<ZkAttendance[]> {
    if (!this.isConnected) {
      const connected = await this.connect()
      if (!connected) return []
    }

    try {
      const logs = await this.zkInstance.getAttendances()
      return (logs.data || []).map((log: ZkAttendance) => ({
        userSn: log.userSn,
        deviceUserId: String(log.deviceUserId ?? '').replace(/\0/g, '').trim() || String(log.userSn ?? ''),
        recordTime: log.recordTime,
      }))
    } catch (error) {
      logger.error('Error fetching attendance logs:', error)
      return []
    }
  }

  startRealtimeListener(onScan: (log: { deviceUserId: string; userSn?: string; recordTime: Date }) => void) {
    if (this.realtimeStarted || !this.isConnected) return

    this.realtimeStarted = true
    logger.info('Listening for real-time fingerprint scans on device...')

    this.zkInstance.getRealTimeLogs((data: { userId?: string; attTime?: Date }) => {
      const deviceUserId = String(data?.userId ?? '').replace(/\0/g, '').trim()
      if (!deviceUserId || !data?.attTime) return

      onScan({
        deviceUserId,
        recordTime: data.attTime,
      })
    })
  }

  async clearAttendanceLogs(): Promise<boolean> {
    if (!this.isConnected) return false
    try {
      await this.zkInstance.clearAttendanceLog()
      logger.info('Cleared attendance logs from device')
      return true
    } catch (error) {
      logger.error('Error clearing attendance logs:', error)
      return false
    }
  }

  async getUsers(): Promise<ZkDeviceUser[]> {
    if (!this.isConnected) {
      const connected = await this.connect()
      if (!connected) return []
    }

    try {
      const result = await this.zkInstance.getUsers()
      return (result?.data || []).map((user: ZkDeviceUser) => ({
        uid: user.uid,
        role: user.role,
        name: user.name,
        userId: String(user.userId || '').trim(),
        cardno: user.cardno ?? 0,
      }))
    } catch (error) {
      logger.error('Error fetching device users:', error)
      return []
    }
  }

  async upsertUser(params: { userId: string; name: string; uid?: number }) {
    if (!this.isConnected) {
      const connected = await this.connect()
      if (!connected) throw new Error('Device is offline')
    }

    const existing = await this.getUsers()
    const userId = params.userId.slice(0, 9)
    const found = existing.find(
      (user) => user.userId === userId || user.userId === String(Number(userId))
    )

    if (found) {
      return { created: false, user: found }
    }

    const maxUid = existing.reduce((max, user) => Math.max(max, user.uid), 0)
    const uid = params.uid ?? maxUid + 1
    const record = encodeUserData72({
      uid,
      role: 0,
      password: '',
      name: params.name.slice(0, 24),
      userId,
    })

    await this.zkInstance.executeCmd(COMMANDS.CMD_USER_WRQ, record)
    logger.info(`Created device user ${userId} (uid ${uid})`)
    return {
      created: true,
      user: { uid, role: 0, name: params.name, userId, cardno: 0 },
    }
  }

  /** Puts device in fingerprint enrollment mode for the given user PIN. */
  async startFingerprintEnrollment(userId: string, fingerIndex = 0) {
    if (!this.isConnected) {
      const connected = await this.connect()
      if (!connected) throw new Error('Device is offline')
    }

    const pin = userId.slice(0, 9)
    const buffer = Buffer.alloc(4)
    buffer.writeUInt32LE(parseInt(pin, 10) || 0, 0)

    try {
      await this.zkInstance.executeCmd(COMMANDS.CMD_STARTENROLL, buffer)
      logger.info(`Started fingerprint enrollment for user ${pin} (finger ${fingerIndex})`)
      return { success: true, mode: 'start_enroll' as const }
    } catch (error) {
      logger.warn('CMD_STARTENROLL failed, trying capture finger command', error)
      await this.zkInstance.executeCmd(COMMANDS.CMD_CAPTUREFINGER, buffer)
      return { success: true, mode: 'capture_finger' as const }
    }
  }
}
