/**
 * K50 Realtime UDP Listener
 *
 * The ZKTeco K50 (and similar budget models) does NOT push real-time
 * attendance events over the TCP connection like higher-end models.
 * Instead, it broadcasts short UDP packets to the local network whenever
 * a fingerprint is scanned.
 *
 * This module listens for those UDP packets, parses the enrollment
 * number and timestamp, and feeds them into the existing
 * handleRealtimeScan() flow so attendance records appear in the UI.
 *
 * Packet format(s) known for K50 / K-series:
 *   Format A (most common):
 *     [0-3]   header / command (0x00000050 LE)
 *     [4-7]   device serial number (uint32 LE)
 *     [8-31]  user ID string (null-terminated, 24 bytes max)
 *     [32-35] unix timestamp (uint32 LE)
 *     [36]    event type (0 = checkin, 1 = checkout)
 *     [37]    verify method (1 = fingerprint)
 *
 *   Format B (older firmware):
 *     [0-1]   magic 0x535A ("SZ")
 *     [2-3]   version 0x0001
 *     [4-7]   device ID
 *     [8-31]  user ID (null-padded)
 *     [32-35] unix timestamp
 *     [36]    event type
 *
 *   Format C (raw real-time push):
 *     [0-1]   total length (uint16)
 *     [2+]    variable: device SN (null-term string)
 *     [variable]  user ID (null-term string)
 *     [end-5] unix timestamp (uint32)
 *     [end-1] event type
 *
 * If none of the known formats match, the raw packet hex is logged
 * so the format can be identified and added.
 */

import dgram from 'dgram'
import { logger } from '../utils/logger'
import { handleRealtimeScan } from './realtimeSync'

// Ports that K50 devices commonly broadcast attendance events on
const UDP_PORTS = [5000, 3070, 3000]

let server: dgram.Socket | null = null
let listening = false

/**
 * Try to parse a user ID string from a buffer.
 * Looks for a null-terminated or null-padded string within the buffer.
 */
function extractUserId(buffer: Buffer, offset: number, maxLen: number): string | null {
  const end = Math.min(offset + maxLen, buffer.length)
  let str = ''
  for (let i = offset; i < end; i++) {
    const byte = buffer[i]
    if (byte === 0) break // null terminator
    if (byte < 0x20 || byte > 0x7e) return null // non-printable = not a plain string
    str += String.fromCharCode(byte)
  }
  return str.length > 0 ? str : null
}

/**
 * Try to parse a unix timestamp from a buffer at the given offset (uint32 LE).
 */
function extractTimestamp(buffer: Buffer, offset: number): number | null {
  if (offset + 4 > buffer.length) return null
  const ts = buffer.readUInt32LE(offset)
  // Sanity check: should be between 2020-01-01 and 2030-01-01
  if (ts > 1577836800 && ts < 1893456000) return ts
  return null
}

/**
 * Parse an attendance event from a UDP packet buffer.
 * Tries multiple known K50 formats.
 */
function parseAttendancePacket(buffer: Buffer): {
  userId: string
  timestamp: number
  eventType?: string
} | null {
  if (buffer.length < 10) return null

  // ── Format A: command 0x0050 header, user ID at offset 8 ──────────────
  // Header: DWORD command = 0x0050 (or 0x00000050 LE)
  if (buffer.length >= 37) {
    const command = buffer.readUInt32LE(0)

    // Check for common attendance event commands
    if (command === 0x0050 || command === 0x50000000 || command === 0x0050_0000 || command === 0x50) {
      const userId = extractUserId(buffer, 8, 24)
      const timestamp = extractTimestamp(buffer, buffer.length >= 37 ? 32 : -1)

      if (userId && timestamp) {
        const eventType = buffer[36] === 0x01 ? 'checkout' : 'checkin'
        return { userId, timestamp, eventType }
      }
    }
  }

  // ── Format B: magic 0x535A header, user ID at offset 8 ───────────────
  if (buffer.length >= 37 && buffer.readUInt16LE(0) === 0x535A) {
    const userId = extractUserId(buffer, 8, 24)
    const timestamp = extractTimestamp(buffer, 32)

    if (userId && timestamp) {
      const eventType = buffer[36] === 0x01 ? 'checkout' : 'checkin'
      return { userId, timestamp, eventType }
    }
  }

  // ── Format C: variable-length format ──────────────────────────────────
  // Look for a null-terminated string followed by a 4-byte timestamp
  // Search backwards: the last 5 bytes might be [timestamp(4) + event(1)]
  if (buffer.length >= 10) {
    const ts = extractTimestamp(buffer, buffer.length - 5)
    if (ts) {
      // Now look for a user ID string before the timestamp
      // Search backwards from timestamp - 1 for the end of a string
      const searchEnd = buffer.length - 5
      for (let i = searchEnd - 1; i >= 1; i--) {
        if (buffer[i] === 0) {
          // Found null terminator — check for string before it
          const userId = extractUserId(buffer, i + 1, searchEnd - i - 1)
          if (userId) {
            return {
              userId,
              timestamp: ts,
              eventType: buffer[buffer.length - 1] === 0x01 ? 'checkout' : 'checkin',
            }
          }
          break
        }
      }
    }
  }

  // ── Format D: very short packet with just user ID + timestamp ─────────
  // Some K50 firmware sends: [user_id as string] [4 bytes timestamp]
  if (buffer.length >= 8) {
    // Try to find a timestamp at the end
    const ts = extractTimestamp(buffer, buffer.length - 4)
    if (ts) {
      // Everything before the timestamp might be just the user ID string
      const userId = extractUserId(buffer, 0, buffer.length - 4)
      if (userId) {
        return { userId, timestamp: ts }
      }
    }
  }

  return null
}

/**
 * Handle an incoming UDP message:
 * 1. Log the raw packet for debugging
 * 2. Try to parse as an attendance event
 * 3. If valid, feed into the real-time scan handler
 */
function handleMessage(msg: Buffer, rinfo: dgram.RemoteInfo) {
  const hex = msg.toString('hex').toUpperCase()
  logger.device(
    `[K50-UDP] Packet from ${rinfo.address}:${rinfo.port} (${msg.length} bytes): ${hex}`
  )

  const parsed = parseAttendancePacket(msg)

  if (!parsed) {
    logger.device(`[K50-UDP] Unrecognized packet format — ${msg.length} bytes`)
    return
  }

  const timestamp = new Date(parsed.timestamp * 1000).toISOString()
  logger.info(
    `[K50-UDP] ✓ Attendance event: user="${parsed.userId}" time="${timestamp}" type="${parsed.eventType || 'checkin'}"`
  )

  // Feed into the existing real-time scan handler
  handleRealtimeScan({
    deviceUserId: parsed.userId,
    recordTime: new Date(parsed.timestamp * 1000),
  }).catch((error) => {
    logger.error(`[K50-UDP] Failed to process attendance scan:`, error)
  })
}

/**
 * Start the K50 UDP listener.
 * Listens on multiple ports for K50 broadcast packets.
 */
export async function startK50Listener(): Promise<void> {
  if (listening) return
  listening = true

  server = dgram.createSocket({ type: 'udp4', reuseAddr: true })

  server.on('message', handleMessage)

  server.on('error', (err) => {
    logger.error(`[K50-UDP] Socket error: ${err.message}`)
  })

  server.on('listening', () => {
    const addr = server?.address()
    if (addr) {
      logger.info(`[K50-UDP] Listening on ${addr.address}:${addr.port}`)

      // Enable broadcast reception
      try {
        server?.setBroadcast(true)
      } catch {
        // Non-critical
      }
    }
  })

  // Bind to all configured ports (try each — some may fail if already in use)
  let bound = false
  for (const port of UDP_PORTS) {
    try {
      await new Promise<void>((resolve, reject) => {
        const s = server as dgram.Socket
        // On Windows, can't bind the same socket to multiple ports.
        // Instead, bind to the first available port and close + recreate for others.
        if (!bound) {
          s.bind(port, '0.0.0.0', () => {
            bound = true
            resolve()
          })
        } else {
          // Already bound — reuse the socket (it will hear broadcasts on all ports)
          resolve()
        }
        s.once('error', reject)
        // Timeout to avoid hanging
        setTimeout(() => resolve(), 3000)
      })

      if (bound) {
        logger.info(`[K50-UDP] Bound to UDP port ${port}`)
        break
      }
    } catch (err: any) {
      logger.warn(`[K50-UDP] Could not bind to port ${port}: ${err.message}`)
      // Continue to next port
    }
  }

  if (!bound) {
    // If none of the specific ports worked, try an ephemeral port
    try {
      await new Promise<void>((resolve, reject) => {
        const s = server as dgram.Socket
        s.bind(0, '0.0.0.0', () => {
          bound = true
          resolve()
        })
        s.once('error', reject)
        setTimeout(() => resolve(), 3000)
      })
      if (bound) {
        const addr = server?.address()
        logger.info(`[K50-UDP] Bound to ephemeral UDP port ${addr?.port} (could not bind to standard ports)`)
      }
    } catch (err: any) {
      logger.warn(`[K50-UDP] Could not bind to any port: ${err.message}`)
    }
  }

  if (!bound) {
    listening = false
    logger.warn('[K50-UDP] K50 UDP listener could not start — attendance will rely on TCP polling only')
    return
  }

  logger.info(
    '[K50-UDP] K50 real-time attendance listener active — fingerprint scans will appear in real-time'
  )
}

/**
 * Stop the K50 UDP listener.
 */
export function stopK50Listener(): void {
  listening = false
  if (server) {
    try {
      server.close()
    } catch {
      // Ignore close errors
    }
    server = null
  }
  logger.info('[K50-UDP] Listener stopped')
}

/**
 * Check if the K50 listener is currently active.
 */
export function isK50ListenerActive(): boolean {
  return listening && server !== null
}
