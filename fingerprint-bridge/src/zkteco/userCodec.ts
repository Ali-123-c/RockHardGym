import { logger } from '../utils/logger'

/** Encode a 72-byte ZKTeco user record (inverse of decodeUserData72).
 *
 * ⚠️ WARNING: The ZKTeco protocol limits the userId field to 9 characters.
 * If `userId` is longer than 9 chars, it will be TRUNCATED on the device.
 * This means the device will report a DIFFERENT ID than what was registered,
 * causing attendance matching to fail.
 */
export function encodeUserData72(params: {
  uid: number
  role?: number
  password?: string
  name: string
  cardno?: number
  userId: string
}) {
  if (params.userId.length > 9) {
    logger.warn(
      `userId "${params.userId}" is ${params.userId.length} chars — ` +
      `ZKTeco hardware limits userId to 9 chars. It will be TRUNCATED to "${params.userId.slice(0, 9)}". ` +
      `Attendance matching will FAIL — use a shorter membership_no (max 9 chars) instead.`
    )
  }

  const buf = Buffer.alloc(72, 0)
  buf.writeUInt16LE(params.uid, 0)
  buf.writeUInt8(params.role ?? 0, 2)
  Buffer.from((params.password ?? '').slice(0, 8), 'ascii').copy(buf, 3)
  Buffer.from(params.name.slice(0, 24), 'ascii').copy(buf, 11)
  buf.writeUInt32LE(params.cardno ?? 0, 35)
  Buffer.from(params.userId.slice(0, 9), 'ascii').copy(buf, 48)
  return buf
}
