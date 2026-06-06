import ZktecoJs from 'zkteco-js'
import { config } from '../config'
import { logger } from '../utils/logger'
import { encodeUserData72 } from './userCodec'

// Command constants (same protocol as zkteco-js uses internally)
const CMD_DISABLEDEVICE = 1003
const CMD_AUTH = 1102
const CMD_USER_WRQ = 8
const CMD_STARTENROLL = 61
const CMD_CAPTUREFINGER = 1009

function getZkErrorMessage(error: unknown): string {
  if (!error) return 'Unknown error'
  if (typeof error === 'string') return error

  const anyError = error as any
  if (typeof anyError.err?.message === 'string' && anyError.err.message.trim()) {
    return anyError.err.message
  }
  if (typeof anyError.message === 'string' && anyError.message.trim()) {
    return anyError.message
  }
  if (typeof anyError.toString === 'function') {
    const str = anyError.toString()
    if (str && str !== '[object Object]') return str
  }

  try {
    return JSON.stringify(error, Object.getOwnPropertyNames(error))
  } catch {
    return String(error)
  }
}

/**
 * Deterministic hash from a userId string to a UID in [1, 65535].
 * Ensures the same userId always maps to the same UID on the device,
 * even when getUsers() is unavailable (e.g. K50 / protocol errors).
 */
function hashUserIdToUid(userId: string): number {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // force 32-bit signed integer
  }
  // Convert to unsigned 32-bit, then map to valid UID range [1, 65535]
  return (hash >>> 0) % 65535 + 1
}

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
  private realtimeActive = false

  constructor() {
    this.createZkInstance()
  }

  private createZkInstance() {
    // zkteco-js constructor: (ip, port, timeout, inport)
    this.zkInstance = new ZktecoJs(config.device.ip, config.device.port, 10000, 4000)
  }

  private async resetConnection() {
    this.isConnected = false
    try {
      await this.zkInstance.disconnect()
    } catch (error) {
      logger.warn('Failed to disconnect broken ZKTeco instance:', error)
    }
    this.createZkInstance()
  }

  /** Decode command ID from a response buffer returned by executeCmd */
  private getResponseCommandId(response: Buffer): number | null {
    try {
      if (Buffer.isBuffer(response) && response.length >= 2) {
        return response.readUInt16LE(0)
      }
    } catch {}
    return null
  }

  private getResponseSessionId(response: Buffer): number | null {
    try {
      if (Buffer.isBuffer(response) && response.length >= 8) {
        return response.readUInt16LE(4)
      }
    } catch {}
    return null
  }

  /** Send a command and log the raw response code for debugging */
  private async execAndLog(label: string, cmd: number, data: string | Buffer): Promise<boolean> {
    try {
      const response: any = await this.zkInstance.executeCmd(cmd, data)
      const cmdId = this.getResponseCommandId(response)
      const sessId = this.getResponseSessionId(response)
      const names: Record<number, string> = {
        2000: 'ACK_OK', 2001: 'ACK_ERROR', 2005: 'UNAUTH',
        1500: 'PREPARE_DATA', 1501: 'DATA', 1502: 'FREE_DATA',
        1000: 'CONNECT', 1102: 'AUTH', 1003: 'DISABLE_DEVICE'
      }
      const name = cmdId ? (names[cmdId] || `CMD_${cmdId}`) : 'NO_RESPONSE'
      logger.device(`${label}: response=${name} session=${sessId ?? '?'}`)
      return cmdId === 2000 // ACK_OK means success
    } catch (err: any) {
      logger.warn(`${label}: FAILED — ${err.message || err}`)
      return false
    }
  }

  async connect(): Promise<boolean> {
    try {
      // zkteco-js createSocket() handles both TCP connection AND CMD_CONNECT
      const connected = await this.zkInstance.createSocket()
      if (!connected) {
        logger.error('createSocket returned false — device may be unreachable')
        return false
      }
      logger.info('ZKTeco CONNECT successful, session established')

      // Step 1: Authenticate with device password (if configured)
      // CMD_AUTH with wrong password can break the session — skip by default
      const password = config.device.password || ''
      if (password) {
        const passwordNum = parseInt(password, 10)
        if (!Number.isNaN(passwordNum)) {
          const authBuf = Buffer.alloc(12)
          authBuf.writeUInt32LE(passwordNum, 0)
          const authOk = await this.execAndLog('AUTH', CMD_AUTH, authBuf)
          if (!authOk) {
            logger.warn(
              `AUTH returned non-ACK_OK (password=${password}) — continuing...`
            )
          }
        }
      } else {
        logger.device('AUTH: skipped (no password configured)')
      }

      // Step 2: Disable device for data access
      try {
        const disableOk = await this.execAndLog('DISABLE_DEVICE', CMD_DISABLEDEVICE, Buffer.from([0, 0, 0, 0]))
        if (!disableOk) {
          logger.warn('DISABLE_DEVICE returned non-ACK_OK (device may not require it)')
        }
      } catch (err) {
        logger.warn('DISABLE_DEVICE failed:', err)
      }

      // Step 3: Free any pending data buffers
      try {
        await this.zkInstance.freeData()
        logger.info('FREE_DATA completed')
      } catch (freeError) {
        logger.warn('FREE_DATA failed:', freeError)
      }

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
      this.realtimeActive = false
      if (this.isConnected) {
        await this.zkInstance.disconnect()
        this.isConnected = false
        logger.info('Disconnected from ZKTeco device')
      }
    } catch (error) {
      logger.error('Error disconnecting from device:', error)
    }
  }

  private async resolveDeviceUserId(raw: string | number | null | undefined): Promise<string> {
    const value = String(raw ?? '').replace(/\0/g, '').trim()
    if (!value) return ''

    if (/^\d+$/.test(value)) {
      try {
        const users = await this.getUsers()
        const match = users.find((user) => String(user.uid) === value)
        if (match) {
          logger.info(`Resolved device UID ${value} to userId ${match.userId}`)
          return match.userId
        }
        logger.warn(`Could not resolve numeric device UID ${value} to any registered userId`)
      } catch (error) {
        logger.warn(`Failed to fetch users for UID resolution, using raw value: ${value}`, error)
      }
    }

    return value
  }

  async getAttendanceLogs(): Promise<ZkAttendance[]> {
    if (!this.isConnected) {
      const connected = await this.connect()
      if (!connected) return []
    }

    try {
      const result = await this.zkInstance.getAttendances()
      // zkteco-js returns records with fields: sn, user_id, record_time (string), type, state
      return await Promise.all(
        (result?.data || []).map(async (log: any) => {
          const userSn = String(log.sn ?? '').replace(/\0/g, '').trim()
          const rawId = String(log.user_id ?? '').replace(/\0/g, '').trim() || userSn
          const resolvedId = await this.resolveDeviceUserId(rawId)
          if (resolvedId !== rawId) {
            logger.info(`Attendance log raw user_id=${rawId} resolved to ${resolvedId}`)
          }
          return {
            userSn,
            deviceUserId: resolvedId || rawId,
            recordTime: log.record_time, // already a string from zkteco-js
          }
        })
      )
    } catch (error: any) {
      logger.error('Error fetching attendance logs:', error)
      // K50 may not support polling — rely on real-time listener instead
      return []
    }
  }

  startRealtimeListener(onScan: (log: { deviceUserId: string; userSn?: string; recordTime: Date }) => void) {
    if (!this.isConnected) return

    this.realtimeActive = true
    logger.info('Listening for real-time fingerprint scans on device...')

    // zkteco-js getRealTimeLogs callback receives { userId, attTime }
    this.zkInstance.getRealTimeLogs((data: { userId?: string; attTime?: Date }) => {
      const rawUserId = String(data?.userId ?? '').replace(/\0/g, '').trim()
      const attTime = data?.attTime
      if (!rawUserId || !attTime) return

      this.resolveDeviceUserId(rawUserId).then((resolvedUserId) => {
        if (resolvedUserId !== rawUserId) {
          logger.info(`Realtime scan raw userId=${rawUserId} mapped to ${resolvedUserId}`)
        }
        onScan({
          deviceUserId: resolvedUserId || rawUserId,
          recordTime: attTime,
        })
      }).catch((error) => {
        logger.warn(`Realtime scan: UID resolution failed for ${rawUserId}, using raw value`, error)
        onScan({
          deviceUserId: rawUserId,
          recordTime: attTime,
        })
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
      // zkteco-js returns users with: uid, role, name, userId, cardno, password
      return (result?.data || []).map((user: ZkDeviceUser) => ({
        uid: user.uid,
        role: user.role,
        name: user.name,
        userId: String(user.userId || '').trim(),
        cardno: user.cardno ?? 0,
      }))
    } catch (error: any) {
      logger.error('Error fetching device users:', error)
      // K50 may not support user list — return empty array so enrollment can still work
      return []
    }
  }

  async upsertUser(params: { userId: string; name: string; uid?: number }) {
    if (!this.isConnected) {
      const connected = await this.connect()
      if (!connected) throw new Error('Device is offline')
    }

    const userId = params.userId

    // Check if user already exists on device (to avoid overwriting)
    const existingUsers = await this.getUsers()
    const existing = existingUsers.find(
      (u) => u.userId === userId || u.userId === String(Number(userId))
    )
    if (existing) {
      logger.info(`Device user ${userId} already exists (uid ${existing.uid}) — skipping create`)
      return {
        created: false,
        user: existing,
      }
    }

    // Assign a unique UID: max existing UID + 1 (first user gets uid 1)
    const maxUid = existingUsers.reduce((max, u) => Math.max(max, u.uid), 0)
    const uid = params.uid ?? (maxUid > 0 ? maxUid + 1 : hashUserIdToUid(userId))
  
    try {
      if (typeof this.zkInstance.setUser === 'function') {
        await this.zkInstance.setUser(uid, userId, params.name.slice(0, 24), '', 0, 0)
      } else {
        const record = encodeUserData72({
          uid,
          role: 0,
          password: '',
          name: params.name.slice(0, 24),
          userId,
        })
        await this.zkInstance.executeCmd(CMD_USER_WRQ, record)
      }
      logger.info(`Created device user ${userId} (uid ${uid})`)
      return {
        created: true,
        user: { uid, role: 0, name: params.name, userId, cardno: 0 },
      }
    } catch (error: any) {
      // If already exists, treat as success
      logger.warn(`Device user ${userId}: ${error?.message || error}`)
      return {
        created: false,
        user: { uid, role: 0, name: params.name, userId, cardno: 0 },
      }
    }
  }

  /** Puts device in fingerprint enrollment mode for the given user PIN. */
  async startFingerprintEnrollment(userId: string, fingerIndex = 0, uid?: number) {
    if (!this.isConnected) {
      const connected = await this.connect()
      if (!connected) throw new Error('Device is offline')
    }

    // Use the provided UID if available (from upsertUser), otherwise fall back
    // to a deterministic hash. This ensures the enrollment targets the EXACT
    // same device user record that was created by upsertUser(), rather than
    // independently calculating a different UID and creating a phantom user.
    if (uid === undefined || uid === null) {
      const targetUid = parseInt(userId, 10)
      uid = !Number.isNaN(targetUid) && targetUid > 0 ? targetUid : hashUserIdToUid(userId)
    }
    const buffer = Buffer.alloc(4)
    buffer.writeUInt32LE(uid, 0)

    // Many ZKTeco devices require TWO commands to activate the scanner:
    //   1. CMD_STARTENROLL (61)  — puts device into "enroll this user" state
    //   2. CMD_CAPTUREFINGER (1009) — triggers the physical scanner hardware
    // The old code only tried CMD_CAPTUREFINGER if CMD_STARTENROLL threw,
    // but CMD_STARTENROLL typically returns ACK without activating the scanner.
    // We now ALWAYS attempt both commands in sequence.
    const started = await this.execAndLog('START_ENROLL', CMD_STARTENROLL, buffer)

    if (started) {
      logger.info(`CMD_STARTENROLL ACK — device is in enroll state for ${userId}`)
    } else {
      logger.warn(`CMD_STARTENROLL returned non-ACK (device may not support this command)`)
    }

    // Small delay to let the device process the first command before sending
    // the hardware trigger. Some models are sensitive to command timing.
    await new Promise((resolve) => setTimeout(resolve, 800))

    // Send CMD_CAPTUREFINGER to trigger the scanner hardware.
    // Even if CMD_STARTENROLL returned non-ACK, attempt this anyway — some
    // models skip CMD_STARTENROLL entirely and respond only to this command.
    const captured = await this.execAndLog('CAPTURE_FINGER', CMD_CAPTUREFINGER, buffer)

    const mode = captured ? 'capture_finger' : 'start_enroll'
    logger.info(
      `Enrollment for user ${userId} (uid ${uid}): START=${started} CAPTURE=${captured} → mode=${mode}`
    )

    // If BOTH commands failed, the device likely doesn't support remote enrollment.
    // Throw so the API caller returns a clear error instead of silently telling
    // the user to scan when nothing will happen.
    if (!started && !captured) {
      throw new Error(
        `Device did not respond to enrollment commands (UID ${uid}). ` +
        `Try enrolling the fingerprint directly on the device's physical menu.`
      )
    }

    return { success: true, mode: mode as 'start_enroll' | 'capture_finger' }
  }
}
