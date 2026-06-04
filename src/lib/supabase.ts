import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/** @internal Lazily-initialized Supabase admin client.
 *
 * Uses `any` type because `ReturnType<typeof createSupabaseClient>` does not resolve
 * the complex generic parameter chain correctly when no `Database` type is provided —
 * it results in `Schema = never` instead of `Schema = any`, which makes every `.from()`
 * call return `never`-typed tables.
 *
 * The original `export const supabase = createClient(...)` did not have this issue
 * because TypeScript could fully infer the `SupabaseClient<any, ...>` type from the
 * direct call expression, while `ReturnType<>` on the generic function defaults the
 * `Schema` conditional to `never` instead of `any`.
 *
 * To get proper type safety, generate Supabase types and pass them to `createClient`:
 *   `supabase gen types typescript --linked > src/lib/database.types.ts`
 *
 * We use the SERVICE_ROLE_KEY here so the backend can bypass RLS and perform admin ops.
 * THIS IS SAFE because all our API routes are strictly protected by auth middleware.
 *
 * Lazy init is REQUIRED because this module may be imported at build time (Next.js
 * static page data collection), when env vars are not available and would throw.
 */
let _supabase: any = null

export function getSupabase() {
  if (!_supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) {
      throw new Error(
        'Supabase environment variables not configured. ' +
        'Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your environment.'
      )
    }
    _supabase = createSupabaseClient(url, key)
  }
  return _supabase
}
