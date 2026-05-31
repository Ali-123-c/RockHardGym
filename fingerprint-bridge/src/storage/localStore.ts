import fs from 'fs'
import path from 'path'
import { logger } from '../utils/logger'

export interface LocalAttendanceLog {
  id?: number
  enrollNumber: string
  timestamp: string
  event_type: 'checkin' | 'checkout'
  synced: number // 0 for false, 1 for true
  attempts?: number
  last_error?: string
  created_at?: string
  updated_at?: string
}

const dbPath = path.resolve(process.cwd(), 'local-sync.json')

export function initDB() {
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify([]))
  }
  logger.info('Local JSON cache initialized.')
}

function readLogs(): LocalAttendanceLog[] {
  try {
    const data = fs.readFileSync(dbPath, 'utf8')
    return JSON.parse(data)
  } catch {
    return []
  }
}

function writeLogs(logs: LocalAttendanceLog[]) {
  fs.writeFileSync(dbPath, JSON.stringify(logs, null, 2))
}

export function saveLogsLocally(logs: LocalAttendanceLog[]) {
  const currentLogs = readLogs()
  let newRecords = 0
  
  for (const log of logs) {
    // Check for duplicates
    const isDuplicate = currentLogs.some(
      l => l.enrollNumber === log.enrollNumber && l.timestamp === log.timestamp
    )
    if (!isDuplicate) {
      currentLogs.push({
        ...log,
        id: Date.now() + Math.floor(Math.random() * 1000),
        attempts: log.attempts || 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      newRecords++
    }
  }

  if (newRecords > 0) {
    writeLogs(currentLogs)
    logger.info(`Saved ${newRecords} new logs locally.`)
  }
}

export function getUnsyncedLogs(): LocalAttendanceLog[] {
  const currentLogs = readLogs()
  return currentLogs.filter(l => l.synced === 0).slice(0, 500)
}

export function getLocalSyncStats() {
  const currentLogs = readLogs()
  const pending = currentLogs.filter(l => l.synced === 0)
  const synced = currentLogs.filter(l => l.synced === 1)

  return {
    total: currentLogs.length,
    pending: pending.length,
    synced: synced.length,
    failed: pending.filter(l => (l.attempts || 0) > 0).length
  }
}

export function markLogsAsSynced(ids: number[]) {
  if (ids.length === 0) return

  const currentLogs = readLogs()
  let marked = 0
  
  for (const log of currentLogs) {
    if (log.id && ids.includes(log.id)) {
      log.synced = 1
      log.updated_at = new Date().toISOString()
      marked++
    }
  }
  
  writeLogs(currentLogs)
  logger.info(`Marked ${marked} logs as synced in local JSON DB.`)
}

export function markLogsSyncedByKey(enrollNumber: string, timestamp: string) {
  const currentLogs = readLogs()
  let marked = 0

  for (const log of currentLogs) {
    if (
      log.enrollNumber.toLowerCase() === enrollNumber.toLowerCase() &&
      log.timestamp === timestamp &&
      log.synced === 0
    ) {
      log.synced = 1
      log.last_error = undefined
      log.updated_at = new Date().toISOString()
      marked++
    }
  }

  if (marked > 0) writeLogs(currentLogs)
}

/** Re-queue logs that synced but never matched a member. */
export function requeueLogsByEnrollNumbers(enrollNumbers: string[]) {
  const targets = new Set(enrollNumbers.map((e) => e.trim().toLowerCase()))
  if (targets.size === 0) return

  const currentLogs = readLogs()
  let requeued = 0

  for (const log of currentLogs) {
    const key = log.enrollNumber.trim().toLowerCase()
    if (targets.has(key)) {
      log.synced = 0
      log.last_error = 'No matching membership_no in GymFlow'
      log.updated_at = new Date().toISOString()
      requeued++
    }
  }

  if (requeued > 0) {
    writeLogs(currentLogs)
    logger.warn(`Re-queued ${requeued} log(s) — fix membership_no to match device user ID.`)
  }
}

/** On startup: retry logs that failed with timeout/errors. */
export function requeueFailedSyncLogs() {
  const currentLogs = readLogs()
  let requeued = 0

  for (const log of currentLogs) {
    if (log.synced === 1 && log.last_error) {
      log.synced = 0
      requeued++
    }
  }

  if (requeued > 0) {
    writeLogs(currentLogs)
    logger.info(`Re-queued ${requeued} previously failed log(s) for sync retry.`)
  }
}

/** Re-queue recent logs so attendance can be retried after membership_no fixes. */
export function requeueRecentLogs(maxAgeHours = 48) {
  const cutoff = Date.now() - maxAgeHours * 60 * 60 * 1000
  const currentLogs = readLogs()
  let requeued = 0

  for (const log of currentLogs) {
    const ts = new Date(log.timestamp).getTime()
    if (!Number.isNaN(ts) && ts >= cutoff) {
      log.synced = 0
      requeued++
    }
  }

  if (requeued > 0) {
    writeLogs(currentLogs)
    logger.info(`Re-queued ${requeued} recent log(s) for attendance retry.`)
  }
}

export function markLogsAsFailed(ids: number[], errorMessage: string) {
  if (ids.length === 0) return

  const currentLogs = readLogs()
  let marked = 0

  for (const log of currentLogs) {
    if (log.id && ids.includes(log.id)) {
      log.attempts = (log.attempts || 0) + 1
      log.last_error = errorMessage
      log.updated_at = new Date().toISOString()
      marked++
    }
  }

  writeLogs(currentLogs)
  logger.warn(`Marked ${marked} logs as failed for retry.`)
}
