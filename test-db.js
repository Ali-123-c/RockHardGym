import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.log('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function test() {
  const member = {
    name: 'Test Name',
    phone: '0300000000',
    membership_no: 'MEM-1234',
    city: 'City',
    address: 'Address',
    joining_date: '2026-05-21',
    expiry_date: '2026-06-21',
    fee_amount: 5000,
    status: 'Active'
  }

  const { data, error } = await supabase.from('members').insert([member]).select()
  console.log('Insert Error:', error)
  console.log('Insert Data:', data)
}

test()
