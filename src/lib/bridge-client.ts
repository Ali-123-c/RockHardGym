const BRIDGE_URL = process.env.FINGERPRINT_BRIDGE_URL || 'http://127.0.0.1:5050'
const BRIDGE_API_KEY = process.env.BRIDGE_API_KEY || ''
const BRIDGE_TIMEOUT = 12000 // 12 second default timeout
const MAX_RETRIES = 2
const RETRY_DELAY = 1000 // 1 second between retries

type BridgeFetchOptions = RequestInit & { maxRetries?: number; timeoutMs?: number }

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function bridgeFetch<T>(path: string, init?: BridgeFetchOptions): Promise<T> {
  const maxRetries = init?.maxRetries ?? MAX_RETRIES
  const timeoutMs = init?.timeoutMs ?? BRIDGE_TIMEOUT
  let lastError: Error | null = null
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    let timeoutId: ReturnType<typeof setTimeout> | null = null

    try {
      const controller = new AbortController()
      timeoutId = setTimeout(() => controller.abort(), timeoutMs)
      
      const response = await fetch(`${BRIDGE_URL}${path}`, {
        ...init,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'x-bridge-api-key': BRIDGE_API_KEY,
          ...(init?.headers || {}),
        },
        cache: 'no-store',
      })
      
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      
      const payload = await response.json()
      if (!response.ok || payload.success === false) {
        throw new Error(payload.error || `Bridge request failed (${response.status})`)
      }
      
      return payload as T
    } catch (error: any) {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      lastError = error
      
      if (error?.name === 'AbortError') {
        lastError = new Error('Fingerprint bridge request timed out')
      }
      
      // Don't retry on client errors (4xx)
      if (error?.status >= 400 && error?.status < 500) {
        throw lastError
      }
      
      // Retry on network errors, timeouts, or 5xx
      if (attempt < maxRetries) {
        const delay = RETRY_DELAY * Math.pow(2, attempt) // Exponential backoff
        await sleep(delay)
        continue
      }
    }
  }
  
  throw lastError || new Error('Bridge request failed after retries')
}

export function checkDeviceUser(userId: string) {
  return bridgeFetch<{
    success: boolean
    userId: string
    onDevice: boolean
    user: { uid: number; name: string; userId: string } | null
  }>(`/device-users/check?userId=${encodeURIComponent(userId)}`, { maxRetries: 1 })
}

export function registerDeviceUser(userId: string, name: string) {
  return bridgeFetch<{ success: boolean; created: boolean }>('/enroll/register', {
    method: 'POST',
    body: JSON.stringify({ userId, name }),
    maxRetries: 2,
    timeoutMs: 15000,
  })
}

export function startDeviceEnrollment(userId: string, name: string, fingerIndex = 0) {
  return bridgeFetch<{ success: boolean; message: string }>('/enroll/start', {
    method: 'POST',
    body: JSON.stringify({ userId, name, fingerIndex }),
    maxRetries: 2,
    timeoutMs: 15000,
  })
}

export function triggerBridgeSync() {
  return bridgeFetch<{ success: boolean; result: unknown }>('/sync-attendance', {
    method: 'POST',
    body: '{}',
    maxRetries: 1,
  })
}

export function triggerBridgeReconnect(ipAddress?: string, port?: number) {
  const body: Record<string, unknown> = {}
  if (ipAddress) body.ip_address = ipAddress
  if (port) body.port = port
  return bridgeFetch<{ success: boolean; message: string; device: unknown }>('/reconnect', {
    method: 'POST',
    body: JSON.stringify(body),
    maxRetries: 1,
    timeoutMs: 30000, // reconnect can take time
  })
}