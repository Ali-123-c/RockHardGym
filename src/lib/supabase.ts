import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// We use the SERVICE_ROLE_KEY here so the backend can bypass RLS and perform admin operations.
// THIS IS SAFE because all our API routes are strictly protected by our authentication middleware.
export const supabase = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
