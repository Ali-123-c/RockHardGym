/** Lightweight in-memory cache for GET API responses.
 *  Caches responses for a configurable TTL to avoid redundant Supabase queries
 *  when users navigate between pages quickly.
 *
 *  NOTE: In serverless environments (Vercel), the cache is DISABLED because
 *  multiple server instances mean cache invalidation on one instance doesn't
 *  affect others — causing stale data on subsequent requests.
 */

interface CacheEntry<T> {
  data: T
  expiresAt: number
}

const store = new Map<string, CacheEntry<unknown>>()
const IS_SERVERLESS = process.env.VERCEL === '1' || process.env.AWS_LAMBDA_FUNCTION_NAME !== undefined

// Only run the cleanup interval in non-serverless environments
if (!IS_SERVERLESS && typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of store) {
      if (entry.expiresAt < now) {
        store.delete(key)
      }
    }
  }, 30_000)
}

export function withApiCache<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>
): Promise<T> {
  // In serverless, always bypass cache — instances are not shared, so caching
  // causes stale data when a mutation hits a different instance than the read.
  if (IS_SERVERLESS) {
    return fetcher()
  }

  const now = Date.now()
  const existing = store.get(key)

  if (existing && existing.expiresAt > now) {
    return Promise.resolve(existing.data as T)
  }

  return fetcher().then((data) => {
    store.set(key, { data, expiresAt: now + ttlMs })
    return data
  })
}

/** Invalidate all cache entries (useful after mutations) */
export function clearApiCache() {
  store.clear()
}

/** Invalidate a specific cache key */
export function invalidateApiCache(keyPrefix: string) {
  for (const key of store.keys()) {
    if (key.startsWith(keyPrefix)) {
      store.delete(key)
    }
  }
}
