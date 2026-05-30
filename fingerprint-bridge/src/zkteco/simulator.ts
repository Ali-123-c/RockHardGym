import { logger } from '../utils/logger'

export interface SimulatedAttendance {
  deviceUserId: string // enrollNumber
  recordTime: string // timestamp
}

export class SimulatorDevice {
  private isOnline = true
  
  // Example active gym members (random enrollNumbers)
  private sampleMembers = ['EMP001', 'M001', 'M002', 'M003', 'M004']

  async connect(): Promise<boolean> {
    // Simulate random network failures (10% chance)
    if (Math.random() < 0.1) {
      this.isOnline = false
      logger.warn('[SIMULATOR] Connection failed (simulated)')
      return false
    }
    
    this.isOnline = true
    logger.info('[SIMULATOR] Connected to Virtual ZKTeco device')
    return true
  }

  async disconnect(): Promise<void> {
    this.isOnline = false
    logger.info('[SIMULATOR] Disconnected from Virtual ZKTeco device')
  }

  async getAttendanceLogs(): Promise<SimulatedAttendance[]> {
    if (!this.isOnline) {
      const connected = await this.connect()
      if (!connected) return []
    }

    // Generate random logs
    const logs: SimulatedAttendance[] = []
    
    // Simulate 1 to 5 random check-ins every sync
    const numLogs = Math.floor(Math.random() * 5) + 1
    const now = new Date()

    for (let i = 0; i < numLogs; i++) {
      const member = this.sampleMembers[Math.floor(Math.random() * this.sampleMembers.length)]
      // Random time in the last 5 minutes
      const logTime = new Date(now.getTime() - Math.floor(Math.random() * 5 * 60000))
      
      logs.push({
        deviceUserId: member,
        recordTime: logTime.toISOString()
      })
    }

    logger.info(`[SIMULATOR] Generated ${logs.length} attendance logs`)
    return logs
  }

  async clearAttendanceLogs(): Promise<boolean> {
    if (!this.isOnline) return false
    logger.info('[SIMULATOR] Cleared simulated attendance logs')
    return true
  }
}
