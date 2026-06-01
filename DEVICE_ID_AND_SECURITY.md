# Security: Bridge Config & Device ID Management

## ✅ Changes Made

### 1. Hidden Bridge Config Endpoints

**BEFORE** ❌
```
GET /api/fingerprint → Exposed sensitive config:
{
  "config": {
    "api_url": "http://localhost:3000",
    "attendance_endpoint": "/api/fingerprint/scan"
  }
}
```

**AFTER** ✅
```
GET /api/fingerprint → No sensitive data:
{
  "success": true,
  "status": "Bridge endpoint active",
  "message": "Use /api/fingerprint/scan for attendance marking"
}
```

### 2. Secured Device Settings Endpoints

All sensitive device configuration endpoints now require `FINGERPRINT_API_KEY` authentication:

```typescript
// Requires API key validation
GET /api/device-settings
POST /api/device-settings
POST /api/device-settings/test-connection
```

**Security Layer:**
```
POST /api/device-settings
Header: "x-fingerprint-api-key: gymflow_local_bridge_key_2026"
→ Only bridge process with correct API key can access
→ Exposes DEVICE_ID, IP, port, etc. (sensitive data)
```

### 3. Public vs Protected Endpoints

| Endpoint | Public | Requires Auth | Exposes |
|----------|--------|---------------|---------|
| POST /api/fingerprint/scan | ✅ | ❌ | Member name, attendance status |
| GET /api/fingerprint | ✅ | ❌ | Just status message |
| GET /api/device-settings | ❌ | ✅ | DEVICE_ID, IP, port |
| POST /api/device-settings | ❌ | ✅ | Config details |
| GET /api/fingerprint/status | ❌ | ✅ | Device health |
| GET /api/fingerprint/logs | ❌ | ✅ | Sync history |

---

## 📌 Device ID Behavior

### What is Device ID?

**Device ID = Unique Hardware Identifier**

For fingerprint scanners (like ZKTeco K70):
- Generated when device first connects
- Based on hardware serial number or MAC address
- Remains **constant** across reboots
- Remains **constant** across network reconnections
- **Only changes** if you physically replace the hardware

### Device ID Lifecycle

```
First Connection:
  → Bridge detects ZKTeco K70 scanner
  → Generates Device ID: 8807f64b-fcc5-4f5d-83ba-6ef70375ae1c
  → Stores in fingerprint_devices table
  → Saves to fingerprint-bridge/.env

Device Reconnection (power cycle, network restart):
  ✅ Device ID REMAINS THE SAME
  → Same hardware = same ID
  → No re-enrollment needed
  → Fingerprints still recognized

Device Replacement (new scanner):
  ❌ Device ID CHANGES
  → New hardware = new Device ID
  → New .env configuration needed
  → Need to re-enroll all members
```

### Why Device ID Doesn't Change?

```
Device ID = f(hardware_serial_number, mac_address)
           = fixed function of hardware characteristics
           = constant for the same device

Similar to:
  - Computer MAC address (doesn't change with reboot)
  - USB device serial number (doesn't change with reconnection)
  - Phone IMEI (doesn't change even if you change SIM)
```

---

## 🔒 Security Best Practices

### 1. Protect DEVICE_ID

⚠️ **Do NOT expose DEVICE_ID publicly**

```javascript
// ❌ BAD - Exposes DEVICE_ID
GET /api/bridge/config → Returns DEVICE_ID

// ✅ GOOD - Requires authentication
GET /api/device-settings + API_KEY → Returns DEVICE_ID
```

### 2. API Key Management

Store securely in `fingerprint-bridge/.env`:
```
FINGERPRINT_API_KEY=gymflow_local_bridge_key_2026
DEVICE_ID=8807f64b-fcc5-4f5d-83ba-6ef70375ae1c
DEVICE_IP=192.168.100.16
```

Never commit this file to git!

### 3. Network Security

Device scanner should be on **local network only**:
```
192.168.100.16:4370 (Local network)
NOT exposed to internet
NOT accessible from outside LAN
```

---

## 📋 Configuration Checklist

### Setup Device ID (First Time)

```bash
# 1. Start bridge (it auto-detects device)
cd fingerprint-bridge
npm run dev:bridge

# 2. Check logs for generated DEVICE_ID
# Output: "DEVICE_ID=8807f64b-fcc5-4f5d-83ba-6ef70375ae1c"

# 3. Copy to .env file
echo "DEVICE_ID=8807f64b-fcc5-4f5d-83ba-6ef70375ae1c" >> .env

# 4. Device ID is now persistent across reboots ✅
```

### Handling Device Replacement

```bash
# 1. Replace old scanner with new one
# 2. Start bridge (it will detect new hardware)
# 3. Generate new .env with new DEVICE_ID
# 4. Delete old device from database:

DELETE FROM fingerprint_devices WHERE device_id = 'old-id'

# 5. Re-enroll members on new device
```

---

## 🧪 Testing Device ID Persistence

```bash
# Test 1: Power cycle the device
1. Run bridge: npm run dev:bridge
2. Get DEVICE_ID: grep DEVICE_ID fingerprint-bridge/.env
3. Power off scanner for 30 seconds
4. Power on scanner
5. Check DEVICE_ID → Should be SAME ✅

# Test 2: Restart bridge (leave device powered on)
1. Get DEVICE_ID: grep DEVICE_ID fingerprint-bridge/.env → ID_1
2. Kill bridge: Ctrl+C
3. Restart: npm run dev:bridge
4. Get DEVICE_ID → Should be SAME as ID_1 ✅

# Test 3: Network reconnection
1. Disconnect device from network
2. Wait 30 seconds
3. Reconnect to network
4. Check DEVICE_ID → Should be SAME ✅
```

---

## 🛡️ Endpoint Security Validation

### Protected Endpoint Test

```bash
# ❌ Without API Key (should fail)
curl -X POST http://localhost:3000/api/device-settings \
  -H "Content-Type: application/json" \
  -d '{"device_name": "K70"}'
→ 403 Forbidden: "API key required"

# ✅ With API Key (should work)
curl -X POST http://localhost:3000/api/device-settings \
  -H "Content-Type: application/json" \
  -H "x-fingerprint-api-key: gymflow_local_bridge_key_2026" \
  -d '{"device_name": "K70"}'
→ 200 OK with device config
```

### Public Endpoint Test

```bash
# ✅ Public (no auth needed)
curl http://localhost:3000/api/fingerprint/scan
→ 200 OK

curl http://localhost:3000/api/fingerprint
→ 200 OK (just status, no config)
```

---

## 📊 Device ID vs Member Fingerprints

Don't confuse:

| Field | Scope | Changes | Purpose |
|-------|-------|---------|---------|
| **Device ID** | Hardware identifier | Never* | Identifies which scanner |
| **Member ID** | Member unique ID | Never | Who is the person |
| **Fingerprint Template** | Member's finger data | Per enrollment | Biometric match |

*Only changes if you replace the scanner hardware

---

## Summary

✅ **Bridge config is now secured:**
- DEVICE_ID no longer exposed in public endpoints
- Device settings require authentication
- Prevents unauthorized device access

✅ **Device ID stays the same:**
- Same Device ID across reboots
- Same Device ID across network reconnections
- Different Device ID only if you replace hardware
- Ensures members don't need re-enrollment after restarts

🔒 **Security layers added:**
- API key validation on sensitive endpoints
- Clear separation of public vs protected endpoints
- Configuration never exposed publicly
