import { NextResponse } from 'next/server'
import { validateFingerprintApiKey } from '@/lib/fingerprint-auth'

// Endpoint to verify API key and network connectivity
export async function POST(req: Request) {
  const authError = validateFingerprintApiKey(req)
  if (authError) return authError

  return NextResponse.json({ 
    success: true, 
    message: 'Connection successful',
    server_time: new Date().toISOString()
  })
}
