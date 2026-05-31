import axios from 'axios'
import { config } from '../config'
import { logger } from '../utils/logger'
import { connectionManager } from './connectionManager'
import {
  getUnsyncedLogs,
  markLogsAsFailed,
  markLogsAsSynced,
  saveLogsLocally
} from '../storage/localStore'

const apiClient = axios.create({
  baseURL: config.api.baseUrl,
  headers: {
    'x-api-key': config.api.key,
    'Content-Type': 'application/json'
  },
  timeout: 10000
})

let syncInProgress = false

function formatLogFromDevice(log: { deviceUserId?: string | number; userSn?: string | number; recordTime: string | Date }) {
  const enrollNumber = String(log.deviceUserId ?? '').trim() || String(log.userSn ?? '').trim()
  return {
    enrollNumber,
    timestamp: new Date(log.recordTime).toISOString(),
    event_type: 'checkin' as const,
    synced: 0,
  }
}

export async function pushLogsToApi(
  logs: Array<{ enrollNumber: string; timestamp: string; event_type: 'checkin' | 'checkout' }>
) {
  if (logs.length === 0) return { success: true, synced: 0 }

  const payload = {
    device_id: config.device.id,
    logs: logs.map((l) => ({
      enrollNumber: l.enrollNumber,
      timestamp: l.timestamp,
      event_type: l.event_type,
    })),
  }

  const response = await apiClient.post('/api/fingerprint/sync', payload)
  if (!response.data.success) {
    throw new Error(response.data.error || 'Unknown API Error')
  }

  return response.data as { success: boolean; synced: number; attendance_marked?: number; unmatched?: string[] }
}

export interface SyncResult {
  success: boolean
  fetched: number
  attempted: number
  synced: number
  pending: number
  error?: string
}

export async function runSyncJob() {
  if (syncInProgress) {
    logger.warn('Sync skipped because another sync is already running.')
    return {
      success: false,
      fetched: 0,
      attempted: 0,
      synced: 0,
      pending: getUnsyncedLogs().length,
      error: 'Sync already in progress'
    }
  }

  syncInProgress = true
  logger.info(`Starting sync job (Mode: ${config.mode})...`)
  const startTime = Date.now()

  try {
    // 1. Fetch from Device
    const rawLogs = await connectionManager.getAttendanceLogs()
    
    // Map to Local format
    const formattedLogs = rawLogs
      .map((log) => formatLogFromDevice(log))
      .filter((log) => log.enrollNumber)

    // 2. Save locally (handles duplicates gracefully via UNIQUE constraint)
    if (formattedLogs.length > 0) {
      saveLogsLocally(formattedLogs)
    }

    // 3. Retrieve all unsynced from local DB (including previous offline failures)
    const unsyncedLogs = getUnsyncedLogs()
    
    if (unsyncedLogs.length === 0) {
      logger.info('No new logs to sync.')
      await reportStatus('Online', Date.now() - startTime)
      return {
        success: true,
        fetched: formattedLogs.length,
        attempted: 0,
        synced: 0,
        pending: 0
      }
    }

    // 4. Send to Gym API
    logger.info(`Sending ${unsyncedLogs.length} logs to Gym API...`)
    
    const apiLogs = unsyncedLogs.map((l) => ({
      enrollNumber: l.enrollNumber,
      timestamp: l.timestamp,
      event_type: l.event_type,
    }))

    const response = await pushLogsToApi(apiLogs)

    const syncedIds = unsyncedLogs.map((l) => l.id as number)
    markLogsAsSynced(syncedIds)
    logger.info(
      `Synced to app: ${response.synced} logs, ${response.attendance_marked ?? 0} attendance rows marked.`
    )

    await reportStatus('Online', Date.now() - startTime)
    return {
      success: true,
      fetched: formattedLogs.length,
      attempted: unsyncedLogs.length,
      synced: response.synced || 0,
      pending: getUnsyncedLogs().length,
    }

  } catch (error: any) {
    const message = error.message || String(error)
    const failedIds = getUnsyncedLogs().map(log => log.id as number).filter(Boolean)

    logger.error('Sync Job Failed:', message)
    markLogsAsFailed(failedIds, message)
    // Try to report error status to main app if possible
    await reportStatus('Error', Date.now() - startTime).catch(() => {})
    return {
      success: false,
      fetched: 0,
      attempted: failedIds.length,
      synced: 0,
      pending: getUnsyncedLogs().length,
      error: message
    }
  } finally {
    syncInProgress = false
  }
}

async function reportStatus(status: 'Online' | 'Offline' | 'Error', responseTime: number) {
  try {
    await apiClient.post('/api/fingerprint/status', {
      device_id: config.device.id,
      status,
      response_time: responseTime
    })
  } catch (error) {
    logger.warn('Could not report status to main API (API offline?)')
  }
}
