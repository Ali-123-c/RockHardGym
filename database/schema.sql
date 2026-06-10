-- Supabase Database Schema for GymFlow
-- Copy and paste this into the Supabase SQL Editor to create tables

-- 1. Members table
CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  membership_no TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  address TEXT,
  city TEXT,
  photo_url TEXT,
  joining_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_date DATE,
  fee_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Expired', 'Inactive')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Attendance table
CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  scan_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Payments table
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  month TEXT NOT NULL,
  status TEXT DEFAULT 'Paid' CHECK (status IN ('Paid', 'Pending')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster queries
CREATE INDEX idx_attendance_member_id ON attendance(member_id);
CREATE INDEX idx_attendance_date ON attendance(date);
CREATE INDEX idx_payments_member_id ON payments(member_id);
CREATE INDEX idx_payments_month ON payments(month);
CREATE INDEX idx_members_phone ON members(phone);
CREATE INDEX idx_members_status ON members(status);
CREATE INDEX idx_members_membership_no ON members(membership_no);

-- Enable Row Level Security (RLS)
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Note: No anonymous write/update/delete policies are created.
-- The Next.js API uses the SUPABASE_SERVICE_ROLE_KEY to safely bypass RLS for writes.
-- However, anon SELECT is required on attendance for browser real-time subscriptions:
CREATE POLICY "Enable anon read access for attendance realtime"
  ON attendance FOR SELECT
  USING (true);
