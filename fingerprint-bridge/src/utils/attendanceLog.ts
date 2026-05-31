/** Validate attendance pulled from ZKTeco before syncing. */

export function sanitizeEnrollNumber(value: string | number | null | undefined): string {
  return String(value ?? '')
    .replace(/\0/g, '')
    .trim()
}

export function isValidEnrollNumber(value: string): boolean {
  const id = sanitizeEnrollNumber(value)
  if (!id || id.length > 24) return false
  if (/[\x00-\x1f]/.test(id)) return false
  return /^[a-zA-Z0-9._-]+$/.test(id)
}

export function isValidScanTime(iso: string): boolean {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return false
  const year = date.getFullYear()
  const now = new Date()
  return year >= 2024 && date.getTime() <= now.getTime() + 24 * 60 * 60 * 1000
}

export function formatLogFromDevice(log: {
  deviceUserId?: string | number
  userSn?: string | number
  recordTime: string | Date
}) {
  const enrollNumber =
    sanitizeEnrollNumber(log.deviceUserId) || sanitizeEnrollNumber(log.userSn)
  const timestamp = new Date(log.recordTime).toISOString()

  return {
    enrollNumber,
    timestamp,
    event_type: 'checkin' as const,
    synced: 0,
  }
}

export function isValidDeviceLog(log: { enrollNumber: string; timestamp: string }) {
  return isValidEnrollNumber(log.enrollNumber) && isValidScanTime(log.timestamp)
}
