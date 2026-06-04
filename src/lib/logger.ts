/**
 * Structured logging utilities for debugging real-time attendance
 */

function formatTimestamp(): string {
  return new Date().toISOString()
}

export const logger = {
  sync: (stage: string, data: any) => {
    console.log(`[${formatTimestamp()}] [SYNC] ${stage}:`, data)
  },

  attendance: (stage: string, data: any) => {
    console.log(`[${formatTimestamp()}] [ATTENDANCE] ${stage}:`, data)
  },

  realtime: (stage: string, data: any) => {
    console.log(`[${formatTimestamp()}] [REALTIME] ${stage}:`, data)
  },

  ui: (stage: string, data: any) => {
    console.log(`[${formatTimestamp()}] [UI] ${stage}:`, data)
  },

  error: (context: string, error: any) => {
    console.error(`[${formatTimestamp()}] [ERROR] ${context}:`, error)
  },
}
