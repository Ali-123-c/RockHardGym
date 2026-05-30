export const logger = {
  info: (message: string, ...meta: any[]) => {
    console.log(`[${new Date().toISOString()}] [INFO] ${message}`, ...meta)
  },
  error: (message: string, error?: any) => {
    console.error(`[${new Date().toISOString()}] [ERROR] ${message}`, error ? error : '')
  },
  warn: (message: string, ...meta: any[]) => {
    console.warn(`[${new Date().toISOString()}] [WARN] ${message}`, ...meta)
  }
}
