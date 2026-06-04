import http from 'k6/http'
import { check, sleep, group } from 'k6'
import { Rate, Trend } from 'k6/metrics'

// Custom metrics
const errorRate = new Rate('errors')
const memberApiLatency = new Trend('member_api_latency')
const attendanceApiLatency = new Trend('attendance_api_latency')
const paymentApiLatency = new Trend('payment_api_latency')

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'

export const options = {
  stages: [
    { duration: '30s', target: 5 },   // Ramp up to 5 users
    { duration: '1m', target: 10 },    // Ramp up to 10 users
    { duration: '30s', target: 15 },   // Spike to 15 users
    { duration: '1m', target: 10 },    // Stay at 10
    { duration: '30s', target: 0 },    // Ramp down
  ],
  thresholds: {
    errors: ['rate<0.1'],               // Error rate < 10%
    http_req_duration: ['p(95)<2000'],  // 95% of requests under 2s
    member_api_latency: ['p(95)<1500'],
    attendance_api_latency: ['p(95)<1500'],
  },
}

const MEMBER_PAYLOAD = {
  name: `Load Test User ${__VU}-${__ITER}`,
  phone: `0300${String(__VU).padStart(3, '0')}${String(__ITER).padStart(5, '0')}`,
  membership_no: `LT-${__VU}-${__ITER}`,
  city: 'Karachi',
  joining_date: '2026-06-01',
  fee_amount: 5000,
}

export default function () {
  group('Member API', () => {
    // List members
    const listRes = http.get(`${BASE_URL}/api/members`, {
      headers: { 'Content-Type': 'application/json' },
    })
    check(listRes, { 'list members status 200': (r) => r.status === 200 })
    memberApiLatency.add(listRes.timings.duration)
    errorRate.add(listRes.status !== 200)

    // Create member
    const createRes = http.post(`${BASE_URL}/api/members`, JSON.stringify({
      ...MEMBER_PAYLOAD,
      membership_no: `LT-${__VU}-${__ITER}-${Date.now()}`,
    }), {
      headers: { 'Content-Type': 'application/json' },
    })
    check(createRes, {
      'create member status 201': (r) => r.status === 201,
      'create member has id': (r) => {
        try { return JSON.parse(r.body).data?.id } catch { return false }
      },
    })
    memberApiLatency.add(createRes.timings.duration)
    errorRate.add(createRes.status !== 201)

    const memberId = createRes.json('data.id')
    if (memberId) {
      // Mark attendance
      group('Attendance API', () => {
        const today = new Date().toISOString().split('T')[0]
        const attRes = http.post(`${BASE_URL}/api/attendance`, JSON.stringify({
          member_id: memberId,
          local_date: today,
        }), {
          headers: { 'Content-Type': 'application/json' },
        })
        check(attRes, {
          'mark attendance status 201': (r) => r.status === 201,
        })
        attendanceApiLatency.add(attRes.timings.duration)
        errorRate.add(attRes.status !== 201)

        // Record payment
        group('Payment API', () => {
          const currentMonth = today.substring(0, 7)
          const payRes = http.post(`${BASE_URL}/api/payments`, JSON.stringify({
            member_id: memberId,
            amount: 5000,
            payment_date: today,
            month: currentMonth,
          }), {
            headers: { 'Content-Type': 'application/json' },
          })
          check(payRes, {
            'record payment status 201': (r) => r.status === 201,
          })
          paymentApiLatency.add(payRes.timings.duration)
          errorRate.add(payRes.status !== 201)
        })
      })
    }

    sleep(1)
  })
}
