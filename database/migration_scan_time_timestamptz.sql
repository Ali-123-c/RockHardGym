-- Migration: Change scan_time column from TIMESTAMP to TIMESTAMPTZ
-- 
-- Why: TIMESTAMP (without timezone) strips the timezone info from ISO strings
-- sent by the server. When the route sends "2026-12-01T00:00:00.000Z" (UTC),
-- the plain TIMESTAMP column stores it as 2026-12-01 00:00:00 (losing the Z).
-- When read back, JavaScript's Date() parses it as local time instead of UTC,
-- causing a timezone shift.
--
-- TIMESTAMPTZ preserves the UTC offset and returns proper ISO strings
-- with the 'Z' suffix, eliminating the timezone mismatch.

-- Alter the attendance table
ALTER TABLE attendance 
  ALTER COLUMN scan_time TYPE TIMESTAMPTZ 
  USING scan_time AT TIME ZONE 'UTC';

-- Note: CURRENT_TIMESTAMP already returns TIMESTAMPTZ, so the default
-- is compatible. If you were using a plain TIMESTAMP default, NOW()
-- is the TIMESTAMPTZ equivalent.
-- The default has been updated in schema.sql from CURRENT_TIMESTAMP to NOW().
