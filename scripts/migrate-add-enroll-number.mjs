/**
 * Migration: Add enroll_number column to attendance_logs
 * 
 * Run: node scripts/migrate-add-enroll-number.mjs
 * 
 * This adds the enroll_number column to store the raw device user ID
 * that was received with each attendance log, making it easier to
 * debug member ID mismatches between the device and the database.
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials. Make sure .env.local has NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const migrationSql = `
-- Add enroll_number column to attendance_logs for debugging device ID mismatches
ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS enroll_number TEXT;

-- Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'attendance_logs' 
  AND column_name = 'enroll_number';
`

async function main() {
  console.log('Running migration: Add enroll_number to attendance_logs...\n')

  // Try using exec_sql RPC if available
  const { data: rpcData, error: rpcError } = await supabase.rpc('exec_sql', { query: migrationSql })
  
  if (!rpcError) {
    console.log('✅ Migration completed via RPC')
    console.log('Result:', rpcData)
    return
  }

  // Fallback: Use the REST API to check if column exists first
  console.log('⚠️  exec_sql RPC not available, trying fallback...')
  console.log('   (This is expected if you haven\'t created the exec_sql function)')
  
  // Check if column already exists
  const { data, error } = await supabase
    .from('attendance_logs')
    .select('enroll_number')
    .limit(0)

  if (error && error.code === 'PGRST116') {
    // Column exists but no rows returned (expected)
    console.log('✅ enroll_number column already exists!')
    return
  }

  if (error && error.message?.includes('enroll_number')) {
    console.log('\n❌ Column does not exist yet.')
    console.log('\n📋 Please run this SQL manually in your Supabase SQL Editor:')
    console.log('\n   ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS enroll_number TEXT;')
    console.log('\n   📍 Supabase URL: https://supabase.com/dashboard')
    console.log('   → SQL Editor → New Query → Paste SQL → Run\n')
    return
  }

  if (!error) {
    console.log('✅ enroll_number column already exists!')
    return
  }

  console.log('\n❌ Unexpected error:', error.message)
}

main().catch(console.error)
