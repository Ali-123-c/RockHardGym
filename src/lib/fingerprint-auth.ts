import { NextResponse } from 'next/server'
import { isValidFingerprintApiKey } from '@/lib/fingerprint-api-key'

export function validateFingerprintApiKey(request: Request) {
  if (!process.env.FINGERPRINT_API_KEY) {
    return NextResponse.json(
      { success: false, error: 'Server misconfigured: FINGERPRINT_API_KEY is not set' },
      { status: 500 }
    )
  }

  if (!isValidFingerprintApiKey(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized: Invalid API Key' }, { status: 401 })
  }

  return null
}
