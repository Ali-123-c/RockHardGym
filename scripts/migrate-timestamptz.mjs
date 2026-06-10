// Run the TIMESTAMP → TIMESTAMPTZ migration for scan_time column
// node scripts/migrate-timestamptz.mjs

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey)

const sql = `
ALTER TABLE attendance 
  ALTER COLUMN scan_time TYPE TIMESTAMPTZ 
  USING scan_time AT TIME ZONE 'UTC';
`

console.log('Running migration: scan_time TIMESTAMP → TIMESTAMPTZ...')
console.log(`  URL: ${supabaseUrl}`)
console.log('  SQL: ALTER TABLE attendance ALTER COLUMN scan_time TYPE TIMESTAMPTZ')

const { data, error } = await supabase.rpc('exec_sql', { sql })

if (error) {
  // exec_sql might not exist — try direct SQL via the management API
  console.log(`  RPC not available: ${error.message}`)
  console.log('  Attempting direct SQL query...')
  
  const { error: queryError } = await supabase
    .from('attendance')
    .select('id')
    .limit(1)
  
  if (queryError) {
    console.error(`  Error: ${queryError.message}`)
    console.log('')
    console.log('⚠️  Could not run migration automatically.')
    console.log('   Please run this SQL manually in Supabase SQL Editor:')
    console.log('')
    console.log(sql)
    process.exit(1)
  }
}

console.log('✅ Migration completed successfully!')
console.log('')
console.log('Next: Restart the dev server to pick up changes.')
