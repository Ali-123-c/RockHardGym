import Database from 'better-sqlite3'
import path from 'path'
import { logger } from '../utils/logger'

// Define the interface for an attendance log
export interface LocalAttendanceLog {
  id?: number
  enrollNumber: string
  timestamp: string
  event_type: 'checkin' | 'checkout'
  synced: number // 0 for false, 1 for true
}

const dbPath = path.resolve(process.cwd(), 'local-sync.db')
const db = new Database(dbPath)

// Initialize database
export function initDB() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS local_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      enrollNumber TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      event_type TEXT NOT NULL,
      synced INTEGER DEFAULT 0,
      UNIQUE(enrollNumber, timestamp)
    )
  `)
  logger.info('Local SQLite database initialized.')
}

export function saveLogsLocally(logs: LocalAttendanceLog[]) {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO local_logs (enrollNumber, timestamp, event_type, synced)
    VALUES (@enrollNumber, @timestamp, @event_type, 0)
  `)

  const insertMany = db.transaction((logsToInsert: LocalAttendanceLog[]) => {
    let count = 0
    for (const log of logsToInsert) {
      const result = insert.run(log)
      if (result.changes > 0) count++
    }
    return count
  })

  const newRecords = insertMany(logs)
  if (newRecords > 0) {
    logger.info(`Saved ${newRecords} new logs locally.`)
  }
}

export function getUnsyncedLogs(): LocalAttendanceLog[] {
  const stmt = db.prepare('SELECT id, enrollNumber, timestamp, event_type FROM local_logs WHERE synced = 0 LIMIT 500')
  return stmt.all() as LocalAttendanceLog[]
}

export function markLogsAsSynced(ids: number[]) {
  if (ids.length === 0) return

  const placeholders = ids.map(() => '?').join(',')
  const stmt = db.prepare(`UPDATE local_logs SET synced = 1 WHERE id IN (${placeholders})`)
  const result = stmt.run(...ids)
  
  logger.info(`Marked ${result.changes} logs as synced in local DB.`)
}
