import { logger } from './utils/logger'
import { initDB, requeueFailedSyncLogs, requeueRecentLogs } from './storage/localStore'
import { startScheduler } from './services/scheduler'
import { config } from './config'
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

  // Handle graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down Fingerprint Bridge Service...')
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
