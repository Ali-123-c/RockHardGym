import { NextResponse } from 'next/server'
import os from 'os'
import net from 'net'

function getLocalIpRange(): string[] {
  const interfaces = os.networkInterfaces()
  const ranges: string[] = []

  for (const [, addrs] of Object.entries(interfaces)) {
    if (!addrs) continue
    for (const addr of addrs) {
      if (addr.family === 'IPv4' && !addr.internal) {
        const parts = addr.address.split('.')
        const subnet = `${parts[0]}.${parts[1]}.${parts[2]}`
        if (!ranges.includes(subnet)) ranges.push(subnet)
      }
    }
  }

  return ranges
}

// Use native TCP socket instead of PowerShell for reliability
async function scanIp(ip: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: ip, port, timeout: 1000 })

    socket.on('connect', () => {
      socket.destroy()
      resolve(true)
    })

    socket.on('timeout', () => {
      socket.destroy()
      resolve(false)
    })

    socket.on('error', () => {
      resolve(false)
    })
  })
}

export async function POST(req: Request) {
  try {
    const { port = 4370, scan_range } = await req.json()

    // Use provided range or auto-detect
    const ranges = scan_range ? [scan_range] : getLocalIpRange()

    if (ranges.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Could not determine network range. Enter IP manually.' },
        { status: 400 }
      )
    }

    // Scan IPs in the range (scan_range.1-254)
    const baseRange = ranges[0]
    const ips = Array.from({ length: 254 }, (_, i) => `${baseRange}.${i + 1}`)

    // Scan in parallel batches of 20
    const results: string[] = []
    for (let i = 0; i < ips.length; i += 20) {
      const batch = ips.slice(i, i + 20)
      const checks = await Promise.all(batch.map((ip) => scanIp(ip, port)))
      checks.forEach((found, idx) => {
        if (found) results.push(batch[idx])
      })
    }

    if (results.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: `No device found on port ${port} in range ${baseRange}.0/24. Check if device is powered on and connected.`,
        },
        { status: 404 }
      )
    }

    // Return the first found IP (usually the device)
    return NextResponse.json({ success: true, ip_address: results[0], found_ips: results })
  } catch (error: any) {
    console.error('Device detection error:', error)
    return NextResponse.json(
      { success: false, error: 'Device detection failed. Enter IP manually.' },
      { status: 500 }
    )
  }
}

