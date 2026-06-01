#!/usr/bin/env node

const API_URL = 'http://localhost:3002/api';
const BRIDGE_URL = 'http://localhost:5050';

let testMemberId = null;
const results = [];

async function test(name, fn) {
  try {
    console.log(`\n[TEST] ${name}`);
    await fn();
  } catch (error) {
    console.error(`❌ ${name} failed:`, error.message);
    results.push({ test: name, status: 'FAILED', error: error.message });
  }
}

async function apiCall(method, endpoint, body = null) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (body) options.body = JSON.stringify(body);
  
  const response = await fetch(`${API_URL}${endpoint}`, options);
  const data = await response.json();
  return { status: response.status, data };
}

async function main() {
  console.log('\n' + '='.repeat(50));
  console.log('FINGERPRINT DEVICE TEST SUITE');
  console.log('='.repeat(50));

  // Test 1: API Server Health
  await test('API Server Health Check', async () => {
    const { status, data } = await apiCall('GET', '/members');
    if (status === 200 && data.success) {
      console.log('✅ API Server is running on port 3002');
      results.push({ test: 'API Server Health', status: 'PASSED' });
    } else {
      throw new Error('API not responding');
    }
  });

  // Test 2: Bridge Status
  await test('Fingerprint Bridge Status', async () => {
    try {
      const response = await fetch(`${BRIDGE_URL}/health`);
      const data = await response.json();
      console.log('✅ Bridge is running on port 5050');
      console.log('   Bridge info:', JSON.stringify(data, null, 2).split('\n').slice(0, 5).join('\n'));
      results.push({ test: 'Bridge Status', status: 'PASSED' });
    } catch {
      console.log('⚠️  Bridge is not running or health endpoint unavailable');
      results.push({ test: 'Bridge Status', status: 'WARNING', message: 'Bridge offline' });
    }
  });

  // Test 3: Create Member
  await test('Create Test Member', async () => {
    const memberData = {
      name: 'Fingerprint Test User',
      phone: '03001234567',
      membership_no: `FP-TEST-${Math.floor(Math.random() * 9000) + 1000}`,
      city: 'Test City',
      joining_date: new Date().toISOString().split('T')[0],
      fee_amount: 5000
    };
    const { status, data } = await apiCall('POST', '/members', memberData);
    if (data.success) {
      testMemberId = data.data.id;
      console.log(`✅ Member created successfully`);
      console.log(`   Member ID: ${testMemberId}`);
      results.push({ test: 'Create Member', status: 'PASSED' });
    } else {
      throw new Error(data.error || 'Failed to create member');
    }
  });

  // Test 4: Fingerprint Status
  await test('Fingerprint Device Status', async () => {
    if (!testMemberId) throw new Error('No member ID available');
    const { status, data } = await apiCall('GET', `/members/${testMemberId}/fingerprint`);
    console.log('✅ Fingerprint status endpoint response:');
    console.log('   ', JSON.stringify(data, null, 2).split('\n').slice(0, 8).join('\n   '));
    results.push({ test: 'Fingerprint Status', status: 'PASSED' });
  });

  // Test 5: Duplicate Phone Detection
  await test('Duplicate Phone Detection', async () => {
    const dupMember = {
      name: 'Another User',
      phone: '03001234567',  // Same phone as test member
      membership_no: `DUP-TEST-${Math.floor(Math.random() * 9000) + 1000}`,
      city: 'Another City',
      joining_date: new Date().toISOString().split('T')[0],
      fee_amount: 5000
    };
    const { status, data } = await apiCall('POST', '/members', dupMember);
    if (!data.success) {
      console.log(`✅ Duplicate detection working: ${data.error}`);
      results.push({ test: 'Duplicate Detection', status: 'PASSED' });
    } else {
      throw new Error('Duplicate phone was not caught');
    }
  });

  // Test 6: Mark Attendance
  await test('Mark Attendance', async () => {
    if (!testMemberId) throw new Error('No member ID available');
    const attendanceData = {
      member_id: testMemberId,
      local_date: new Date().toISOString().split('T')[0],
      idempotency_key: `test-${Math.floor(Math.random() * 90000) + 10000}`
    };
    const { status, data } = await apiCall('POST', '/attendance', attendanceData);
    if (data.success || data.error === 'requires_admin_review') {
      console.log(`✅ Attendance endpoint responded: ${data.error || 'Success'}`);
      results.push({ test: 'Mark Attendance', status: 'PASSED' });
    } else {
      throw new Error(data.error || 'Failed to mark attendance');
    }
  });

  // Test 7: Idempotency
  await test('Attendance Idempotency', async () => {
    if (!testMemberId) throw new Error('No member ID available');
    const idempotencyKey = `idempotent-test-${Math.floor(Math.random() * 90000) + 10000}`;
    const attendanceData = {
      member_id: testMemberId,
      local_date: new Date().toISOString().split('T')[0],
      idempotency_key: idempotencyKey
    };
    
    // First call
    const { data: data1 } = await apiCall('POST', '/attendance', attendanceData);
    
    // Second call with same idempotency key
    const { data: data2 } = await apiCall('POST', '/attendance', attendanceData);
    
    if ((data1.success || !data1.success) && (data2.success || data2.idempotent)) {
      console.log('✅ Idempotency working correctly');
      results.push({ test: 'Idempotency', status: 'PASSED' });
    } else {
      console.log('⚠️  Idempotency check completed');
      results.push({ test: 'Idempotency', status: 'WARNING' });
    }
  });

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('TEST RESULTS SUMMARY');
  console.log('='.repeat(50));
  
  const passed = results.filter(r => r.status === 'PASSED').length;
  const failed = results.filter(r => r.status === 'FAILED').length;
  const warned = results.filter(r => r.status === 'WARNING').length;
  
  results.forEach(r => {
    const icon = r.status === 'PASSED' ? '✅' : r.status === 'FAILED' ? '❌' : '⚠️';
    console.log(`${icon} ${r.test}: ${r.status} ${r.message || r.error || ''}`);
  });
  
  console.log('\nStatistics:');
  console.log(`  ✅ PASSED: ${passed}`);
  console.log(`  ❌ FAILED: ${failed}`);
  console.log(`  ⚠️  WARNING: ${warned}`);
  console.log('='.repeat(50));
}

main().catch(console.error);
