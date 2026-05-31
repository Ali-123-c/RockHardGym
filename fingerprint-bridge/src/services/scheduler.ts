import cron from 'node-cron'
import { config } from '../config'
import { logger } from '../utils/logger'
import { runSyncJob } from './syncService'

export function startScheduler() {
  const minutes = config.sync.intervalMinutes
  
  // Validate cron schedule (1, 5, 10, 15, 30 are supported)
  if (![1, 5, 10, 15, 30].includes(minutes)) {
    logger.warn(`Invalid SYNC_INTERVAL_MINUTES: ${minutes}. Defaulting to 5.`)
    config.sync.intervalMinutes = 5
  }

  const cronExpression = `*/${config.sync.intervalMinutes} * * * *`
  
  logger.info(`Starting cron scheduler with expression: '${cronExpression}' (Every ${config.sync.intervalMinutes} minutes)`)

  // Initial run on startup
  runSyncJob()

  cron.schedule(cronExpression, () => {
    logger.info('--- Scheduled Sync Triggered ---')
    runSyncJob()
  })

  setInterval(() => {
    logger.info('--- Retry Sync Triggered ---')
    runSyncJob()
  }, config.sync.retryIntervalMs)
}
