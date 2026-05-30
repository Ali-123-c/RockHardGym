import { logger } from './utils/logger'
import { initDB } from './storage/localStore'
import { startScheduler } from './services/scheduler'
import { config } from './config'

function bootstrap() {
  logger.info('=====================================')
  logger.info(' GymFlow Fingerprint Bridge Service  ')
  logger.info('=====================================')
  logger.info(`Mode: ${config.mode.toUpperCase()}`)
  logger.info(`Device IP: ${config.device.ip}`)
  logger.info(`Target API: ${config.api.baseUrl}`)
  
  if (!config.api.key) {
    logger.error('CRITICAL: API_KEY is missing in .env')
    process.exit(1)
  }

  // Initialize SQLite cache
  initDB()

  // Start the automated syncing process
  startScheduler()
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.info('Shutting down Fingerprint Bridge Service...')
  process.exit(0)
})

bootstrap()
