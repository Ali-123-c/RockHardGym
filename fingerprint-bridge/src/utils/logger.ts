import fs from 'fs'
import path from 'path'

type LogType = 'connection' | 'device' | 'error'

const logsDir = path.resolve(process.cwd(), 'logs')

function ensureLogsDir() {
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true })
  }
}

function appendLog(type: LogType, level: string, message: string, meta: any[]) {
  ensureLogsDir()
  const line = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    meta: meta.map(item => item instanceof Error ? item.message : item)
  })

  fs.appendFileSync(path.join(logsDir, `${type}.log`), `${line}\n`)
}

export const logger = {
  info: (message: string, ...meta: any[]) => {
    console.log(`[${new Date().toISOString()}] [INFO] ${message}`, ...meta)
    appendLog('device', 'INFO', message, meta)
  },
  error: (message: string, error?: any) => {
    console.error(`[${new Date().toISOString()}] [ERROR] ${message}`, error ? error : '')
    appendLog('error', 'ERROR', message, error ? [error] : [])
  },
  warn: (message: string, ...meta: any[]) => {
    console.warn(`[${new Date().toISOString()}] [WARN] ${message}`, ...meta)
    appendLog('device', 'WARN', message, meta)
  },
  connection: (message: string, ...meta: any[]) => {
    console.log(`[${new Date().toISOString()}] [CONNECTION] ${message}`, ...meta)
    appendLog('connection', 'CONNECTION', message, meta)
  },
  device: (message: string, ...meta: any[]) => {
    console.log(`[${new Date().toISOString()}] [DEVICE] ${message}`, ...meta)
    appendLog('device', 'DEVICE', message, meta)
  }
}
