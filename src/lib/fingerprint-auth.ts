import { NextResponse } from 'next/server'

export function validateFingerprintApiKey(request: Request) {
  const authHeader = request.headers.get('Authorization')
  const apiKey = authHeader?.split('Bearer ')[1] || request.headers.get('x-api-key')

  if (!apiKey || apiKey !== process.env.FINGERPRINT_API_KEY) {
    return NextResponse.json({ success: false, error: 'Unauthorized: Invalid API Key' }, { status: 401 })
  }

  return null // null means successful validation
}
