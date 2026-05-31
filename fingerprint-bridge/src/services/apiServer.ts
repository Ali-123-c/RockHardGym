import http, { IncomingMessage, ServerResponse } from 'http'
import { config } from '../config'
import { getLocalSyncStats } from '../storage/localStore'
import { logger } from '../utils/logger'
import { connectionManager } from './connectionManager'
import { runSyncJob } from './syncService'

function sendJson(response: ServerResponse, statusCode: number, payload: unknown) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
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

export function startApiServer() {
  const server = http.createServer(async (request, response) => {
    const method = request.method || 'GET'
    const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`)

    if (method === 'OPTIONS') {
      sendJson(response, 204, {})
      return
    }

    try {
      if (method === 'GET' && url.pathname === '/health') {
        sendJson(response, 200, {
          success: true,
          service: 'fingerprint-bridge',
          uptime_seconds: Math.round(process.uptime()),
          timestamp: new Date().toISOString(),
          connection: connectionManager.getStatus(),
          local_sync: getLocalSyncStats()
        })
        return
      }

      if (method === 'GET' && url.pathname === '/device-status') {
        sendJson(response, 200, {
          success: true,
          device: connectionManager.getStatus(),
          local_sync: getLocalSyncStats()
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
          local_sync: getLocalSyncStats()
        })
        return
      }

      sendJson(response, 404, {
        success: false,
        error: 'Route not found'
      })
    } catch (error: any) {
      logger.error('API request failed', error)
      sendJson(response, 500, {
        success: false,
        error: error.message || 'Internal bridge error'
      })
    }
  })

  server.listen(config.service.port, () => {
    logger.info(`Fingerprint Bridge REST API listening on port ${config.service.port}`)
    logger.info(`GET  http://localhost:${config.service.port}/health`)
    logger.info(`GET  http://localhost:${config.service.port}/device-status`)
    logger.info(`POST http://localhost:${config.service.port}/sync-attendance`)
  })

  return server
}
