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
    const formattedLogs = rawLogs.map(log => ({
      enrollNumber: log.deviceUserId,
      timestamp: new Date(log.recordTime).toISOString(),
      // ZKTeco usually only gives checkin unless configured otherwise, we'll default to checkin
      event_type: 'checkin' as const,
      synced: 0
    }))

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
    
    const payload = {
      device_id: config.device.id,
      logs: unsyncedLogs.map(l => ({
        enrollNumber: l.enrollNumber,
        timestamp: l.timestamp,
        event_type: l.event_type
      }))
    }

    const response = await apiClient.post('/api/fingerprint/sync', payload)
    
    if (response.data.success) {
      // 5. Mark as synced locally
      const syncedIds = unsyncedLogs.map(l => l.id as number)
      markLogsAsSynced(syncedIds)
      logger.info(`Successfully synced ${response.data.synced} records to Main App.`)

      await reportStatus('Online', Date.now() - startTime)
      return {
        success: true,
        fetched: formattedLogs.length,
        attempted: unsyncedLogs.length,
        synced: response.data.synced || unsyncedLogs.length,
        pending: getUnsyncedLogs().length
      }
    } else {
      throw new Error(response.data.error || 'Unknown API Error')
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
