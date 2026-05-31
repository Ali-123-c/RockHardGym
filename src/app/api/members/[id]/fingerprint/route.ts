import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { checkDeviceUser, registerDeviceUser, startDeviceEnrollment, triggerBridgeSync } from '@/lib/bridge-client'

async function getMember(id: string) {
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
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Could not reach fingerprint bridge. Is npm run dev:bridge running?',
      },
      { status: 503 }
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
      const deviceCheck = await checkDeviceUser(userId)
      return NextResponse.json({ success: true, device: deviceCheck })
    }

    if (action === 'register') {
      const result = await registerDeviceUser(userId, name)
      return NextResponse.json({
        success: true,
        message: result.created
          ? `User ${userId} created on device. Now enroll fingerprint.`
          : `User ${userId} already exists on device.`,
        result,
      })
    }

    if (action === 'start-enroll') {
      const result = await startDeviceEnrollment(userId, name, Number(body.fingerIndex ?? 0))
      return NextResponse.json({
        success: true,
        message: result.message,
        nextStep: 'Scan the same finger on the device 3 times when prompted.',
      })
    }

    if (action === 'sync-now') {
      const result = await triggerBridgeSync()
      return NextResponse.json({
        success: true,
        message: 'Attendance sync triggered',
        result,
      })
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Fingerprint enrollment failed',
      },
      { status: 503 }
    )
  }
}
