const BRIDGE_URL = process.env.FINGERPRINT_BRIDGE_URL || 'http://localhost:5050'

async function bridgeFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BRIDGE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  })

  const payload = await response.json()
  if (!response.ok || payload.success === false) {
    throw new Error(payload.error || `Bridge request failed (${response.status})`)
  }

  return payload as T
}

export function checkDeviceUser(userId: string) {
  return bridgeFetch<{
    success: boolean
    userId: string
    onDevice: boolean
    user: { uid: number; name: string; userId: string } | null
  }>(`/device-users/check?userId=${encodeURIComponent(userId)}`)
}

export function registerDeviceUser(userId: string, name: string) {
  return bridgeFetch<{ success: boolean; created: boolean }>('/enroll/register', {
    method: 'POST',
    body: JSON.stringify({ userId, name }),
  })
}

export function startDeviceEnrollment(userId: string, name: string, fingerIndex = 0) {
  return bridgeFetch<{ success: boolean; message: string }>('/enroll/start', {
    method: 'POST',
    body: JSON.stringify({ userId, name, fingerIndex }),
  })
}

export function triggerBridgeSync() {
  return bridgeFetch<{ success: boolean; result: unknown }>('/sync-attendance', {
    method: 'POST',
    body: '{}',
  })
}
