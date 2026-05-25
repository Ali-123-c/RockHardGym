const assert = require('assert')

const API_URL = 'http://localhost:3000/api'
let testMemberId = null

const runTests = async () => {
  console.log('--- Starting Automated Integration Tests ---')

  try {
    // 1. Create a Test Member
    console.log('1. Testing Member Creation...')
    // We set the joining date to 15 days ago to trigger the 10-day absence rule
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

    // 2. Test 10-Day Absence Blocking
    console.log('\n2. Testing 10-Day Absence Rule...')
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
    assert.strictEqual(attendanceData.success, false, 'Attendance should be blocked')
    assert.strictEqual(attendanceData.error, 'requires_admin_review', 'Should require admin review')
    console.log('   ✅ Attendance correctly blocked for 10-day absence')

    // 3. Test Admin Exemption
    console.log('\n3. Testing Admin Exemption Flow...')
    const exemptRes = await fetch(`${API_URL}/members/${testMemberId}/exempt`, {
      method: 'POST'
    })
    const exemptData = await exemptRes.json()
    assert.strictEqual(exemptData.success, true, 'Exemption should succeed')
    console.log('   ✅ Admin successfully exempted the member')

    // 4. Test Attendance After Exemption
    console.log('\n4. Testing Attendance Post-Exemption...')
    const attendanceRetryRes = await fetch(`${API_URL}/attendance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        member_id: testMemberId,
        local_date: localDate,
        client_timezone: clientTimezone
      })
    })
    const attendanceRetryData = await attendanceRetryRes.json()
    assert.strictEqual(attendanceRetryData.success, true, 'Attendance should succeed now')
    console.log('   ✅ Attendance marked successfully')

    // 5. Test Payment Logic
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

    console.log('\n🎉 All Tests Passed Successfully! 🎉\n')

  } catch (error) {
    console.error('\n❌ Test Failed!')
    console.error(error.message || error)
    process.exitCode = 1
  } finally {
    // 6. Cleanup
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
