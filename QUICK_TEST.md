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
