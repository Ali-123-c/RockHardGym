---
name: supabase-setup
description: "Set up and configure Supabase for GymFlow. Use when initializing the database, configuring RLS policies, setting up authentication, or troubleshooting database connections."
---

# Supabase Setup Skill

Configure Supabase database, authentication, and storage for GymFlow.

## When to Use

- Setting up a new Supabase project
- Running database migrations
- Configuring RLS policies
- Setting up authentication
- Uploading seed data
- Troubleshooting database connection issues
- Configuring file storage for photos

## Procedure

### 1. Create Supabase Project

1. Visit [supabase.com](https://supabase.com)
2. Sign in with GitHub
3. Create new project:
   - Project name: `GymFlow`
   - Database password: (generate secure password)
   - Region: Closest to users (default OK for demo)
4. Wait for database to initialize (~2 min)

### 2. Get Credentials

From Supabase dashboard, navigate to **Settings → API**:
- Copy `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
- Copy `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Copy `service_role` secret → `SUPABASE_SERVICE_ROLE_KEY`

### 3. Configure .env.local

Create `.env.local` in project root:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=GymFlow
```

### 4. Run Database Schema

1. In Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy contents of `database/schema.sql`
4. Paste into editor and click **Run**
5. Wait for schema to create all tables

### 5. Enable Row Level Security (RLS)

For each table, configure security:

1. Go to **Authentication → Policies**
2. For each table, click **New Policy**
3. Create policies:

**Example: Members Table**
```sql
-- Allow public to read members
CREATE POLICY "Public can view members"
  ON members
  FOR SELECT
  USING (true);

-- Allow only staff/admin to insert
CREATE POLICY "Staff can create members"
  ON members
  FOR INSERT
  WITH CHECK (current_user_id IN (SELECT id FROM admin_users));

-- Allow admins to update
CREATE POLICY "Admins can update members"
  ON members
  FOR UPDATE
  USING (current_user_id IN (SELECT id FROM admin_users));
```

### 6. Test Connection

Run test script:

```bash
node test-db.js
```

Expected output:
```
✓ Connection successful
✓ Members table accessible
✓ Attendance table accessible
```

If errors appear, check:
- Environment variables in `.env.local`
- RLS policies are configured
- Tables exist in database

### 7. Load Seed Data (Optional)

For testing with sample data:

```bash
node scripts/seed-db.js
```

This creates 10 test members and sample attendance records.

## Common Tasks

### Add User to Admin Role

```sql
-- In Supabase SQL Editor
INSERT INTO admin_users (user_id, name, role)
VALUES ('your-auth-uuid', 'Admin Name', 'admin');
```

### Reset Password

```sql
-- Update user password via auth
UPDATE auth.users
SET encrypted_password = crypt('newpassword', gen_salt('bf'))
WHERE email = 'user@example.com';
```

### Upload Member Photo

1. Go to **Storage** in Supabase dashboard
2. Create new bucket: `member-photos`
3. Configure access: Public
4. Upload photos by member ID: `member-{id}.jpg`

Or via code:

```typescript
const { data, error } = await supabase.storage
  .from('member-photos')
  .upload(`public/${memberId}.jpg`, photoFile)
```

### Monitor Database Usage

Dashboard → **Database** → **Monitoring**:
- Query performance
- Disk usage
- Connection count
- Slow queries

## Troubleshooting

### Connection Refused
- Check `NEXT_PUBLIC_SUPABASE_URL` and keys are correct
- Verify .env.local is in root directory
- Restart dev server after adding env vars

### Authentication Errors
- Verify anon key is used for client requests
- Use service_role key only in server routes
- Check RLS policies allow the operation

### RLS Policy Issues
- Enable RLS on table: **Authentication → Policies**
- Create policies for: SELECT, INSERT, UPDATE, DELETE
- Test with curl: `curl -H "Authorization: Bearer TOKEN" https://api.example.com/v1/...`

### Slow Queries
- Check indexes on frequently queried columns
- Use EXPLAIN ANALYZE in SQL Editor
- Avoid SELECT * where possible
- Paginate large result sets

### File Upload Issues
- Create storage bucket: **Storage → New bucket**
- Configure bucket access policies
- Ensure file size under Supabase limits (50GB per file)
- Check file MIME type is supported

## References

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [RLS Policies Guide](https://supabase.com/docs/guides/auth/row-level-security)
- Project Schema: `database/schema.sql`
- Environment Template: `.env.local.example`

## Next Steps

1. ✅ Create Supabase project
2. ✅ Copy credentials to .env.local
3. ✅ Run database schema
4. ✅ Configure RLS policies
5. ✅ Test with test-db.js
6. → Start building API routes in `src/app/api/`
