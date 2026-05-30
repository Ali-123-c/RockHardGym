// @ts-ignore
import ZKLib from 'node-zklib'
import { config } from '../config'
import { logger } from '../utils/logger'

export interface ZkAttendance {
  userSn: string
  deviceUserId: string // enrollNumber
  recordTime: string // timestamp
}

export class ZKDevice {
  private zkInstance: any
  private isConnected = false

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
      return logs.data || []
    } catch (error) {
      logger.error('Error fetching attendance logs:', error)
      return []
    }
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
}
