# 🔑 How to Rotate Keys & Setup BRIDGE_API_KEY

This guide walks you through the remaining security steps you need to do manually.

---

## ✅ What I already fixed in code

These are done — you just need to update your `.env` files with new keys:

- ✅ Bridge API now requires `x-bridge-api-key` header
- ✅ Bridge bound to `127.0.0.1` (localhost only)
- ✅ Rate limiting added to middleware
- ✅ Documentation updated

---

## Step 1: Generate a New Shared Secret

Open a terminal and run this command to generate a cryptographically strong random key:

```powershell
# On Windows (PowerShell) — just type this in your terminal:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

This will output something like:
```
a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2
```

**Copy that value** — you'll paste it 3 times in the steps below. I'll refer to it as `<YOUR_NEW_KEY>`.

---

## Step 2: Rotate SERVICE_ROLE_KEY in Supabase Dashboard

> This key gives full database access. Rotating it invalidates the old one.

1. Go to https://supabase.com → log in → select your project
2. In the left sidebar, click **Project Settings** (gear icon)
3. Go to **API** tab
4. Under **Project API keys**, find **`service_role` key**
5. Click **Reveal** then **Copy** the new key
6. Open `D:\GYM\.env.local` in VS Code
7. Find the line `SUPABASE_SERVICE_ROLE_KEY=...` and replace the value with the new key

---

## Step 3: Rotate FINGERPRINT_API_KEY

> This key authenticates the bridge → GymFlow API requests.

### 3a. Update `.env.local` (GymFlow main app)

Open `D:\GYM\.env.local` and:

1. Find `FINGERPRINT_API_KEY=...`
2. Replace the value with `<YOUR_NEW_KEY>` (from Step 1)
3. **Add a new line** below it:
   ```
   BRIDGE_API_KEY=<YOUR_NEW_KEY>
   ```
   (same value, another copy)

Your `.env.local` should now look like:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...public_key...
SUPABASE_SERVICE_ROLE_KEY=eyJ...new_key_from_step2...
FINGERPRINT_API_KEY=a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2
BRIDGE_API_KEY=a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2
```

### 3b. Update `fingerprint-bridge/.env` (bridge service)

Open `D:\GYM\fingerprint-bridge\.env` and:

1. Find `API_KEY=...` — replace with `<YOUR_NEW_KEY>`
2. **Add a new line** for the bridge's own API key:
   ```
   BRIDGE_API_KEY=<YOUR_NEW_KEY>
   ```

Your bridge `.env` should look like:

```env
API_BASE_URL=http://localhost:3000
API_KEY=a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2
BRIDGE_API_KEY=a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2
DEVICE_ID=your-uuid-here
DEVICE_IP=192.168.100.16
DEVICE_PORT=4370
MODE=real
```

---

## Step 4: Start Both Services to Verify

### Terminal 1 — GymFlow
```powershell
cd D:\GYM
npm run dev
```

### Terminal 2 — Fingerprint Bridge
```powershell
cd D:\GYM\fingerprint-bridge
npm run dev
```

If everything is correct:
- ❌ Bridge should **start successfully** (if BRIDGE_API_KEY is missing, it will exit with an error)
- ❌ GymFlow should **load without errors**
- ✅ Visit `http://localhost:3000` → should load the dashboard
- ✅ Visit `http://localhost:5050/health` → should show bridge status

---

## Step 5: Verify the New Auth Works

### Test bridge auth (should succeed):

```powershell
curl -X POST http://127.0.0.1:5050/sync-attendance `
  -H "x-bridge-api-key: <YOUR_NEW_KEY>" `
  -H "Content-Type: application/json"
```

Expected: `{ "success": true/false, ... }` (either way, not a 401)

### Test bridge auth (should fail — wrong key):

```powershell
curl -X POST http://127.0.0.1:5050/sync-attendance `
  -H "x-bridge-api-key: wrong-key" `
  -H "Content-Type: application/json"
```

Expected: `401 Unauthorized`

### Test rate limiting:

```powershell
for ($i=0; $i -lt 15; $i++) {
  curl -X POST http://localhost:3000/api/attendance `
    -H "Content-Type: application/json" `
    -d '{"member_id":"test","local_date":"2026-06-04","idempotency_key":"test123"}'
}
```

After ~10 POST requests, you should start seeing `429 Too Many Requests` responses.

---

## Troubleshooting

| Problem | Likely Cause | Fix |
|---------|-------------|-----|
| Bridge exits: "CRITICAL: BRIDGE_API_KEY is missing" | Forgot to add `BRIDGE_API_KEY` to `fingerprint-bridge/.env` | Add the line and restart |
| GymFlow: "Bridge request failed (401)" | `BRIDGE_API_KEY` in `.env.local` doesn't match `BRIDGE_API_KEY` in `fingerprint-bridge/.env` | Make them the same |
| Bridge: "Sync failed 401" | `API_KEY` in bridge `.env` doesn't match `FINGERPRINT_API_KEY` in main `.env.local` | Make them the same |
| Everything worked before but now broken | You changed some keys but not others | All 3 must match: `FINGERPRINT_API_KEY` = `API_KEY` = `BRIDGE_API_KEY` |

---

## Key Relationship Diagram

```
  ┌──────────────────────────────────┐
  │  .env.local (GymFlow app)        │
  │                                  │
  │  FINGERPRINT_API_KEY ──┐         │
  │                        │         │
  │  BRIDGE_API_KEY ───────┤         │
  └────────────────────────┤────────┘
                           │
  ┌────────────────────────┘────────┐
  │  fingerprint-bridge/.env        │
  │                                 │
  │  API_KEY ───────────────────────┘  (used to auth TO GymFlow)
  │                                 │
  │  BRIDGE_API_KEY ───────────────── (used to auth the bridge server)
  └─────────────────────────────────┘
```

**All 3 values (`FINGERPRINT_API_KEY`, `API_KEY`, `BRIDGE_API_KEY`) should be set to the same random string.**

> 💡 **Tip:** Use a different random string for each variable if you want separate keys per purpose, but for single-PC setup it's simplest to use one key everywhere.
