# Deploy GymFlow on Vercel (with local fingerprint bridge)

The **web app** runs on Vercel. The **fingerprint bridge** must stay on the gym PC (same LAN as the ZKTeco device). Vercel cannot reach your device IP directly.

## Architecture

```
[Vercel] Next.js app  ←── HTTPS ──  [Gym PC] fingerprint-bridge  ←── TCP ──  ZKTeco
```

## 1. Push code & deploy on Vercel

1. Code is on GitHub: connect the repo in [Vercel Dashboard](https://vercel.com).
2. Framework: **Next.js** (auto-detected).
3. Root directory: project root (`d:\GYM` / repo root).

## 2. Environment variables (Vercel project → Settings → Environment Variables)

| Variable | Value |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `NEXT_PUBLIC_APP_URL` | `https://YOUR-APP.vercel.app` |
| `FINGERPRINT_API_KEY` | Same secret as bridge `API_KEY` |
| `FINGERPRINT_BRIDGE_URL` | See below |

### `FINGERPRINT_BRIDGE_URL` on Vercel

Enrollment buttons call the bridge from the **server**. Vercel cannot use `http://localhost:5050` (that is Vercel’s server, not your gym PC).

**Options:**

| Setup | `FINGERPRINT_BRIDGE_URL` | Enrollment from Vercel UI |
|-------|--------------------------|---------------------------|
| **Local testing** | `http://localhost:5050` | Use `npm run dev` on gym PC only |
| **Production + tunnel** | Public URL to bridge (e.g. ngrok `https://xxx.ngrok.io`) | Works if tunnel runs on gym PC |
| **Production (recommended)** | Leave unset or dummy; use bridge sync only | Enroll on device menu; sync via bridge |

Attendance still syncs if the **bridge on the gym PC** points to Vercel:

```env
# fingerprint-bridge/.env on gym PC
API_BASE_URL=https://YOUR-APP.vercel.app
API_KEY=<same as FINGERPRINT_API_KEY on Vercel>
```

## 3. Gym PC — bridge `.env`

```env
API_BASE_URL=https://YOUR-APP.vercel.app
API_KEY=<same as Vercel FINGERPRINT_API_KEY>
DEVICE_ID=<uuid from Admin → Devices>
DEVICE_IP=192.168.100.16
DEVICE_PORT=4370
MODE=real
```

Run on gym PC:

```powershell
cd d:\GYM\fingerprint-bridge
npm install
npm run dev
```

## 4. Supabase

Run SQL in Supabase (if not done):

- `database/schema.sql`
- `database/fingerprint_schema.sql`
- `src/lib/security.sql`

## 5. Test checklist

| Test | Where |
|------|--------|
| Login / members / payments | `https://YOUR-APP.vercel.app` |
| Device connection test | Gym PC with `npm run dev` OR tunnel |
| Fingerprint enroll UI | Gym PC local dev, or bridge tunnel URL on Vercel |
| Scan → attendance | Bridge running on gym PC → sync to Vercel API |

## 6. Redeploy

After each `git push` to `main`, Vercel redeploys automatically if Git integration is enabled.
