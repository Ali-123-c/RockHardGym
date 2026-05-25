# GymFlow Development Instructions

## Project Overview
Simple gym management system with fingerprint attendance tracking built with Next.js 15, TypeScript, Tailwind CSS, and Supabase.

## Setup Checklist

- [x] Project scaffolded with Next.js 15
- [x] TypeScript configured
- [x] Tailwind CSS configured
- [x] Supabase integration setup
- [x] Database schema created
- [x] API routes scaffolded
- [ ] Supabase credentials configured (.env.local)
- [ ] Dependencies installed (`npm install`)
- [ ] Development server tested
- [ ] Member management UI built
- [ ] Attendance system implemented
- [ ] Payment system implemented
- [ ] Fingerprint Python app created
- [ ] Deployed to Vercel

## Key Files

- `src/app/page.tsx` - Dashboard/home page
- `src/app/api/` - API routes for all features
- `database/schema.sql` - Database schema to run in Supabase
- `.env.local.example` - Environment configuration template
- `README.md` - User-facing documentation

## Implementation Strategy

1. **Database Setup** (Priority 1)
   - Create Supabase project
   - Copy credentials to .env.local
   - Run schema.sql in Supabase SQL Editor

2. **Member Management** (Priority 2)
   - Create member form component
   - Implement CRUD API routes with Supabase integration
   - Build member list with search
   - Add photo upload functionality

3. **Attendance System** (Priority 3)
   - Implement today's attendance view
   - Build attendance history with date filter
   - Create manual attendance marking
   - Prepare fingerprint integration endpoint

4. **Payment System** (Priority 4)
   - Build pending fees list
   - Implement payment marking
   - Calculate monthly revenue
   - Create payment history

5. **Fingerprint Integration** (Priority 5)
   - Create Python app scaffolding
   - Implement fingerprint device communication
   - Connect to `/api/fingerprint/scan` endpoint

6. **Deployment** (Priority 6)
   - Deploy to Vercel
   - Configure Supabase public policies
   - Test all endpoints

## API Endpoint Status

- ✅ GET `/api/members` - Scaffolded, TODO: Supabase integration
- ✅ POST `/api/members` - Scaffolded, TODO: Supabase integration
- ✅ GET `/api/members/[id]` - Scaffolded, TODO: Supabase integration
- ✅ PUT `/api/members/[id]` - Scaffolded, TODO: Supabase integration
- ✅ DELETE `/api/members/[id]` - Scaffolded, TODO: Supabase integration
- ✅ GET `/api/attendance` - Scaffolded, TODO: Supabase integration
- ✅ POST `/api/attendance` - Scaffolded, TODO: Supabase integration
- ✅ GET `/api/payments` - Scaffolded, TODO: Supabase integration
- ✅ POST `/api/payments` - Scaffolded, TODO: Supabase integration
- ✅ POST `/api/fingerprint/scan` - Scaffolded, TODO: Logic
- ✅ GET `/api/fingerprint/config` - Ready

## Tech Stack Decisions

- **Next.js 15** - Latest with App Router, built-in optimization
- **TypeScript** - Type safety for solo developer
- **Tailwind CSS** - Rapid UI development
- **Supabase** - Free, PostgreSQL, Auth, Storage all-in-one
- **Lucide React** - Simple icon library
- **shadcn/ui** - Optional for component library (not heavily used yet)

## Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_APP_URL=http://localhost:3000 (dev) or your_production_url
NEXT_PUBLIC_APP_NAME=GymFlow
```

## Code Style Guidelines

- Use TypeScript for type safety
- Keep components functional (React hooks)
- Use Tailwind utility classes for styling
- Keep components in `src/components/`
- Keep API routes organized by feature in `src/app/api/`
- Add `'use client'` directive at top of client components
- Use consistent error handling in API routes
- Add TODO comments for unimplemented Supabase integration

## Testing Approach

- Test each page manually in development
- Verify API endpoints with curl or Postman
- Test fingerprint Python app with test data before device connection
- Load test with sample 300+ members data

## Deployment Notes

- Deploy to Vercel (built-in Next.js support)
- Configure environment variables in Vercel project settings
- Set up Supabase RLS policies for security
- Test API endpoints after deployment
- Keep Python fingerprint app running locally on reception PC

## Support Resources

- Next.js Docs: https://nextjs.org/docs
- Supabase Docs: https://supabase.com/docs
- Tailwind CSS: https://tailwindcss.com/docs
- TypeScript: https://www.typescriptlang.org/docs/

---

**Last Updated:** May 21, 2026
**Status:** Project scaffolding complete, ready for implementation
