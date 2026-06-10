import axios from 'axios'
import { config } from '../config'
import { logger } from '../utils/logger'
import { formatLogFromDevice, isValidDeviceLog } from '../utils/attendanceLog'
import { connectionManager } from './connectionManager'
import {
  getUnsyncedLogs,
  markLogsAsFailed,
  markLogsAsSynced,
  requeueLogsByEnrollNumbers,
  saveLogsLocally,
} from '../storage/localStore'

export interface SyncApiResponse {
  success: boolean
  synced: number
  attendance_marked?: number
  unmatched?: string[]
  errors?: string[]
}

const apiClient = axios.create({
  baseURL: config.api.baseUrl,
  headers: {
    'x-api-key': config.api.key,
    'Content-Type': 'application/json',
  },
  timeout: 30000,
})

let syncInProgress = false

function enrollKeys(value: string): string[] {
  const raw = value.trim().toLowerCase()
  const keys = new Set<string>([raw])
  if (/^\d+$/.test(raw)) keys.add(String(parseInt(raw, 10)))
  return [...keys]
}

function isEnrollUnmatched(unmatched: string[] | undefined, enrollNumber: string): boolean {
  if (!unmatched?.length) return false
  const keys = new Set(enrollKeys(enrollNumber))
  return unmatched.some((u) => keys.has(u.trim().toLowerCase()) || keys.has(String(parseInt(u, 10))))
}

export async function pushLogsToApi(
  logs: Array<{ enrollNumber: string; timestamp: string; event_type: 'checkin' | 'checkout' }>
): Promise<SyncApiResponse> {
  const validLogs = logs.filter(isValidDeviceLog)
  if (validLogs.length === 0) {
    return { success: true, synced: 0, attendance_marked: 0 }
  }

  const payload = {
    device_id: config.device.id,
    logs: validLogs.map((l) => ({
      enrollNumber: l.enrollNumber,
      timestamp: l.timestamp,
      event_type: l.event_type,
    })),
  }

  logger.info(`Pushing ${validLogs.length} log(s) to ${config.api.baseUrl}/api/fingerprint/sync`)

  const response = await apiClient.post('/api/fingerprint/sync', payload)
  if (!response.data.success) {
    throw new Error(response.data.error || 'Unknown API Error')
  }

  const data = response.data as SyncApiResponse

  if (data.unmatched?.length) {
    logger.warn(
      `No GymFlow member for device ID(s): ${data.unmatched.join(', ')} — membership_no must match exactly.`
    )
  }

  if ((data.attendance_marked ?? 0) > 0) {
    logger.info(`Attendance marked for ${data.attendance_marked} member(s).`)
  }

  return data
}

export interface SyncResult {
  success: boolean
  fetched: number
  attempted: number
  synced: number
  pending: number
  attendance_marked?: number
  unmatched?: string[]
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
      error: 'Sync already in progress',
    }
  }

  syncInProgress = true
  logger.info(`Starting sync job (Mode: ${config.mode}) → ${config.api.baseUrl}`)
  const startTime = Date.now()

  try {
    // In K50 mode, skip TCP polling — the device doesn't respond to
    // getAttendances (times out). Attendance is captured via UDP listener.
    const k50active = config.k50.enabled
    let fetchedCount = 0

    if (k50active) {
      logger.info('K50 mode: skipping TCP polling (using UDP listener for real-time scans)')
    } else {
      // Standard mode: poll the device for attendance logs
      const rawLogs = await connectionManager.getAttendanceLogs()
      const formattedLogs = rawLogs
        .map((log) => formatLogFromDevice(log))
        .filter(isValidDeviceLog)
      fetchedCount = formattedLogs.length
      if (formattedLogs.length > 0) {
        saveLogsLocally(formattedLogs)
      }
    }

    const unsyncedLogs = getUnsyncedLogs()

    if (unsyncedLogs.length === 0) {
      logger.info('No new logs to sync.')
      await reportStatus('Online', Date.now() - startTime)
      return {
        success: true,
        fetched: fetchedCount,
        attempted: 0,
        synced: 0,
        pending: 0,
      }
    }

    logger.info(`Sending ${unsyncedLogs.length} unsynced log(s) to Gym API...`)

    const response = await pushLogsToApi(unsyncedLogs)

    const syncedIds: number[] = []
    const unmatchedEnrolls = new Set((response.unmatched || []).map((u) => u.toLowerCase()))

    for (const log of unsyncedLogs) {
      if (!log.id) continue
      if (isEnrollUnmatched(response.unmatched, log.enrollNumber)) {
        continue
      }
      syncedIds.push(log.id)
    }

    markLogsAsSynced(syncedIds)

    if (unmatchedEnrolls.size > 0) {
      requeueLogsByEnrollNumbers([...unmatchedEnrolls])
    }

    await reportStatus('Online', Date.now() - startTime)
    return {
      success: true,
      fetched: fetchedCount,
      attempted: unsyncedLogs.length,
      synced: response.synced || syncedIds.length,
      attendance_marked: response.attendance_marked,
      unmatched: response.unmatched,
      pending: getUnsyncedLogs().length,
    }
  } catch (error: any) {
    // Safely extract error message — the API may return error as string OR
    // as an object { code, message, id } from different error sources (Supabase, Axios, etc.)
    const raw = error.response?.data?.error || error.message || error
    const message = typeof raw === 'string' ? raw : JSON.stringify(raw)
    const failedIds = getUnsyncedLogs().map((log) => log.id as number).filter(Boolean)

    logger.error('Sync Job Failed:', message)
    if (message.includes('timeout')) {
      logger.error('Is the GymFlow app running? Check API_BASE_URL in fingerprint-bridge/.env')
    }
    markLogsAsFailed(failedIds, message)
    await reportStatus('Error', Date.now() - startTime).catch(() => {})
    return {
      success: false,
      fetched: 0,
      attempted: failedIds.length,
      synced: 0,
      pending: getUnsyncedLogs().length,
      error: message,
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
      response_time: responseTime,
    })
  } catch {
    logger.warn('Could not report status to main API (API offline?)')
  }
}
