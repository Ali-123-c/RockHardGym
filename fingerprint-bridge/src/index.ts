import fs from 'fs'
import { logger } from './utils/logger'
import { initDB, requeueFailedSyncLogs, requeueRecentLogs } from './storage/localStore'
import { startScheduler } from './services/scheduler'
import { config, envPath, reloadConfig } from './config'
import { startApiServer } from './services/apiServer'
import { connectionManager } from './services/connectionManager'

async function bootstrap() {
  logger.info('=====================================')
  logger.info(' GymFlow Fingerprint Bridge Service  ')
  logger.info('=====================================')
  logger.info(`Mode: ${config.mode.toUpperCase()}`)
  logger.info(`Device: ${config.device.ip}:${config.device.port}`)
  logger.info(`Target API: ${config.api.baseUrl}`)
  logger.info(`Bridge API Port: ${config.service.port}`)
  
  if (!config.api.key) {
    logger.error('CRITICAL: API_KEY is missing in .env')
    process.exit(1)
  }

  if (!config.service.authKey) {
    logger.error('CRITICAL: BRIDGE_API_KEY is missing in .env — this key secures the bridge API server')
    process.exit(1)
  }

  // Initialize local JSON cache for failed/unsynced attendance records
  initDB()
  requeueFailedSyncLogs()
  requeueRecentLogs(48)

  // Start REST API for PC 2 health checks and manual sync
  const server = startApiServer()

  // Keep a managed device connection alive and reconnect on failures
  await connectionManager.start()

  // Start the automated syncing process
  startScheduler()

  // ── File watcher: hot-reload when .env changes ─────────────────────────
  // When the device IP/port is updated via the GymFlow web UI, the
  // device-settings API writes to fingerprint-bridge/.env. This watcher
  // detects the change and reconnects the device without restarting.
  logger.info(`Watching ${envPath} for config changes...`)
  fs.watchFile(envPath, { interval: 2000 }, async (curr, prev) => {
    if (curr.mtimeMs === prev.mtimeMs) return // No real change

    logger.info('Detected .env file change — reloading config and reconnecting device...')

    const changed = reloadConfig()
    if (changed.length > 0) {
      logger.info(`Config changes detected: ${changed.join(', ')}`)
    }

    // Always reconnect when .env changes, even if the reload didn't detect
    // a diff (could be whitespace or unhandled var). The reconnect is lightweight
    // if the device is already connected with the same settings.
    await connectionManager.reconnectWithConfig()
  })

  // Handle graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down Fingerprint Bridge Service...')
    fs.unwatchFile(envPath)
    server.close()
    await connectionManager.stop()
    process.exit(0)
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)

  // Prevent crash from device protocol errors (e.g. node-zklib TypeError on timeout)
  // The bridge should stay alive even if the device is unresponsive
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception (bridge will continue running):', error)
  })

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection (bridge will continue running):', reason as any)
  })
}

bootstrap().catch(error => {
  logger.error('Bridge bootstrap failed', error)
  process.exit(1)
})
