/**
 * Database timeout utility functions
 * Helps prevent database queries from hanging indefinitely
 */

export interface TimeoutOptions {
  timeout?: number; // timeout in milliseconds, default 10000 (10 seconds)
  retries?: number; // number of retries, default 1
  retryDelay?: number; // delay between retries in milliseconds, default 1000
  circuitBreaker?: boolean; // enable circuit breaker, default true
}

// Circuit breaker state
interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
}

const circuitBreakerState: CircuitBreakerState = {
  failures: 0,
  lastFailureTime: 0,
  state: 'CLOSED'
};

const CIRCUIT_BREAKER_THRESHOLD = 5; // Open circuit after 5 failures
const CIRCUIT_BREAKER_TIMEOUT = 30000; // 30 seconds before trying again
const CIRCUIT_BREAKER_RECOVERY_TIMEOUT = 10000; // 10 seconds in half-open state

/**
 * Check if circuit breaker should allow the request
 */
function shouldAllowRequest(): boolean {
  const now = Date.now();
  
  switch (circuitBreakerState.state) {
    case 'CLOSED':
      return true;
    case 'OPEN':
      if (now - circuitBreakerState.lastFailureTime > CIRCUIT_BREAKER_TIMEOUT) {
        circuitBreakerState.state = 'HALF_OPEN';
        console.log('🔄 Circuit breaker moved to HALF_OPEN state');
        return true;
      }
      return false;
    case 'HALF_OPEN':
      return true;
    default:
      return true;
  }
}

/**
 * Record success for circuit breaker
 */
function recordSuccess(): void {
  if (circuitBreakerState.state === 'HALF_OPEN') {
    circuitBreakerState.state = 'CLOSED';
    circuitBreakerState.failures = 0;
    console.log('✅ Circuit breaker moved to CLOSED state');
  }
}

/**
 * Record failure for circuit breaker
 */
function recordFailure(): void {
  circuitBreakerState.failures++;
  circuitBreakerState.lastFailureTime = Date.now();
  
  if (circuitBreakerState.failures >= CIRCUIT_BREAKER_THRESHOLD) {
    circuitBreakerState.state = 'OPEN';
    console.warn(`⚠️ Circuit breaker OPENED after ${circuitBreakerState.failures} failures`);
  }
}

/**
 * Check if error is retryable
 */
function isRetryableError(error: Error): boolean {
  const message = error.message.toLowerCase();
  
  // Connection errors that might be temporary
  if (message.includes('timeout') || 
      message.includes('connection terminated') ||
      message.includes('server closed the connection') ||
      message.includes('connection refused') ||
      message.includes('network error')) {
    return true;
  }
  
  // Max connections - might recover
  if (message.includes('max client connections reached')) {
    return true;
  }
  
  // Authentication and permanent errors - don't retry
  if (message.includes('authentication failed') ||
      message.includes('permission denied') ||
      message.includes('does not exist') ||
      message.includes('syntax error')) {
    return false;
  }
  
  return true;
}

/**
 * Wraps a database query with timeout and retry logic
 */
export async function withTimeout<T>(
  queryFn: () => Promise<T>,
  options: TimeoutOptions = {}
): Promise<T | null> {
  const { 
    timeout = 10000, 
    retries = 2, 
    retryDelay = 1000,
    circuitBreaker = true 
  } = options;
  
  // Check circuit breaker
  if (circuitBreaker && !shouldAllowRequest()) {
    throw new Error('Circuit breaker is OPEN - database operations temporarily disabled');
  }
  
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await Promise.race([
        queryFn(),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error(`Database query timeout after ${timeout}ms`)), timeout)
        )
      ]);
      
      // Record success for circuit breaker
      if (circuitBreaker) {
        recordSuccess();
      }
      
      return result;
    } catch (error) {
      lastError = error as Error;
      
      // Log the error with context
      console.error(`❌ Database operation failed (attempt ${attempt + 1}/${retries + 1}):`, {
        error: lastError.message,
        retryable: isRetryableError(lastError),
        circuitBreakerState: circuitBreakerState.state
      });
      
      // Check if we should retry
      const shouldRetry = attempt < retries && isRetryableError(lastError);
      
      if (shouldRetry) {
        // Exponential backoff with jitter
        const baseDelay = retryDelay * Math.pow(2, attempt);
        const jitter = Math.random() * 1000;
        const delay = Math.min(10000, baseDelay + jitter); // Max 10 seconds
        
        console.warn(`⏳ Retrying database operation in ${Math.round(delay)}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // Record failure for circuit breaker
      if (circuitBreaker) {
        recordFailure();
      }
      
      throw lastError;
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
  } catch (error: any) {
    // Enhanced error logging with context
    const errorContext = {
      message: error.message,
      type: error.constructor.name,
      circuitBreakerState: circuitBreakerState.state,
      timestamp: new Date().toISOString()
    };
    
    console.error('Safe database operation failed:', errorContext);
    
    // Special handling for specific error types
    if (error.message?.includes('Max client connections reached')) {
      console.error('🚨 [CRITICAL] Database connection pool exhausted - consider scaling or optimizing queries');
    } else if (error.message?.includes('Circuit breaker is OPEN')) {
      console.warn('⚠️ [WARNING] Database operations temporarily disabled due to circuit breaker');
    }
    
    return fallback;
  }
}

/**
 * Get circuit breaker status
 */
export function getCircuitBreakerStatus() {
  return {
    state: circuitBreakerState.state,
    failures: circuitBreakerState.failures,
    lastFailureTime: circuitBreakerState.lastFailureTime,
    isHealthy: circuitBreakerState.state === 'CLOSED'
  };
}

/**
 * Reset circuit breaker (for manual recovery)
 */
export function resetCircuitBreaker() {
  circuitBreakerState.state = 'CLOSED';
  circuitBreakerState.failures = 0;
  circuitBreakerState.lastFailureTime = 0;
  console.log('🔄 Circuit breaker manually reset to CLOSED state');
}