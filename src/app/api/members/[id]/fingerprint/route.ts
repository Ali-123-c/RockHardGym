import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { checkDeviceUser, registerDeviceUser, startDeviceEnrollment, triggerBridgeSync } from '@/lib/bridge-client'

async function getMember(id: string) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('members')
    .select('id, name, membership_no, status')
    .eq('id', id)
    .single()

  if (error || !data) return null
  return data
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const member = await getMember(id)
    if (!member) {
      return NextResponse.json({ success: false, error: 'Member not found' }, { status: 404 })
    }

    try {
      const deviceCheck = await checkDeviceUser(member.membership_no)
      return NextResponse.json({
        success: true,
        member,
        device: deviceCheck,
        instructions: {
          deviceUserId: member.membership_no,
          note: 'Device User ID must match membership number exactly.',
        },
      })
    } catch (bridgeError: any) {
      console.error('Bridge check failed:', bridgeError.message)
      // Return member info even if bridge is down, device status as unknown
      return NextResponse.json({
        success: true,
        member,
        device: {
          success: false,
          onDevice: null,
          bridgeStatus: 'offline',
          message: 'Fingerprint bridge temporarily unavailable',
        },
        instructions: {
          deviceUserId: member.membership_no,
          note: 'Device User ID must match membership number exactly.',
        },
      }, { status: 200 })
    }
  } catch (error: any) {
    console.error('GET /fingerprint error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to retrieve fingerprint status',
      },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const body = await request.json()
    const action = String(body.action || 'start-enroll')

    const member = await getMember(id)
    if (!member) {
      return NextResponse.json({ success: false, error: 'Member not found' }, { status: 404 })
    }

    const userId = member.membership_no
    const name = member.name

    if (action === 'check') {
      try {
        const deviceCheck = await checkDeviceUser(userId)
        return NextResponse.json({ success: true, device: deviceCheck })
      } catch (error: any) {
        console.warn(`Device check failed for ${userId}:`, error.message)
        // Return 200 with offline status (same as GET handler) instead of 503
        // so the frontend doesn't trigger error boundaries for a routine offline state
        return NextResponse.json({
          success: true,
          device: {
            success: false,
            onDevice: null,
            bridgeStatus: 'offline',
            message: 'Fingerprint bridge temporarily unavailable',
          },
        }, { status: 200 })
      }
    }

    if (action === 'register') {
      try {
        const result = await registerDeviceUser(userId, name)
        return NextResponse.json({
          success: true,
          message: result.created
            ? `User ${userId} created on device. Now enroll fingerprint.`
            : `User ${userId} already exists on device.`,
          result,
        })
      } catch (error: any) {
        console.error(`Device registration failed for ${userId}:`, error.message)
        return NextResponse.json({
          success: false,
          error: 'Failed to register user on device - please try again',
          action: 'retry',
        }, { status: 503 })
      }
    }

    if (action === 'start-enroll') {
      try {
        const result = await startDeviceEnrollment(userId, name, Number(body.fingerIndex ?? 0))
        return NextResponse.json({
          success: true,
          message: result.message,
          nextStep: 'Scan the same finger on the device 3 times when prompted.',
        })
      } catch (error: any) {
        console.error(`Fingerprint enrollment failed for ${userId}:`, error.message)
        return NextResponse.json({
          success: false,
          error: 'Fingerprint enrollment failed - please ensure the device is connected and try again',
          action: 'retry',
        }, { status: 503 })
      }
    }

    if (action === 'sync-now') {
      try {
        const result = await triggerBridgeSync()
        return NextResponse.json({
          success: true,
          message: 'Attendance sync triggered',
          result,
        })
      } catch (error: any) {
        console.error('Attendance sync failed:', error.message)
        return NextResponse.json({
          success: false,
          error: 'Failed to sync attendance - bridge may be offline',
          action: 'retry',
        }, { status: 503 })
      }
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 })
  } catch (error: any) {
    console.error('POST /fingerprint error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Fingerprint operation failed',
      },
      { status: 500 }
    )
  }
}