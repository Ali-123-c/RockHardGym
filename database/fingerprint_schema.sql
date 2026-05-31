-- Supabase Database Schema for Fingerprint Integration
-- Copy and paste this into the Supabase SQL Editor to create tables

-- 1. Fingerprint Devices table
CREATE TABLE IF NOT EXISTS fingerprint_devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_name TEXT NOT NULL,
  device_model TEXT NOT NULL DEFAULT 'ZKTeco K70',
  ip_address TEXT NOT NULL,
  port INTEGER NOT NULL DEFAULT 4370,
  device_number INTEGER NOT NULL DEFAULT 1,
  communication_key INTEGER NOT NULL DEFAULT 0,
  communication_password TEXT,
  status TEXT DEFAULT 'Offline' CHECK (status IN ('Online', 'Offline', 'Error')),
  last_sync TIMESTAMP,
  last_checked_at TIMESTAMP,
  last_response_time_ms INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Attendance Logs table (from Device)
CREATE TABLE IF NOT EXISTS attendance_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID REFERENCES members(id) ON DELETE SET NULL, -- Nullable if member doesn't exist yet but log was created
  member_name TEXT, -- Cached name or from device
  device_id UUID NOT NULL REFERENCES fingerprint_devices(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('checkin', 'checkout')),
  timestamp TIMESTAMP NOT NULL,
  synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(member_id, timestamp) -- Prevent duplicate attendance logs for the same member at the exact same second
);

-- 3. Sync Logs table
CREATE TABLE IF NOT EXISTS sync_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id UUID NOT NULL REFERENCES fingerprint_devices(id) ON DELETE CASCADE,
  sync_status TEXT NOT NULL CHECK (sync_status IN ('Success', 'Failed', 'Partial')),
  records_synced INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Device Health Logs table
CREATE TABLE IF NOT EXISTS device_health_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id UUID NOT NULL REFERENCES fingerprint_devices(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('Online', 'Offline', 'Error')),
  response_time INTEGER, -- in milliseconds
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_fingerprint_devices_status ON fingerprint_devices(status);
CREATE INDEX IF NOT EXISTS idx_fingerprint_devices_ip_address ON fingerprint_devices(ip_address);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_device_id ON attendance_logs(device_id);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_timestamp ON attendance_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_member_id ON attendance_logs(member_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_device_id ON sync_logs(device_id);
CREATE INDEX IF NOT EXISTS idx_device_health_logs_device_id ON device_health_logs(device_id);
CREATE INDEX IF NOT EXISTS idx_device_health_logs_created_at ON device_health_logs(created_at DESC);

-- Optional migration for existing installations
ALTER TABLE fingerprint_devices ADD COLUMN IF NOT EXISTS device_number INTEGER NOT NULL DEFAULT 1;
ALTER TABLE fingerprint_devices ADD COLUMN IF NOT EXISTS communication_key INTEGER NOT NULL DEFAULT 0;
ALTER TABLE fingerprint_devices ADD COLUMN IF NOT EXISTS last_checked_at TIMESTAMP;
ALTER TABLE fingerprint_devices ADD COLUMN IF NOT EXISTS last_response_time_ms INTEGER;
-- Enable Row Level Security (RLS)
ALTER TABLE fingerprint_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_health_logs ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies (allow anonymous access for MVP as requested in existing schema)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'fingerprint_devices'
      AND policyname = 'Allow anon users full access to fingerprint_devices'
  ) THEN
    CREATE POLICY "Allow anon users full access to fingerprint_devices"
      ON fingerprint_devices FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'attendance_logs'
      AND policyname = 'Allow anon users full access to attendance_logs'
  ) THEN
    CREATE POLICY "Allow anon users full access to attendance_logs"
      ON attendance_logs FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'sync_logs'
      AND policyname = 'Allow anon users full access to sync_logs'
  ) THEN
    CREATE POLICY "Allow anon users full access to sync_logs"
      ON sync_logs FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'device_health_logs'
      AND policyname = 'Allow anon users full access to device_health_logs'
  ) THEN
    CREATE POLICY "Allow anon users full access to device_health_logs"
      ON device_health_logs FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
