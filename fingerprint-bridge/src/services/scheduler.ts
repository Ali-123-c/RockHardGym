import cron from 'node-cron'
import { config } from '../config'
import { logger } from '../utils/logger'
import { runSyncJob } from './syncService'
import { syncConfigFromApi } from './configSync'
import { connectionManager } from './connectionManager'

export function startScheduler() {
  const minutes = config.sync.intervalMinutes
  
  // Validate cron schedule (1, 5, 10, 15, 30 are supported)
  if (![1, 5, 10, 15, 30].includes(minutes)) {
    logger.warn(`Invalid SYNC_INTERVAL_MINUTES: ${minutes}. Defaulting to 5.`)
    config.sync.intervalMinutes = 5
  }

  const cronExpression = `*/${config.sync.intervalMinutes} * * * *`
  
  logger.info(`Starting cron scheduler with expression: '${cronExpression}' (Every ${config.sync.intervalMinutes} minutes)`)

  // Helper to run sync with error catching so failures don't crash the bridge
  const safeSync = () => {
    runSyncJob().catch((error) => {
      logger.error('Scheduled sync failed (caught):', error)
    })
  }

  // Initial run on startup
  safeSync()

  // Also refresh device config from the API on every schedule tick.
  // This automatically picks up IP/port changes made in the Web UI
  // without needing to manually trigger a reconnect.
  cron.schedule(cronExpression, async () => {
    logger.info('--- Scheduled Sync Triggered ---')

    // Refresh the device config from the API before syncing
    try {
      const synced = await syncConfigFromApi()
      if (synced.changed) {
        logger.info('Device config changed — reconnecting...')
        // Don't await — let the reconnect happen in the background
        connectionManager.reconnectWithConfig().catch((err) => {
          logger.error('Reconnect after config sync failed:', err)
        })
        return // Wait for reconnect to finish before syncing
      }
    } catch (error: any) {
      logger.device(`Config refresh skipped: ${error?.message || 'API unavailable'}`)
    }

    safeSync()
  })

  // Periodic config-only refresh (every retry interval) to detect changes faster
  // than waiting for the full sync schedule
  setInterval(async () => {
    try {
      const synced = await syncConfigFromApi()
      if (synced.changed) {
        logger.info('Device config changed (interval check) — reconnecting...')
        connectionManager.reconnectWithConfig().catch((err) => {
          logger.error('Reconnect after config refresh failed:', err)
        })
      }
    } catch {
      // Silently continue — config sync failures are non-critical
    }
  }, Math.min(config.sync.retryIntervalMs, 60000)) // At most every 60 seconds
}
