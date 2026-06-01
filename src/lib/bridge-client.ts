const BRIDGE_URL = process.env.FINGERPRINT_BRIDGE_URL || 'http://localhost:5050'
const BRIDGE_TIMEOUT = 8000 // 8 second timeout
const MAX_RETRIES = 2
const RETRY_DELAY = 1000 // 1 second between retries

type BridgeFetchOptions = RequestInit & { maxRetries?: number }

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function bridgeFetch<T>(path: string, init?: BridgeFetchOptions): Promise<T> {
  const maxRetries = init?.maxRetries ?? MAX_RETRIES
  let lastError: Error | null = null
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), BRIDGE_TIMEOUT)
      
      const response = await fetch(`${BRIDGE_URL}${path}`, {
        ...init,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(init?.headers || {}),
        },
        cache: 'no-store',
      })
      
      clearTimeout(timeoutId)
      
      const payload = await response.json()
      if (!response.ok || payload.success === false) {
        throw new Error(payload.error || `Bridge request failed (${response.status})`)
      }
      
      return payload as T
    } catch (error: any) {
      lastError = error
      
      // Don't retry on client errors (4xx)
      if (error?.status >= 400 && error?.status < 500) {
        throw error
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
  })
}

export function startDeviceEnrollment(userId: string, name: string, fingerIndex = 0) {
  return bridgeFetch<{ success: boolean; message: string }>('/enroll/start', {
    method: 'POST',
    body: JSON.stringify({ userId, name, fingerIndex }),
    maxRetries: 2,
  })
}

export function triggerBridgeSync() {
  return bridgeFetch<{ success: boolean; result: unknown }>('/sync-attendance', {
    method: 'POST',
    body: '{}',
    maxRetries: 1,
  })
}