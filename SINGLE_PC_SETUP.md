# Single-PC setup (reception desk)

Use **one Windows PC** for the admin browser, GymFlow app, and fingerprint bridge. The ZKTeco device connects to the same router/switch via Ethernet.

```
┌─────────────────────────────────────────┐
│  Reception PC (this computer)           │
│  • Browser → http://localhost:3000      │
│  • npm run dev        (GymFlow)         │
│  • npm run dev:bridge (fingerprint)     │
└──────────────┬──────────────────────────┘
               │ TCP port 4370
               ▼
        ZKTeco device (LAN IP e.g. 192.168.1.100)
```

## 1. Network

1. Plug the fingerprint device into the router/switch (Ethernet).
2. On the device: **Menu → Comm → Ethernet** — note **IP**, **port** (usually **4370**), **comm key** (often **0**).
3. Set a **static IP** on the device or reserve DHCP on your router.
4. On this PC, test in PowerShell:

```powershell
ping 192.168.1.100
Test-NetConnection -ComputerName 192.168.1.100 -Port 4370
```

Port **4370 open** matters more than ping.

## 2. Environment files

**Root** — copy `.env.local.example` → `.env.local` and fill Supabase keys.

**Bridge** — copy `fingerprint-bridge/.env.example` → `fingerprint-bridge/.env`:

| Variable | Single-PC value |
|----------|-----------------|
| `API_BASE_URL` | `http://localhost:3000` |
| `API_KEY` | Same string as `FINGERPRINT_API_KEY` in `.env.local` |
| `BRIDGE_API_KEY` | **Same** as `API_KEY` (shared secret that secures the bridge's own API) |
| `DEVICE_IP` | IP from device menu |
| `DEVICE_PORT` | `4370` (or device setting) |
| `DEVICE_ID` | UUID after saving in Admin → Devices |
| `MODE` | `real` |

Generate one shared secret, e.g. `openssl rand -hex 32` or any long random string.

> **Security note:** The bridge API now requires authentication via `x-bridge-api-key` header on every request (except `/health`).
> The bridge also binds to `127.0.0.1` (localhost only) — it is NOT accessible from other devices on the network.

## 3. Database

In Supabase SQL Editor, run:

1. `database/schema.sql`
2. `database/fingerprint_schema.sql`
3. `src/lib/security.sql` (locks down public access)

## 4. Register device in the app

1. Start app: `npm run dev`
2. Log in → **Devices**
3. Enter device **IP**, **port**, **communication key** → **Save**
4. Copy **Device ID** shown on the page into `fingerprint-bridge/.env` as `DEVICE_ID`
5. **Test Connection** — should show port open (runs from this PC, correct for single-PC)

## 5. Start both services

**Option A — one command (opens two windows):**

```powershell
.\scripts\start-single-pc.ps1
```

**Option B — two terminals:**

```powershell
# Terminal 1
cd d:\GYM
npm run dev

# Terminal 2
cd d:\GYM\fingerprint-bridge
npm install
npm run dev
```

## 6. Verify

| Check | URL / action |
|-------|----------------|
| App | http://localhost:3000 |
| Bridge health | http://localhost:5050/health → `"state": "online"` |
| Manual sync | `Invoke-WebRequest -Method POST http://localhost:5050/sync-attendance -Headers @{"x-bridge-api-key"="your_key"}` |
| Scan test | Scan finger on device, wait up to 5 min (or run manual sync) |

## 7. Register fingerprint & mark attendance

1. Add member in **Members** (note the **membership number**, e.g. `1001`).
2. Open the member profile → **Fingerprint enrollment** section.
3. Click **Register on device** (creates user on ZKTeco with that ID).
4. Click **Start fingerprint enroll** → scan the **same finger 3 times** on the device.
5. Member scans at the gym → bridge syncs every 5 min, or click **Sync attendance now**.

Device user ID must equal **`membership_no`** (e.g. `1001` on device = member `1001` in the app).

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Bridge cannot connect to device | Wrong `DEVICE_IP`/port; PC not on same LAN; firewall |
| Sync returns 401 | `API_KEY` ≠ `FINGERPRINT_API_KEY` |
| Sync works, no attendance | `DEVICE_ID` wrong; `membership_no` mismatch |
| Test Connection fails | Fix IP/port first; use bridge `/health` as second check |
