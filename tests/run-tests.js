const assert = require('assert')

const API_URL = 'http://localhost:3000/api'
let testMemberId = null

const runTests = async () => {
  console.log('--- Starting Automated Integration Tests ---')
  console.log('Testing the current flow: member creation → attendance → payments\n')

  try {
    // ── 1. Create a Test Member ──────────────────────────────────────
    console.log('1. Testing Member Creation...')
    const joiningDate = new Date()
    joiningDate.setDate(joiningDate.getDate() - 15)
    
    const memberRes = await fetch(`${API_URL}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Automated Test User',
        phone: '00000000000',
        membership_no: `TEST-${Math.floor(Math.random()*1000)}`,
        city: 'Test City',
        joining_date: joiningDate.toISOString().split('T')[0],
        fee_amount: 5000
      })
    })
    const memberData = await memberRes.json()
    assert.strictEqual(memberData.success, true, 'Member should be created successfully')
    testMemberId = memberData.data.id
    console.log('   ✅ Member created successfully: ' + testMemberId)

    // ── 2. Mark Attendance (no 10-day restriction) ───────────────────
    console.log('\n2. Testing Attendance Marking...')
    const localDate = new Date().toLocaleDateString('en-CA')
    const clientTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone

    const attendanceRes = await fetch(`${API_URL}/attendance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        member_id: testMemberId,
        local_date: localDate,
        client_timezone: clientTimezone
      })
    })
    const attendanceData = await attendanceRes.json()
    assert.strictEqual(attendanceRes.status, 201, 'Attendance should return 201')
    assert.strictEqual(attendanceData.success, true, 'Attendance should succeed')
    console.log('   ✅ Attendance marked successfully')

    // ── 3. Test Idempotency (duplicate attendance with same key) ─────
    console.log('\n3. Testing Attendance Idempotency...')
    const idempotencyKey = `test-idemp-${testMemberId}`
    
    const idempotentRes = await fetch(`${API_URL}/attendance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        member_id: testMemberId,
        local_date: localDate,
        idempotency_key: idempotencyKey
      })
    })
    const idempotentData = await idempotentRes.json()
    // First call — should succeed normally
    assert.strictEqual(idempotentData.success, true, 'First attendance call should succeed')
    
    // Second call with same key — should return 200 idempotent
    const idempotentRes2 = await fetch(`${API_URL}/attendance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        member_id: testMemberId,
        local_date: localDate,
        idempotency_key: idempotencyKey
      })
    })
    const idempotentData2 = await idempotentRes2.json()
    assert.strictEqual(idempotentRes2.status, 200, 'Idempotent retry should return 200')
    assert.strictEqual(idempotentData2.idempotent, true, 'Should be marked as idempotent')
    console.log('   ✅ Idempotency works correctly')

    // ── 4. Test Duplicate Phone Conflict ─────────────────────────────
    console.log('\n4. Testing Duplicate Phone Conflict...')
    const dupRes = await fetch(`${API_URL}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Duplicate User',
        phone: '00000000000',  // Same phone as test member
        membership_no: `TEST-DUP-${Math.floor(Math.random()*1000)}`,
        city: 'Duplicate City',
        joining_date: new Date().toISOString().split('T')[0],
        fee_amount: 3000
      })
    })
    const dupData = await dupRes.json()
    assert.strictEqual(dupRes.status, 409, 'Duplicate phone should return 409')
    assert.strictEqual(dupData.success, false, 'Should return success: false')
    console.log('   ✅ Duplicate phone correctly rejected with 409')

    // ── 5. Record Payment ────────────────────────────────────────────
    console.log('\n5. Testing Payment Processing...')
    const now = new Date()
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

    const paymentRes = await fetch(`${API_URL}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        member_id: testMemberId,
        amount: 5000,
        payment_date: localDate,
        month: monthStr
      })
    })
    const paymentData = await paymentRes.json()
    assert.strictEqual(paymentData.success, true, 'Payment should be recorded')
    console.log('   ✅ Payment recorded successfully')
    
    // Verify Payment exists in list
    const fetchPaymentsRes = await fetch(`${API_URL}/payments?month=${monthStr}`)
    const fetchPaymentsData = await fetchPaymentsRes.json()
    const foundPayment = fetchPaymentsData.data.find(p => p.member_id === testMemberId)
    assert.ok(foundPayment, 'Payment should be in the history')
    console.log('   ✅ Payment verified in history')

    // ── 6. Read back attendance ──────────────────────────────────────
    console.log('\n6. Verifying Attendance History...')
    const fetchAttendanceRes = await fetch(`${API_URL}/attendance?date=${localDate}`)
    const fetchAttendanceData = await fetchAttendanceRes.json()
    assert.strictEqual(fetchAttendanceData.success, true, 'Attendance fetch should succeed')
    const foundAttendance = fetchAttendanceData.data.find(a => a.member_id === testMemberId)
    assert.ok(foundAttendance, 'Attendance should appear in the records')
    console.log('   ✅ Attendance confirmed in history')

    console.log('\n🎉 All Tests Passed Successfully! 🎉\n')

  } catch (error) {
    console.error('\n❌ Test Failed!')
    console.error(error.message || error)
    process.exitCode = 1
  } finally {
    // ── 7. Cleanup ──────────────────────────────────────────────────
    if (testMemberId) {
      console.log('Cleaning up test data...')
      try {
        await fetch(`${API_URL}/members/${testMemberId}`, { method: 'DELETE' })
        console.log('✅ Test member deleted from database')
      } catch(e) {
        console.error('Failed to clean up test member:', e.message)
      }
    }
  }
}

runTests()
