import http, { IncomingMessage, ServerResponse } from 'http'
import { config, reloadConfig } from '../config'
import { getLocalSyncStats } from '../storage/localStore'
import { logger } from '../utils/logger'
import { connectionManager } from './connectionManager'
import { runSyncJob } from './syncService'

// ── Shared secret for authenticating GymFlow → bridge requests ───────────
// Uses config.service.authKey which is populated from BRIDGE_API_KEY env var.
// The bridge will NOT start if BRIDGE_API_KEY is missing (see index.ts).
const BRIDGE_AUTH_HEADER = 'x-bridge-api-key'

function isAuthorized(request: IncomingMessage): boolean {
  const expectedKey = config.service.authKey
  if (!expectedKey) {
    logger.warn('BRIDGE_API_KEY is not set — all requests will be DENIED')
    return false
  }
  const provided = request.headers[BRIDGE_AUTH_HEADER]?.toString().trim() ||
    request.headers['authorization']?.toString().replace('Bearer ', '').trim() ||
    ''
  return provided === expectedKey
}

function sendJson(response: ServerResponse, statusCode: number, payload: unknown) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json',
    // Restrict CORS to localhost only — the bridge only talks to the local GymFlow app
    'Access-Control-Allow-Origin': 'http://localhost:3000',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-bridge-api-key, authorization',
  })
  response.end(JSON.stringify(payload, null, 2))
}

function readBody(request: IncomingMessage) {
  return new Promise<string>((resolve, reject) => {
    let body = ''

    request.on('data', chunk => {
      body += chunk
      if (body.length > 1_000_000) {
        request.destroy()
        reject(new Error('Request body too large'))
      }
    })
    request.on('end', () => resolve(body))
    request.on('error', reject)
  })
}

/** Shared request handler — wraps all routes with auth check. */
async function handleRequest(request: IncomingMessage, response: ServerResponse) {
  const method = request.method || 'GET'
  const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`)

  // CORS preflight
  if (method === 'OPTIONS') {
    sendJson(response, 204, {})
    return
  }

  // Public: health check (read-only status only, no sensitive data)
  if (method === 'GET' && url.pathname === '/health') {
    sendJson(response, 200, {
      success: true,
      service: 'fingerprint-bridge',
      uptime_seconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      mode: config.mode,
      connection: {
        state: connectionManager.getStatus().state,
        ip: config.device.ip,
        port: config.device.port,
        mode: config.mode,
      },
      local_sync: {
        pending: getLocalSyncStats().pending,
        synced: getLocalSyncStats().synced,
      },
    })
    return
  }

  // ── All other endpoints require authentication ─────────────────────────
  if (!isAuthorized(request)) {
    sendJson(response, 401, { success: false, error: 'Unauthorized: valid x-bridge-api-key header required' })
    return
  }

  try {
    if (method === 'GET' && url.pathname === '/device-status') {
      sendJson(response, 200, {
        success: true,
        device: connectionManager.getStatus(),
        local_sync: getLocalSyncStats(),
      })
      return
    }

    if (method === 'POST' && url.pathname === '/sync-attendance') {
      await readBody(request)
      const result = await runSyncJob()
      sendJson(response, result.success ? 200 : 500, {
        success: result.success,
        result,
        device: connectionManager.getStatus(),
        local_sync: getLocalSyncStats(),
      })
      return
    }

    if (method === 'GET' && url.pathname === '/device-users') {
      const users = await connectionManager.getDeviceUsers()
      sendJson(response, 200, { success: true, count: users.length, users })
      return
    }

    if (method === 'GET' && url.pathname === '/device-users/check') {
      const userId = url.searchParams.get('userId')?.trim()
      if (!userId) {
        sendJson(response, 400, { success: false, error: 'userId is required' })
        return
      }
      const users = await connectionManager.getDeviceUsers()
      const match = users.find(
        (user) => user.userId === userId || user.userId === String(Number(userId))
      )
      sendJson(response, 200, {
        success: true,
        userId,
        onDevice: Boolean(match),
        user: match ?? null,
      })
      return
    }

    if (method === 'POST' && url.pathname === '/enroll/register') {
      const body = JSON.parse((await readBody(request)) || '{}')
      const userId = String(body.userId || '').trim()
      const name = String(body.name || '').trim()
      if (!userId || !name) {
        sendJson(response, 400, { success: false, error: 'userId and name are required' })
        return
      }
      const result = await connectionManager.registerMemberOnDevice({ userId, name })
      sendJson(response, 200, { success: true, ...result })
      return
    }

    if (method === 'POST' && url.pathname === '/reconnect') {
      // Read new IP/port from request body (optional — falls back to .env file)
      const bodyStr = await readBody(request).catch(() => '{}')
      const body = JSON.parse(bodyStr || '{}')

      if (body.ip_address) {
        config.device.ip = String(body.ip_address).trim()
        config.device.port = parseInt(body.port, 10) || config.device.port
        logger.info(`Hot-reload: config updated from request body — ${config.device.ip}:${config.device.port}`)
      } else {
        // No IP in body — reload from .env file
        const changed = reloadConfig()
        if (changed.length > 0) {
          logger.info(`Hot-reload: .env changed — ${changed.join(', ')}`)
        } else {
          logger.info('Hot-reload: .env file checked — no changes detected')
        }
      }

      const status = await connectionManager.reconnectWithConfig()

      sendJson(response, status.state === 'online' ? 200 : 200, {
        success: true,
        message:
          status.state === 'online'
            ? `Reconnected successfully to ${config.device.ip}:${config.device.port}`
            : `Reconnection initiated — device at ${config.device.ip}:${config.device.port} is ${status.state}`,
        device: status,
      })
      return
    }

    if (method === 'POST' && url.pathname === '/enroll/start') {
      const body = JSON.parse((await readBody(request)) || '{}')
      const userId = String(body.userId || '').trim()
      const name = String(body.name || '').trim()
      const fingerIndex = Number(body.fingerIndex ?? 0)
      if (!userId) {
        sendJson(response, 400, { success: false, error: 'userId is required' })
        return
      }

      // Track the actual UID assigned by upsertUser so startFingerprintEnrollment
      // targets the EXACT same device record — not a different UID calculated
      // independently (which creates a phantom user on some ZKTeco models).
      let actualUid: number | undefined
      if (name) {
        const result = await connectionManager.registerMemberOnDevice({ userId, name })
        actualUid = result.user.uid
      }

      const enroll = await connectionManager.startMemberEnrollment(userId, fingerIndex, actualUid)
      sendJson(response, 200, {
        success: true,
        message: 'Device is ready — place the same finger 3 times on the scanner',
        enroll,
      })
      return
    }

    sendJson(response, 404, {
      success: false,
      error: 'Route not found',
    })
  } catch (error: any) {
    logger.error('API request failed', error)
    sendJson(response, 500, {
      success: false,
      error: 'Internal bridge error',
    })
  }
}

export function startApiServer() {
  const server = http.createServer(handleRequest)

  // Bind to 127.0.0.1 (localhost only) — the bridge only needs to be accessible
  // from the local GymFlow Next.js app, not from the network.
  server.listen(config.service.port, '127.0.0.1', () => {
    logger.info(`Fingerprint Bridge REST API listening on http://127.0.0.1:${config.service.port}`)
    logger.info('Security: bound to localhost only — not accessible from other devices on the network')
    logger.info(`GET  http://127.0.0.1:${config.service.port}/health  (public)`)
    logger.info(`GET  http://127.0.0.1:${config.service.port}/device-status  (requires x-bridge-api-key)`)
    logger.info(`POST http://127.0.0.1:${config.service.port}/sync-attendance  (requires x-bridge-api-key)`)
    logger.info(`GET  http://127.0.0.1:${config.service.port}/device-users  (requires x-bridge-api-key)`)
    logger.info(`POST http://127.0.0.1:${config.service.port}/enroll/register  (requires x-bridge-api-key)`)
    logger.info(`POST http://127.0.0.1:${config.service.port}/enroll/start  (requires x-bridge-api-key)`)
  })

  return server
}
