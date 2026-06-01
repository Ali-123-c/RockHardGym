/** Shared API-key helpers for bridge ↔ GymFlow (middleware + route handlers). */

export const FINGERPRINT_BRIDGE_API_PATHS = [
  '/api/fingerprint/sync',
  '/api/fingerprint/status',
] as const

export function isFingerprintBridgeApiPath(pathname: string): boolean {
  return (FINGERPRINT_BRIDGE_API_PATHS as readonly string[]).includes(pathname)
}

export function extractFingerprintApiKey(request: Request): string | null {
  const authHeader = request.headers.get('Authorization')
  const bearer = authHeader?.split('Bearer ')[1]?.trim()
  const headerKey = request.headers.get('x-fingerprint-api-key')?.trim() || request.headers.get('x-api-key')?.trim()
  return bearer || headerKey || null
}

export function isValidFingerprintApiKey(request: Request): boolean {
  const expected = process.env.FINGERPRINT_API_KEY
  if (!expected) return false
  const provided = extractFingerprintApiKey(request)
  return Boolean(provided && provided === expected)
}
