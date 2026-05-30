import dotenv from 'dotenv'
import path from 'path'

// Load .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

export const config = {
  api: {
    baseUrl: process.env.API_BASE_URL || 'http://localhost:3000',
    key: process.env.API_KEY || ''
  },
  device: {
    id: process.env.DEVICE_ID || 'mock-device-uuid',
    ip: process.env.DEVICE_IP || '192.168.1.201',
    port: parseInt(process.env.DEVICE_PORT || '4370', 10),
    password: process.env.DEVICE_PASSWORD || ''
  },
  sync: {
    intervalMinutes: parseInt(process.env.SYNC_INTERVAL_MINUTES || '5', 10)
  },
  mode: (process.env.MODE || 'simulator') as 'real' | 'simulator'
}
