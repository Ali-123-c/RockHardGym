import fs from 'fs'
import path from 'path'
import { logger } from '../utils/logger'

export interface LocalAttendanceLog {
  id?: number
  enrollNumber: string
  timestamp: string
  event_type: 'checkin' | 'checkout'
  synced: number // 0 for false, 1 for true
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
      currentLogs.push({ ...log, id: Date.now() + Math.floor(Math.random() * 1000) })
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

export function markLogsAsSynced(ids: number[]) {
  if (ids.length === 0) return

  const currentLogs = readLogs()
  let marked = 0
  
  for (const log of currentLogs) {
    if (log.id && ids.includes(log.id)) {
      log.synced = 1
      marked++
    }
  }
  
  writeLogs(currentLogs)
  logger.info(`Marked ${marked} logs as synced in local JSON DB.`)
}
