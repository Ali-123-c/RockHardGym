/**
 * Diagnose fingerprint → attendance sync.
 * Run: node scripts/diagnose-attendance.mjs
 */
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'

dotenv.config({ path: '.env.local' })
dotenv.config({ path: 'fingerprint-bridge/.env' })

const DEVICE_ID =
  process.env.DEVICE_ID || '8807f64b-fcc5-4f5d-83ba-6ef70375ae1c'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const API_KEY = process.env.FINGERPRINT_API_KEY
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

async function main() {
  console.log('\n=== GymFlow Attendance Sync Diagnostic ===\n')

  const { data: members, error: memberErr } = await supabase
    .from('members')
    .select('id, name, membership_no, status')
    .order('created_at', { ascending: false })

  if (memberErr) {
    console.error('❌ Supabase members query failed:', memberErr.message)
    process.exit(1)
  }

  console.log(`Members in database: ${members?.length ?? 0}`)
  for (const m of members || []) {
    console.log(`  • ${m.membership_no} — ${m.name} (${m.status})`)
  }

  const syncPath = path.join('fingerprint-bridge', 'local-sync.json')
  let deviceLogs = []
  if (fs.existsSync(syncPath)) {
    deviceLogs = JSON.parse(fs.readFileSync(syncPath, 'utf8'))
    const recent = deviceLogs
      .filter((l) => l.enrollNumber && l.timestamp?.startsWith('2026'))
      .slice(-10)
    console.log(`\nRecent device scans (local-sync.json): ${recent.length}`)
    for (const l of recent) {
      const match = members?.find(
        (m) =>
          m.membership_no?.toLowerCase() === l.enrollNumber.toLowerCase() ||
          m.membership_no === String(parseInt(l.enrollNumber, 10))
      )
      console.log(
        `  • device ID "${l.enrollNumber}" @ ${l.timestamp} → member: ${match ? match.name + ' (' + match.membership_no + ')' : '❌ NO MATCH'}`
      )
    }
  }

  const testEnroll = process.argv[2] || 'As-342'
  const testMember = members?.find(
    (m) => m.membership_no?.toLowerCase() === testEnroll.toLowerCase()
  )

  console.log(`\n--- Live API test for device ID "${testEnroll}" ---`)
  if (!testMember) {
    console.log(`❌ No member with membership_no "${testEnroll}" in GymFlow.`)
    console.log('   Fix: Edit member → set membership number = device user ID exactly.')
  } else {
    console.log(`✓ Found member: ${testMember.name} (${testMember.membership_no})`)
  }

  const payload = {
    device_id: DEVICE_ID,
    logs: [
      {
        enrollNumber: testEnroll,
        timestamp: new Date().toISOString(),
        event_type: 'checkin',
      },
    ],
  }

  try {
    const res = await fetch(`${APP_URL}/api/fingerprint/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
      body: JSON.stringify(payload),
    })
    const body = await res.json()
    console.log(`\nPOST /api/fingerprint/sync → ${res.status}`)
    console.log(JSON.stringify(body, null, 2))

    if (body.attendance_marked > 0) {
      console.log('\n✅ Attendance WAS marked successfully.')
    } else if (body.unmatched?.length) {
      console.log('\n❌ ROOT CAUSE: Device ID not matched to any membership_no.')
    } else if (body.synced === 0 && !body.errors) {
      console.log('\n⚠️  Log may be duplicate for today — check Attendance page for this date.')
    } else if (body.errors) {
      console.log('\n❌ ROOT CAUSE: API errors:', body.errors.join('; '))
    }
  } catch (e) {
    console.error(`\n❌ Cannot reach ${APP_URL} — start app with: npm run dev`)
    console.error('   Error:', e.message)
  }

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' })
  const { data: todayAtt } = await supabase
    .from('attendance')
    .select('id, member_id, date, members(name, membership_no)')
    .eq('date', today)

  console.log(`\nAttendance rows for today (${today}): ${todayAtt?.length ?? 0}`)
  for (const a of todayAtt || []) {
    console.log(`  • ${a.members?.membership_no} — ${a.members?.name}`)
  }

  console.log('\n=== Done ===\n')
}

main()
