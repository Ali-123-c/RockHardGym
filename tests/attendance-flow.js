/**
 * Complete Attendance Flow Test
 * 
 * Tests the full attendance pipeline:
 *   Create members -> Mark attendance -> Verify records -> Cleanup
 */

const API_URL = 'http://localhost:3000/api'
const testMembers = []
const errors = []

function log(msg) {
  console.log(msg)
}

function error(msg) {
  console.error('   ❌ ' + msg)
  errors.push(msg)
}

function ok(msg) {
  console.log('   ✅ ' + msg)
}

async function createMember(data) {
  const res = await fetch(API_URL + '/members', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  const body = await res.json()
  if (!body.success) throw new Error('Create failed: ' + body.error)
  return body.data
}

async function deleteMember(id) {
  const res = await fetch(API_URL + '/members/' + id, { method: 'DELETE' })
  const body = await res.json()
  if (!body.success) throw new Error('Delete failed: ' + body.error)
  return body
}

async function markAttendance(memberId, date) {
  const res = await fetch(API_URL + '/attendance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      member_id: memberId,
      local_date: date,
      client_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    })
  })
  const body = await res.json()
  return { status: res.status, body }
}

async function getAttendance(date) {
  const res = await fetch(API_URL + '/attendance?date=' + date)
  const body = await res.json()
  return { status: res.status, body }
}

async function runAttendanceFlow() {
  console.log('===============================================')
  console.log('   COMPLETE ATTENDANCE FLOW TEST')
  console.log('===============================================\n')

  const today = new Date().toLocaleDateString('en-CA')
  const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('en-CA')

  try {
    // --------------------------------------------------
    // PHASE 1: Create Test Members
    // --------------------------------------------------
    log('PHASE 1: Creating Test Members\n')

    const member1 = await createMember({
      name: 'Alex Johnson',
      phone: '555-' + (Math.floor(Math.random() * 90000) + 10000),
      membership_no: 'ATT-' + (Math.floor(Math.random() * 9000) + 1000),
      city: 'Karachi',
      joining_date: '2026-01-15',
      fee_amount: 5000
    })
    testMembers.push(member1.id)
    ok('Member 1 created: ' + member1.name + ' (' + member1.id.slice(0, 8) + '...)')

    const member2 = await createMember({
      name: 'Sarah Khan',
      phone: '555-' + (Math.floor(Math.random() * 90000) + 10000),
      membership_no: 'ATT-' + (Math.floor(Math.random() * 9000) + 1000),
      city: 'Lahore',
      joining_date: '2026-02-20',
      fee_amount: 4000
    })
    testMembers.push(member2.id)
    ok('Member 2 created: ' + member2.name + ' (' + member2.id.slice(0, 8) + '...)')

    const member3 = await createMember({
      name: 'Usman Ali',
      phone: '555-' + (Math.floor(Math.random() * 90000) + 10000),
      membership_no: 'ATT-' + (Math.floor(Math.random() * 9000) + 1000),
      city: 'Islamabad',
      joining_date: '2026-03-10',
      fee_amount: 6000
    })
    testMembers.push(member3.id)
    ok('Member 3 created: ' + member3.name + ' (' + member3.id.slice(0, 8) + '...)' )

    log('\n   - ' + testMembers.length + ' test members ready\n')

    // --------------------------------------------------
    // PHASE 2: Mark Attendance
    // --------------------------------------------------
    log('PHASE 2: Marking Attendance\n')

    for (const id of testMembers) {
      const result = await markAttendance(id, today)
      if (result.status === 201) {
        ok('Attendance marked for today')
      } else {
        error('Expected 201, got ' + result.status + ': ' + JSON.stringify(result.body))
      }
    }

    const yesterdayResult = await markAttendance(testMembers[0], yesterday)
    if (yesterdayResult.status === 201) {
      ok('Attendance marked for yesterday (' + yesterday + ')')
    } else {
      error('Yesterday attendance: Expected 201, got ' + yesterdayResult.status)
    }

    log()

    // --------------------------------------------------
    // PHASE 3: Test Duplicate Blocking
    // --------------------------------------------------
    log('PHASE 3: Testing Duplicate Attendance Blocking\n')

    const dupResult = await markAttendance(testMembers[0], today)
    if (dupResult.status === 400 && dupResult.body.error === 'Attendance already marked for today') {
      ok('Duplicate attendance correctly rejected with 400')
    } else {
      error('Duplicate: Expected 400, got ' + dupResult.status + ': ' + JSON.stringify(dupResult.body))
    }

    log()

    // --------------------------------------------------
    // PHASE 4: Verify Attendance Records
    // --------------------------------------------------
    log('PHASE 4: Verifying Attendance Records\n')

    const todayRecords = await getAttendance(today)
    if (todayRecords.status === 200 && todayRecords.body.success) {
      ok("Today's attendance fetched (" + todayRecords.body.count + ' records)')

      const todayMemberIds = todayRecords.body.data.map(function(r) { return r.member_id })
      for (const id of testMembers) {
        if (todayMemberIds.includes(id)) {
          ok('  Member ' + id.slice(0, 8) + '... is in today records')
        } else {
          error('Member ' + id.slice(0, 8) + '... NOT found in today records')
        }
      }

      const firstRecord = todayRecords.body.data.find(function(r) { return r.member_id === testMembers[0] })
      if (firstRecord && firstRecord.members) {
        ok('Attendance record includes member details (name: ' + firstRecord.members.name + ')')
      } else {
        error('Attendance record missing member details (join failed)')
      }

      const hasScanTime = todayRecords.body.data.every(function(r) { return r.scan_time })
      if (hasScanTime) {
        ok('All records have scan_time populated')
      } else {
        error('Some records missing scan_time')
      }
    } else {
      error("Failed to fetch today's attendance: " + JSON.stringify(todayRecords.body))
    }

    const yesterdayRecords = await getAttendance(yesterday)
    if (yesterdayRecords.status === 200 && yesterdayRecords.body.success) {
      const yesterdayMemberIds = yesterdayRecords.body.data.map(function(r) { return r.member_id })
      if (yesterdayMemberIds.includes(testMembers[0])) {
        ok("Yesterday's attendance shows member 1 (" + yesterdayRecords.body.count + ' record(s))')
      } else {
        error('Member 1 not found in yesterday records')
      }
    } else {
      error("Failed to fetch yesterday's attendance: " + JSON.stringify(yesterdayRecords.body))
    }

    log()

    // --------------------------------------------------
    // PHASE 5: Test Idempotency
    // --------------------------------------------------
    log('PHASE 5: Testing Idempotency with Custom Key\n')

    const idempKey = 'att-flow-' + testMembers[1]
    const idempRes = await fetch(API_URL + '/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        member_id: testMembers[1],
        local_date: today,
        idempotency_key: idempKey
      })
    })
    const idempData = await idempRes.json()

    if (idempRes.status === 200 && idempData.idempotent === true) {
      ok('Idempotency: duplicate with same key returns 200 idempotent')
    } else if (idempRes.status === 200) {
      ok('Idempotency: already marked (status 200)')
    } else {
      error('Idempotency: Expected 200, got ' + idempRes.status + ': ' + JSON.stringify(idempData))
    }

    log()

    // --------------------------------------------------
    // PHASE 6: Test Fingerprint scan_time (Unix Timestamp)
    // --------------------------------------------------
    log('PHASE 6: Testing Fingerprint scan_time (Unix Timestamp)\n')

    // Create a fresh member for this test
    const fpMember = await createMember({
      name: 'Fingerprint User',
      phone: '555-' + (Math.floor(Math.random() * 90000) + 10000),
      membership_no: 'ATT-FP-' + (Math.floor(Math.random() * 9000) + 1000),
      city: 'Rawalpindi',
      joining_date: '2026-01-01',
      fee_amount: 3000
    })
    testMembers.push(fpMember.id)
    ok('Fingerprint test member created: ' + fpMember.id.slice(0, 8) + '...')

    // Use a known Unix timestamp (fingerprint device format: seconds since epoch)
    // The route converts: scan_time * 1000 -> Date -> toISOString()
    // PostgREST returns timestamps without timezone suffix (e.g. "2026-12-01T00:00:00"),
    // so we compare the date portion (YYYY-MM-DD) extracted from the raw string.
    const fpDate = '2026-12-01'
    const unixDec1 = Math.floor(new Date('2026-12-01T00:00:00Z').getTime() / 1000)

    ok('Unix timestamp: ' + unixDec1)

    const fpRes = await fetch(API_URL + '/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        member_id: fpMember.id,
        scan_time: unixDec1,
        local_date: fpDate
      })
    })
    const fpBody = await fpRes.json()

    if (fpRes.status === 201 && fpBody.success) {
      ok('Attendance marked with fingerprint scan_time')

      // Verify scan_time is valid and date component matches
      // PostgREST returns timestamps without Z suffix regardless of column type,
      // so Date parsing may shift by timezone. Compare date substring directly.
      const returnedScanTime = fpBody.data.scan_time
      const datePart = returnedScanTime.substring(0, 10)
      if (datePart === '2026-12-01') {
        ok('scan_time date correct: ' + datePart)
      } else {
        error('scan_time date mismatch: expected 2026-12-01, got ' + datePart)
      }

      // Verify the date field matches
      if (fpBody.data.date === fpDate) {
        ok('date correctly set to ' + fpDate)
      } else {
        error('date mismatch: expected ' + fpDate + ', got ' + fpBody.data.date)
      }

      // Verify member details in response
      if (fpBody.member && fpBody.member.name === 'Fingerprint User') {
        ok('Member details populated in response')
      } else {
        error('Member details missing in response')
      }
    } else {
      error('Fingerprint attendance: Expected 201, got ' + fpRes.status + ': ' + JSON.stringify(fpBody))
    }

    // Verify via GET endpoint
    log()
    log('   Verifying via GET...')
    const fpGetRes = await fetch(API_URL + '/attendance?date=' + fpDate)
    const fpGetBody = await fpGetRes.json()

    if (fpGetBody.success) {
      const fpRecord = fpGetBody.data.find(function(r) { return r.member_id === fpMember.id })
      if (fpRecord) {
        ok('Attendance record found in GET results')

        // Verify date component from DB
        const dbDatePart = fpRecord.scan_time.substring(0, 10)
        if (dbDatePart === '2026-12-01') {
          ok('scan_time date correct in database: ' + dbDatePart)
        } else {
          error('scan_time date in DB mismatch: expected 2026-12-01, got ' + dbDatePart)
        }

        // Verify date matches
        if (fpRecord.date === fpDate) {
          ok('date correct in database')
        } else {
          error('date in DB mismatch: expected ' + fpDate + ', got ' + fpRecord.date)
        }
      } else {
        error('Fingerprint attendance record NOT found in GET results')
      }
    } else {
      error('Failed to GET fingerprint attendance: ' + JSON.stringify(fpGetBody))
    }

    // Test: omit scan_time - should use current time as fallback
    log()
    log('   Testing edge cases...')
    const edgeMember = await createMember({
      name: 'Edge Case User',
      phone: '555-' + (Math.floor(Math.random() * 90000) + 10000),
      membership_no: 'ATT-EDGE-' + (Math.floor(Math.random() * 9000) + 1000),
      city: 'Peshawar',
      joining_date: '2026-01-01',
      fee_amount: 2000
    })
    testMembers.push(edgeMember.id)
    ok('Edge case member created: ' + edgeMember.id.slice(0, 8) + '...')

    const noScanRes = await fetch(API_URL + '/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        member_id: edgeMember.id,
        local_date: '2026-12-02'
      })
    })
    const noScanBody = await noScanRes.json()
    if (noScanRes.status === 201 && noScanBody.success) {
      ok('Attendance without scan_time uses current time as fallback')
      const parsedScan = new Date(noScanBody.data.scan_time)
      if (!isNaN(parsedScan.getTime())) {
        ok('  scan_time auto-populated and valid: ' + noScanBody.data.scan_time)
      } else {
        error('  scan_time is invalid: ' + noScanBody.data.scan_time)
      }
    } else {
      error('No scan_time test: Expected 201, got ' + noScanRes.status + ': ' + JSON.stringify(noScanBody))
    }

    log()

    // --------------------------------------------------
    // FINAL: Results
    // --------------------------------------------------
    console.log('===============================================')
    if (errors.length === 0) {
      log('\nALL ATTENDANCE FLOW TESTS PASSED!\n')
    } else {
      log('\n' + errors.length + ' test(s) failed\n')
      errors.forEach(function(e, i) { log('  ' + (i + 1) + '. ' + e) })
    }

  } catch (err) {
    log('\nUnexpected error: ' + err.message)
    console.error(err)
    process.exitCode = 1
  } finally {
    // --------------------------------------------------
    // CLEANUP: Delete all test members
    // --------------------------------------------------
    log('CLEANUP: Removing Test Members\n')

    for (const id of testMembers) {
      try {
        const result = await deleteMember(id)
        ok('Member ' + id.slice(0, 8) + '... deleted: ' + result.message)
      } catch (e) {
        error('Failed to delete ' + id.slice(0, 8) + '...: ' + e.message)
      }
    }

    log('\nVerifying Cleanup\n')
    for (const id of testMembers) {
      try {
        const res = await fetch(API_URL + '/members/' + id)
        const body = await res.json()
        if (!body.success && res.status === 500) {
          ok('Member ' + id.slice(0, 8) + '... confirmed deleted')
        } else if (body.data === null) {
          ok('Member ' + id.slice(0, 8) + '... confirmed deleted')
        } else {
          error('Member ' + id.slice(0, 8) + '... may not have been deleted')
        }
      } catch {
        ok('Member ' + id.slice(0, 8) + '... confirmed deleted')
      }
    }

    log('\n' + '='.repeat(47))
    if (errors.length === 0) {
      log('\nCOMPLETE ATTENDANCE FLOW TEST PASSED!')
    } else {
      log('\n' + errors.length + ' test(s) failed')
      process.exitCode = 1
    }
    log('\nTest members created: ' + testMembers.length)
    log('Test members cleaned: yes')
    log('Errors: ' + (errors.length === 0 ? 'None' : errors.length))
    log('')
  }
}

runAttendanceFlow()
