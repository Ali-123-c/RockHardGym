import { logger } from '../utils/logger'
import { isValidDeviceLog, sanitizeEnrollNumber } from '../utils/attendanceLog'
import { markLogsSyncedByKey, saveLogsLocally } from '../storage/localStore'
import { pushLogsToApi } from './syncService'

export function extractEnrollNumber(log: {
  deviceUserId?: string | number
  userSn?: string | number
  recordTime?: string | Date
}) {
  return (
    sanitizeEnrollNumber(log.deviceUserId) || sanitizeEnrollNumber(log.userSn)
  )
}

export async function handleRealtimeScan(log: {
  deviceUserId?: string | number
  userSn?: string | number
  recordTime: string | Date
}) {
  const enrollNumber = extractEnrollNumber(log)
  if (!enrollNumber) {
    logger.warn('Realtime scan ignored: missing user id on log payload')
    return
  }

  const timestamp = new Date(log.recordTime).toISOString()
  const entry = {
    enrollNumber,
    timestamp,
    event_type: 'checkin' as const,
    synced: 0,
  }

  if (!isValidDeviceLog(entry)) {
    logger.warn(`Realtime scan ignored invalid log: user=${enrollNumber} time=${timestamp}`)
    return
  }

  saveLogsLocally([entry])
  logger.device(`Realtime scan: user ${enrollNumber} at ${timestamp}`)

  try {
    const result = await pushLogsToApi([entry])
    const unmatched = result.unmatched?.some(
      (u) => u.toLowerCase() === enrollNumber.toLowerCase()
    )
    if (unmatched) {
      logger.error(
        `Member NOT found in GymFlow for device ID "${enrollNumber}". ` +
          `Create/edit member with membership_no = "${enrollNumber}"`
      )
      return
    }
    if ((result.attendance_marked ?? 0) === 0 && (result.synced ?? 0) === 0) {
      logger.warn(`Scan received for ${enrollNumber} but attendance was not created (may already exist today).`)
    } else {
      logger.info(`✓ Attendance marked for ${enrollNumber}`)
    }
    markLogsSyncedByKey(enrollNumber, timestamp)
  } catch (error) {
    logger.error(`Failed to push realtime scan for ${enrollNumber}`, error)
    throw error
  }
}

