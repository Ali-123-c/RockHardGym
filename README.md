# GymFlow - Simple Gym Management System

A minimal, working gym management system built with Next.js 15, TypeScript, Tailwind CSS, and Supabase. Features fingerprint attendance tracking via USB device integration.

## Quick Start

### 1. Prerequisites
- Node.js 18+ (Download from https://nodejs.org/)
- Supabase account (https://supabase.com - free tier available)

### 2. Setup

#### Clone and Install
```bash
# Navigate to project
cd GYM

# Install dependencies
npm install
# or
yarn install
# or
pnpm install
```

#### Configure Supabase
1. Create a new project at https://supabase.com
2. Copy your **Project URL** and **Anon Key** from Settings > API
3. Create `.env.local` from `.env.local.example`:
   ```bash
   cp .env.local.example .env.local
   ```
4. Add your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_url_here
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key_here
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

#### Setup Database Schema
1. In Supabase, go to **SQL Editor**
2. Open [database/schema.sql](database/schema.sql)
3. Copy all SQL and paste into Supabase SQL Editor
4. Click "Run" to create all tables

### 3. Run Development Server
```bash
npm run dev
```

Open http://localhost:3000 in your browser.

## Project Structure

```
src/
├── app/
│   ├── api/          # API routes (members, attendance, payments, fingerprint)
│   ├── members/      # Member management pages
│   ├── attendance/   # Attendance tracking pages
│   ├── payments/     # Payment management pages
│   └── page.tsx      # Dashboard (home)
├── components/       # React components (to build)
├── lib/
│   └── supabase.ts   # Supabase client configuration
└── globals.css       # Global styles
```

## Features (MVP)

- **Dashboard**: Overview of total members, present today, pending fees, revenue
- **Member Management**: Add, edit, search members
- **Attendance Tracking**: Mark attendance via fingerprint or manual
- **Payment Tracking**: Manage member fees and payments
- **Fingerprint Integration**: USB fingerprint device support via Python app

## Fingerprint Integration

The fingerprint device is controlled by a **Python application** that runs locally on the reception PC. 

### Python App Setup (Coming Soon)
- Scans fingerprint from USB device
- Sends scan data to the web app API (`POST /api/fingerprint/scan`)
- Displays success/error message

See [fingerprint/README.md](fingerprint/README.md) for Python setup instructions.

## API Endpoints

### Members
- `GET /api/members` - List all members (supports search)
- `POST /api/members` - Create member
- `GET /api/members/[id]` - Get member details
- `PUT /api/members/[id]` - Update member
- `DELETE /api/members/[id]` - Delete member

### Attendance
- `GET /api/attendance` - Get attendance records
- `POST /api/attendance` - Mark attendance

### Payments
- `GET /api/payments` - Get payment records
- `POST /api/payments` - Record payment

### Fingerprint
- `POST /api/fingerprint/scan` - Receive fingerprint scan (from Python app)
- `GET /api/fingerprint/config` - Get config for Python app

## Tech Stack

| Component           | Technology                |
|---------------------|---------------------------|
| Frontend + Backend  | Next.js 15 (App Router)   |
| Language            | TypeScript                |
| Database            | Supabase (PostgreSQL)     |
| Authentication      | Supabase Auth             |
| UI                  | Tailwind CSS              |
| Icons               | Lucide React              |
| Fingerprint         | Python script (local)     |

## Cost
**Completely Free!** Supabase and Vercel free tiers handle 300+ members easily.

## Next Steps

1. **Implement Member Management** - Add forms, list view with search
2. **Implement Attendance Tracking** - Today's list, history with date filter
3. **Implement Payment Management** - Pending fees, mark as paid
4. **Setup Database** - Execute schema.sql in Supabase
5. **Connect Supabase** - Update API routes to use real database
6. **Build Python Fingerprint App** - Device integration
7. **Deploy** - Push to Vercel

## Development Notes

- All TODO comments in API routes mark where to add Supabase integration
- Keep UI minimal - this is MVP, not a design showcase
- Test on desktop (reception PC) first, mobile second
- Ensure fingerprint Python app is tested before production

## Support

For Supabase docs: https://supabase.com/docs
For Next.js docs: https://nextjs.org/docs
For Tailwind CSS: https://tailwindcss.com/docs

## Fingerprint (single PC)

See [SINGLE_PC_SETUP.md](SINGLE_PC_SETUP.md) for one-computer reception desk setup with the ZKTeco bridge.
