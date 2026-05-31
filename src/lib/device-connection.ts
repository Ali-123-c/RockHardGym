import { execFile } from 'child_process'
import dgram from 'dgram'
import net from 'net'
import os from 'os'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)
const CMD_CONNECT = 1000
const USHRT_MAX = 65535

export interface DeviceConnectionConfig {
  ipAddress: string
  port: number
}

export interface DeviceConnectionResult {
  status: 'Online' | 'Offline'
  pingReachable: boolean
  portReachable: boolean
  zktecoReachable: boolean
  transport: 'tcp' | 'udp' | null
  responseTime: number | null
  checkedAt: string
  error?: string
}

async function pingDevice(ipAddress: string, timeoutMs = 5000) {
  const startedAt = Date.now()
  const isWindows = os.platform() === 'win32'
  const args = isWindows
    ? ['-n', '2', '-w', String(timeoutMs), ipAddress]
    : ['-c', '2', '-W', String(Math.ceil(timeoutMs / 1000)), ipAddress]

  try {
    await execFileAsync('ping', args, { timeout: timeoutMs + 1000 })
    return { reachable: true, responseTime: Date.now() - startedAt }
  } catch {
    return { reachable: false, responseTime: null }
  }
}

async function checkPort(ipAddress: string, port: number, timeoutMs = 5000) {
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

function createChecksum(buffer: Buffer) {
  let checksum = 0

  for (let index = 0; index < buffer.length; index += 2) {
    checksum += index === buffer.length - 1
      ? buffer[index]
      : buffer.readUInt16LE(index)
    checksum %= USHRT_MAX
  }

  return USHRT_MAX - checksum - 1
}

function createZktecoUdpHeader(command: number) {
  const buffer = Buffer.alloc(8)
  buffer.writeUInt16LE(command, 0)
  buffer.writeUInt16LE(0, 2)
  buffer.writeUInt16LE(0, 4)
  buffer.writeUInt16LE(0, 6)
  buffer.writeUInt16LE(createChecksum(buffer), 2)
  buffer.writeUInt16LE(1, 6)
  return buffer
}

async function checkZktecoUdp(ipAddress: string, port: number, timeoutMs = 5000) {
  const startedAt = Date.now()

  return new Promise<{ reachable: boolean; responseTime: number | null; error?: string }>((resolve) => {
    const socket = dgram.createSocket('udp4')
    let settled = false
    const message = createZktecoUdpHeader(CMD_CONNECT)

    const finish = (reachable: boolean, error?: string) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      socket.close()
      resolve({
        reachable,
        responseTime: reachable ? Date.now() - startedAt : null,
        error,
      })
    }

    const timer = setTimeout(() => {
      finish(false, `ZKTeco UDP port ${port} timed out`)
    }, timeoutMs)

    socket.once('message', () => finish(true))
    socket.once('error', (error) => finish(false, error.message))
    socket.send(message, 0, message.length, port, ipAddress, (error) => {
      if (error) finish(false, error.message)
    })
  })
}

export async function testDeviceConnection(config: DeviceConnectionConfig): Promise<DeviceConnectionResult> {
  const ping = await pingDevice(config.ipAddress)
  const port = await checkPort(config.ipAddress, config.port)
  const zkteco = port.reachable
    ? { reachable: false, responseTime: null as number | null, error: undefined as string | undefined }
    : await checkZktecoUdp(config.ipAddress, config.port)
  const portReachable = port.reachable || zkteco.reachable
  // ZKTeco devices often block ICMP ping; TCP/UDP on 4370 is the real connectivity signal.
  const online = portReachable
  const transport = port.reachable ? 'tcp' : zkteco.reachable ? 'udp' : null
  const error = !portReachable
    ? ping.reachable
      ? `Device IP responds to ping, but ZKTeco port ${config.port} is closed or blocked`
      : `Device IP ${config.ipAddress} is unreachable (ping failed and port ${config.port} is closed)`
    : undefined

  return {
    status: online ? 'Online' : 'Offline',
    pingReachable: ping.reachable,
    portReachable,
    zktecoReachable: zkteco.reachable,
    transport,
    responseTime: port.responseTime ?? zkteco.responseTime ?? ping.responseTime,
    checkedAt: new Date().toISOString(),
    error: error || zkteco.error || port.error,
  }
}
