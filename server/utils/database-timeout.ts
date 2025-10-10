/**
 * Database timeout utility functions
 * Helps prevent database queries from hanging indefinitely
 * Enhanced with connection pool management and recovery
 */

export interface TimeoutOptions {
  timeout?: number; // timeout in milliseconds, default 10000 (10 seconds)
  retries?: number; // number of retries, default 3
  retryDelay?: number; // delay between retries in milliseconds, default 1000
  exponentialBackoff?: boolean; // use exponential backoff for retries, default true
  maxRetryDelay?: number; // maximum retry delay in milliseconds, default 10000
}

// Connection pool error types that should trigger retries
const RETRYABLE_ERRORS = [
  'Max client connections reached',
  'connection terminated',
  'Connection terminated',
  'server closed the connection unexpectedly',
  'timeout',
  'ECONNRESET',
  'ENOTFOUND',
  'ETIMEDOUT',
  'XX000' // PostgreSQL internal error code
];

/**
 * Check if an error is retryable (connection-related)
 */
export function isRetryableError(error: any): boolean {
  if (!error) return false;
  
  const errorMessage = String(error.message || error.toString()).toLowerCase();
  const errorCode = String(error.code || '').toUpperCase();
  
  return RETRYABLE_ERRORS.some(retryableError => 
    errorMessage.includes(retryableError.toLowerCase()) ||
    errorCode === retryableError
  );
}

/**
 * Calculate retry delay with exponential backoff
 */
function calculateRetryDelay(attempt: number, baseDelay: number, maxDelay: number, exponential: boolean): number {
  if (!exponential) return baseDelay;
  
  const delay = baseDelay * Math.pow(2, attempt);
  return Math.min(delay, maxDelay);
}

/**
 * Wraps a database query with timeout and retry logic
 * Enhanced with connection pool error handling
 */
export async function withTimeout<T>(
  queryFn: () => Promise<T>,
  options: TimeoutOptions = {}
): Promise<T | null> {
  const { 
    timeout = 10000, 
    retries = 3, 
    retryDelay = 1000,
    exponentialBackoff = true,
    maxRetryDelay = 10000
  } = options;
  
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await Promise.race([
        queryFn(),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error(`Database query timeout after ${timeout}ms`)), timeout)
        )
      ]);
      
      // If we succeed after previous failures, log recovery
      if (attempt > 0) {
        console.log(`✅ Database operation recovered after ${attempt} attempts`);
      }
      
      return result;
    } catch (error) {
      lastError = error as Error;
      
      // Check if this is a retryable error
      const shouldRetry = isRetryableError(error) && attempt < retries;
      
      if (shouldRetry) {
        const delay = calculateRetryDelay(attempt, retryDelay, maxRetryDelay, exponentialBackoff);
        
        console.warn(
          `🔄 Database error (attempt ${attempt + 1}/${retries + 1}): ${lastError.message}. ` +
          `Retrying in ${delay}ms...`
        );
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // If it's not retryable or we're out of retries, throw immediately
      console.error(`❌ Database operation failed after ${attempt + 1} attempts:`, lastError.message);
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
 * Enhanced with better error logging and connection recovery
 */
export async function safeDbOperation<T>(
  operation: () => Promise<T>,
  fallback: T,
  options: TimeoutOptions = {}
): Promise<T> {
  try {
    const result = await withTimeout(operation, {
      retries: 3,
      retryDelay: 1000,
      exponentialBackoff: true,
      ...options
    });
    return result ?? fallback;
  } catch (error: any) {
    // Enhanced error logging with more context
    const errorInfo = {
      message: error?.message || 'Unknown error',
      code: error?.code || 'UNKNOWN',
      severity: error?.severity || 'UNKNOWN',
      cause: error?.cause?.message || null,
      stack: error?.stack?.split('\n')[0] || null
    };
    
    console.error('Safe database operation failed:', errorInfo);
    
    // If this is a connection pool issue, log additional context
    if (isRetryableError(error)) {
      console.error('🚨 Connection pool issue detected. Consider:', {
        suggestion1: 'Check DATABASE_URL connection string',
        suggestion2: 'Verify database server is accessible',
        suggestion3: 'Consider increasing DB_POOL_MAX if using PgBouncer',
        suggestion4: 'Check for connection leaks in application code'
      });
    }
    
    return fallback;
  }
}