# Quick Test Guide - API Robustness

## What Was Fixed

✅ **Fingerprint endpoint returning 503 when marking attendance**
- Added retry logic with exponential backoff
- Added 8-second timeout for bridge requests
- Graceful fallback when bridge is offline

✅ **Duplicate phone/membership not caught**
- Pre-check for duplicates before insertion
- Returns HTTP 409 (Conflict) instead of confusing 400

✅ **Attendance marking failing intermittently**
- Retry logic for transient database failures
- Idempotency support to avoid duplicate handling issues

## Quick Tests

### Test 1: Check Fingerprint Status (No Bridge Needed)
```bash
# Get a member ID first
curl http://localhost:3000/api/members | jq '.data[0].id'

# Check fingerprint status
MEMBER_ID="<paste-id-from-above>"
curl http://localhost:3000/api/members/$MEMBER_ID/fingerprint
```

**Expected:**
- If bridge is running: `device.onDevice: true/false`
- If bridge is DOWN: `device.bridgeStatus: "offline"` (returns 200, not 503!)

---

### Test 2: Register New Member (Duplicate Test)
```bash
# First registration - should succeed
curl -X POST http://localhost:3000/api/members \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "phone": "03009999999",
    "membership_no": "TEST001",
    "city": "Karachi",
    "joining_date": "2026-05-31",
    "fee_amount": 5000
  }'

# Try duplicate phone - should get 409 Conflict (not 400!)
curl -X POST http://localhost:3000/api/members \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Doe",
    "phone": "03009999999",
    "membership_no": "TEST002",
    "city": "Lahore",
    "joining_date": "2026-05-31",
    "fee_amount": 5000
  }'
```

**Expected:**
- First: Status 201 Created ✓
- Second: Status 409 Conflict ✓ (not 400)

---

### Test 3: Mark Attendance (Idempotency Test)
```bash
# Get member ID
MEMBER_ID="<member-uuid>"

# Mark attendance (first time)
curl -X POST http://localhost:3000/api/attendance \
  -H "Content-Type: application/json" \
  -d '{
    "member_id": "'$MEMBER_ID'",
    "local_date": "2026-05-31",
    "idempotency_key": "test-key-001"
  }'

# Mark same attendance again (same idempotency_key) - should NOT error!
curl -X POST http://localhost:3000/api/attendance \
  -H "Content-Type: application/json" \
  -d '{
    "member_id": "'$MEMBER_ID'",
    "local_date": "2026-05-31",
    "idempotency_key": "test-key-001"
  }'
```

**Expected:**
- First: Status 201 Created ✓
- Second: Status 200 OK with `"idempotent": true` ✓ (not 400 error!)

---

### Test 4: Mark Attendance (Different idempotency key - Should Error)
```bash
# Mark attendance without idempotency_key first
curl -X POST http://localhost:3000/api/attendance \
  -H "Content-Type: application/json" \
  -d '{
    "member_id": "'$MEMBER_ID'",
    "local_date": "2026-05-32"
  }'

# Try to mark same date without idempotency_key - should error
curl -X POST http://localhost:3000/api/attendance \
  -H "Content-Type: application/json" \
  -d '{
    "member_id": "'$MEMBER_ID'",
    "local_date": "2026-05-32"
  }'
```

**Expected:**
- First: Status 201 Created ✓
- Second: Status 400 Error "Attendance already marked" ✓

---

## Common Error Codes (Before vs After)

| Scenario | Before | After |
|----------|--------|-------|
| Bridge offline | 503 Service Unavailable | 200 OK (with offline status) |
| Duplicate phone | 400 Bad Request | 409 Conflict |
| Duplicate attendance (same key) | 400 Bad Request | 200 OK (idempotent) |
| Duplicate attendance (diff key) | 400 Bad Request | 400 Bad Request |
| DB temporarily unavailable | 500 Error | 200 OK (after retries) |
| Bridge timeout | Hangs 30s | 503 after 8s (with retry) |

---

## Logs to Watch For

When testing, check the server console for:

✅ Good signs:
```
Bridge request retry 1/2
Bridge request retry 2/2
Database retry for member lookup
Successfully marked attendance
```

❌ Bad signs:
```
GET /fingerprint error: Connection refused
Failed after all retries
```

---

## What To Tell Your Team

**Before:** "The fingerprint attendance system fails randomly when bridge is restarting. Members can't mark attendance."

**After:** "The system now automatically retries failed requests. Even if bridge goes down temporarily, the UI gets a graceful error message instead of a 503 timeout. For offline fingerprint scenarios, attendance is queued and syncs when bridge comes back online."

---

## Implementation Summary

| File | Change | Impact |
|------|--------|--------|
| `bridge-client.ts` | Timeout (8s) + Retry (max 2x) | No more hangs, auto-recovery |
| `fingerprint/route.ts` | Try-catch with fallback | Graceful offline handling |
| `attendance/route.ts` | Retry (3x) + Idempotency | Survives transient DB issues |
| `members/route.ts` | Duplicate check + Retry | Clear error codes + resilience |
| `members/[id]/route.ts` | Retry + Conflict handling | Safe updates + retries |

---

## Next Steps

1. Run the quick tests above
2. Verify bridge reconnects gracefully
3. Try with 5-10 concurrent attendance scans
4. Check logs for no "Failed after retries" messages
5. Deploy to production with confidence!
