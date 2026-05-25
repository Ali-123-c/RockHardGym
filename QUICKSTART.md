# ✅ GymFlow - Quick Start Checklist

Complete these steps in order to get the project running:

## Phase 1: Environment Setup (5 minutes)

- [ ] **Install Node.js**
  - Download LTS from https://nodejs.org/
  - Run installer (default settings OK)
  - Restart VS Code Terminal
  - Verify: Run `node --version` in terminal

- [ ] **Open project folder**
  - Open `d:\GYM` in VS Code
  - Terminal should open automatically

## Phase 2: Setup Supabase (10 minutes)

- [ ] **Create Supabase account & project**
  - Go to https://supabase.com
  - Sign up (free account)
  - Create new project
  - Wait for project to be ready (~2 minutes)

- [ ] **Get credentials**
  - In Supabase, go to Settings > API
  - Copy Project URL
  - Copy Anon Key
  - Copy Service Role Key (under hidden section)

- [ ] **Create `.env.local` file**
  - In VS Code, create new file in project root
  - Name it `.env.local`
  - Paste this (replace with your actual values):
  ```
  NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key_here
  SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
  NEXT_PUBLIC_APP_NAME=GymFlow
  NEXT_PUBLIC_APP_URL=http://localhost:3000
  ```
  - Save the file

- [ ] **Setup Database**
  - In Supabase, go to SQL Editor
  - Click "New Query"
  - Open `database/schema.sql` from VS Code
  - Copy ALL the SQL content
  - Paste into Supabase SQL Editor
  - Click "Run"
  - Wait for success message
  - Check: Go to Table Editor, should see 3 tables:
    - members
    - attendance
    - payments

## Phase 3: Install Dependencies (5 minutes)

- [ ] **Install npm packages**
  - In VS Code Terminal: `npm install`
  - Wait for all packages to install (~3-5 minutes)
  - Should see ✅ complete message

- [ ] **Verify installation**
  - Check no red errors in terminal
  - Should see message like "added XXX packages"

## Phase 4: Test Development Server (5 minutes)

- [ ] **Start development server**
  - In Terminal: `npm run dev`
  - Should see "✓ Ready in XXXms"
  - Note the URL (usually http://localhost:3000)

- [ ] **Open in browser**
  - Open http://localhost:3000
  - Should see GymFlow dashboard
  - Should see 4 stat cards: Total Members, Present Today, Pending Fees, Monthly Revenue
  - Should see navigation menu: Members, Attendance, Payments

- [ ] **Test navigation**
  - Click "Members" → should see placeholder page
  - Click "Attendance" → should see placeholder page
  - Click "Payments" → should see placeholder page
  - Click GymFlow logo → back to dashboard

✅ **If you see the dashboard, your setup is complete!**

---

## Phase 5: Build Features (Main Development)

Now that the project is running, build these features in order:

### 1. Member Management (Estimated: 2-3 days)
- [ ] Create member form component
  - Name, Phone, Address, City, Joining Date, Expiry Date, Fee Amount
  - Add photo upload
  - Form validation
  
- [ ] Implement `/api/members` endpoints
  - Connect to Supabase
  - GET: fetch members with search
  - POST: create new member
  - PUT: update member
  - DELETE: delete member

- [ ] Build Members page UI
  - Search bar (by name/phone)
  - Member list/table
  - Edit button for each member
  - Delete button
  - Add New Member button

- [ ] Test with sample data
  - Create 5-10 test members
  - Verify they appear in list
  - Test search functionality

### 2. Attendance System (Estimated: 2 days)
- [ ] Implement attendance endpoints
  - GET: fetch today's attendance
  - POST: mark attendance manually

- [ ] Build Today's Attendance page
  - List all members present today
  - Show time they came
  - Search by member name

- [ ] Build Attendance History page
  - Calendar/date picker
  - List attendance for selected date
  - Export option (optional)

- [ ] Manual attendance marking
  - Search member
  - Mark as present button
  - Show confirmation

### 3. Payment System (Estimated: 1 day)
- [ ] Implement payment endpoints
  - GET: pending fees
  - POST: mark as paid

- [ ] Build Pending Fees page
  - List members with due fees
  - Show fee amount
  - Mark as paid button
  - Payment date input

- [ ] Build Payment History
  - Filter by month
  - Show all payments made

- [ ] Dashboard stats
  - Calculate monthly revenue
  - Show pending fees count

### 4. Supabase Complete Integration (Already scaffolded, just connect)
- [ ] Review all TODO comments in `src/app/api/`
- [ ] Replace with actual Supabase queries
- [ ] Test each endpoint with real data

### 5. Fingerprint Python App (Estimated: 1-2 days)
- [ ] Edit `fingerprint/app.py`
  - Research your device SDK
  - Implement device connection
  - Implement fingerprint scanning loop
  - Test with sample member IDs

- [ ] Setup config.json
  - Set device port
  - Set device type
  - Test device connection

- [ ] Test fingerprint marking
  - Scan a member's fingerprint
  - Verify attendance is marked in web app

### 6. Deployment (Final)
- [ ] Create Vercel account
- [ ] Connect GitHub repo
- [ ] Deploy to Vercel
- [ ] Test all features in production

---

## Troubleshooting

### "npm: command not found"
→ Node.js not installed or PATH not updated. Download from nodejs.org

### "Cannot connect to Supabase"
→ Check environment variables in `.env.local`
→ Verify Project URL and Anon Key are correct
→ Check internet connection

### "Dashboard shows but pages don't load"
→ Run `npm install` again
→ Restart dev server with `npm run dev`

### API returning 500 error
→ Check browser console for errors
→ Verify Supabase credentials in `.env.local`
→ Look for TODO comments in api routes - they're not integrated yet

---

## Testing Commands

```bash
# Test API endpoints with curl
curl http://localhost:3000/api/members

# See database tables
# Go to Supabase > Table Editor > click each table

# Check TypeScript errors
npm run lint

# Build for production (to check for build errors)
npm build
```

---

## Key Files to Modify

When building features, you'll mainly edit:

1. **Pages** → `src/app/members/page.tsx`, `src/app/attendance/page.tsx`, etc.
2. **API Routes** → `src/app/api/*/route.ts`
3. **Components** → Create new files in `src/components/`
4. **Styles** → Add Tailwind classes to components (not separate CSS files)

---

## Progress Tracking

Use this to track your progress:

```
Phase 1: Environment     ✅ Complete
Phase 2: Supabase        ⏳ In Progress
Phase 3: Dependencies    ⏳ Next
Phase 4: Test Server     ⏳ Next
Phase 5: Build Features  ⏳ Next
```

---

**Ready?** Start with Phase 1! 🚀
