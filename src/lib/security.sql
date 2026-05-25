-- SECURITY AUDIT
-- Copy and paste this script into your Supabase SQL Editor.
-- This will enable Row Level Security (RLS) on all your tables, completely blocking unauthorized access.

-- 1. Enable RLS on all tables
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- 2. Drop any existing public policies (just in case they exist)
DROP POLICY IF EXISTS "Enable read access for all users" ON public.members;
DROP POLICY IF EXISTS "Enable insert access for all users" ON public.members;
-- (Add more drop statements if you had previously created public policies)

-- By default, when RLS is enabled with NO policies, it defaults to "Deny All" for anon and authenticated users.
-- Since your Next.js backend uses the secure SERVICE_ROLE_KEY to interact with the database,
-- it will bypass these RLS restrictions automatically.
-- This guarantees that NO ONE can read or write to your database directly from the internet. All traffic MUST go through your secure, authenticated Next.js API!
