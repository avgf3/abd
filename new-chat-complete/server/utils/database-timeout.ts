/**
 * Database timeout utility functions
 * Helps prevent database queries from hanging indefinitely
 */

export interface TimeoutOptions {
  timeout?: number; // timeout in milliseconds, default 10000 (10 seconds)
  retries?: number; // number of retries, default 1
  retryDelay?: number; // delay between retries in milliseconds, default 1000
}

/**
 * Wraps a database query with timeout and retry logic
 */
export async function withTimeout<T>(
  queryFn: () => Promise<T>,
  options: TimeoutOptions = {}
): Promise<T | null> {
  const { timeout = 10000, retries = 1, retryDelay = 1000 } = options;
  
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await Promise.race([
        queryFn(),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error(`Database query timeout after ${timeout}ms`)), timeout)
        )
      ]);
      
      return result;
    } catch (error) {
      lastError = error as Error;
      
      // If it's a timeout error and we have retries left, wait and try again
      if (error instanceof Error && error.message.includes('timeout') && attempt < retries) {
        console.warn(`Database query timeout (attempt ${attempt + 1}/${retries + 1}), retrying in ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        continue;
      }
      
      // If it's not a timeout error or we're out of retries, throw immediately
      throw error;
    }
  }
  
  throw lastError;
}

/**
 * Batch database operations with timeout protection
 */
export async function batchWithTimeout<T>(
  operations: Array<() => Promise<T>>,
  options: TimeoutOptions = {}
): Promise<Array<T | null>> {
  const { timeout = 15000 } = options; // Longer timeout for batch operations
  
  const promises = operations.map(op => 
    withTimeout(op, { ...options, timeout }).catch(error => {
      console.error('Batch operation failed:', error);
      return null;
    })
  );
  
  return Promise.all(promises);
}

/**
 * Safe database operation that never throws
 */
export async function safeDbOperation<T>(
  operation: () => Promise<T>,
  fallback: T,
  options: TimeoutOptions = {}
): Promise<T> {
  try {
    const result = await withTimeout(operation, options);
    return result ?? fallback;
  } catch (error) {
    console.error('Safe database operation failed:', error);
    return fallback;
  }
}