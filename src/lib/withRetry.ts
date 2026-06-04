export async function withRetry<T>(
  operation: () => Promise<T>,
  retries: number = 3,
  delayMs: number = 500,
  shouldRetry?: (error: any) => boolean
): Promise<T> {
  let attempt = 0

  while (attempt < retries) {
    try {
      return await operation()
    } catch (error: any) {
      attempt++
      
      // Stop retrying if the custom check returns false (e.g. for unique constraints)
      if (shouldRetry && !shouldRetry(error)) {
        throw error
      }
      
      if (attempt >= retries) {
        throw error
      }
      
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }
  }
  
  throw new Error('Unreachable code in withRetry')
}
