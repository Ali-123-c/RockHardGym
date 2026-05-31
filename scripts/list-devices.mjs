import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const { data } = await s.from('fingerprint_devices').select('id, device_name, ip_address')
console.log('Devices in DB:', JSON.stringify(data, null, 2))
console.log('Bridge .env DEVICE_ID should be one of the ids above')
