import { createClient } from '@supabase/supabase-js'

// Client-side Supabase instance (uses anon key)
// Used only for realtime subscriptions in browser
export const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
