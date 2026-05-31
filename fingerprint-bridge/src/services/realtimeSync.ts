import { logger } from '../utils/logger'
import { markLogsSyncedByKey, saveLogsLocally } from '../storage/localStore'
import { pushLogsToApi } from './syncService'

let listenerStarted = false

export function extractEnrollNumber(log: {
  deviceUserId?: string | number
  userSn?: string | number
  recordTime?: string | Date
}) {
  const fromPin = String(log.deviceUserId ?? '').replace(/\0/g, '').trim()
  if (fromPin) return fromPin
  const fromSn = String(log.userSn ?? '').trim()
  return fromSn
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

  saveLogsLocally([entry])
  logger.device(`Realtime scan: user ${enrollNumber} at ${timestamp}`)

  try {
    await pushLogsToApi([entry])
    markLogsSyncedByKey(enrollNumber, timestamp)
  } catch (error) {
    logger.error(`Failed to push realtime scan for ${enrollNumber}`, error)
    throw error
  }
}

export function markRealtimeListenerStarted() {
  listenerStarted = true
}

export function isRealtimeListenerStarted() {
  return listenerStarted
}
