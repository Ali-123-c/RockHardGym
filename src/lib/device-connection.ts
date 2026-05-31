import { execFile } from 'child_process'
import net from 'net'
import os from 'os'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

export interface DeviceConnectionConfig {
  ipAddress: string
  port: number
}

export interface DeviceConnectionResult {
  status: 'Online' | 'Offline'
  pingReachable: boolean
  portReachable: boolean
  responseTime: number | null
  checkedAt: string
  error?: string
}

async function pingDevice(ipAddress: string, timeoutMs = 2000) {
  const startedAt = Date.now()
  const isWindows = os.platform() === 'win32'
  const args = isWindows
    ? ['-n', '1', '-w', String(timeoutMs), ipAddress]
    : ['-c', '1', '-W', String(Math.ceil(timeoutMs / 1000)), ipAddress]

  try {
    await execFileAsync('ping', args, { timeout: timeoutMs + 1000 })
    return { reachable: true, responseTime: Date.now() - startedAt }
  } catch {
    return { reachable: false, responseTime: null }
  }
}

async function checkPort(ipAddress: string, port: number, timeoutMs = 3000) {
  const startedAt = Date.now()

  return new Promise<{ reachable: boolean; responseTime: number | null; error?: string }>((resolve) => {
    const socket = new net.Socket()
    let settled = false

    const finish = (reachable: boolean, error?: string) => {
      if (settled) return
      settled = true
      socket.destroy()
      resolve({
        reachable,
        responseTime: reachable ? Date.now() - startedAt : null,
        error,
      })
    }

    socket.setTimeout(timeoutMs)
    socket.once('connect', () => finish(true))
    socket.once('timeout', () => finish(false, `Port ${port} timed out`))
    socket.once('error', (error) => finish(false, error.message))
    socket.connect(port, ipAddress)
  })
}

export async function testDeviceConnection(config: DeviceConnectionConfig): Promise<DeviceConnectionResult> {
  const ping = await pingDevice(config.ipAddress)
  const port = await checkPort(config.ipAddress, config.port)
  const online = ping.reachable && port.reachable

  return {
    status: online ? 'Online' : 'Offline',
    pingReachable: ping.reachable,
    portReachable: port.reachable,
    responseTime: port.responseTime ?? ping.responseTime,
    checkedAt: new Date().toISOString(),
    error: port.error,
  }
}
