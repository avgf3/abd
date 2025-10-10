/**
 * Comprehensive database error handler
 * Handles connection pool exhaustion and other database errors gracefully
 */

import { recoverDatabaseConnection, checkDatabaseHealth } from '../database-adapter';

export interface DatabaseError {
  code?: string;
  message: string;
  severity?: string;
  cause?: any;
  isRetryable: boolean;
  isConnectionIssue: boolean;
}

// Connection-related error patterns
const CONNECTION_ERROR_PATTERNS = [
  /max client connections reached/i,
  /connection terminated/i,
  /server closed the connection unexpectedly/i,
  /connection refused/i,
  /timeout/i,
  /econnreset/i,
  /enotfound/i,
  /etimedout/i,
  /network error/i,
  /connection lost/i,
  /connection dropped/i,
];

// PostgreSQL error codes that indicate connection issues
const CONNECTION_ERROR_CODES = [
  'XX000', // Internal error (often connection pool related)
  '08000', // Connection exception
  '08003', // Connection does not exist
  '08006', // Connection failure
  '08001', // SQL client unable to establish connection
  '08004', // SQL server rejected establishment of connection
  '57P01', // Admin shutdown
  '57P02', // Crash shutdown
  '57P03', // Cannot connect now
];

/**
 * Analyze a database error and determine its characteristics
 */
export function analyzeDatabaseError(error: any): DatabaseError {
  const message = String(error?.message || error || 'Unknown database error');
  const code = String(error?.code || '').toUpperCase();
  const severity = String(error?.severity || '').toUpperCase();

  // Check if this is a connection-related error
  const isConnectionIssue = 
    CONNECTION_ERROR_CODES.includes(code) ||
    CONNECTION_ERROR_PATTERNS.some(pattern => pattern.test(message)) ||
    severity === 'FATAL';

  // Determine if the error is retryable
  const isRetryable = isConnectionIssue || [
    'ECONNRESET',
    'ETIMEDOUT',
    'ENOTFOUND',
    'NETWORK_ERROR'
  ].includes(code);

  return {
    code,
    message,
    severity,
    cause: error?.cause,
    isRetryable,
    isConnectionIssue
  };
}

/**
 * Handle database errors with appropriate recovery strategies
 */
export async function handleDatabaseError(
  error: any,
  context: string = 'database operation'
): Promise<{ shouldRetry: boolean; delay: number }> {
  const analyzedError = analyzeDatabaseError(error);

  // Log the error with context
  console.error(`🚨 Database error in ${context}:`, {
    message: analyzedError.message,
    code: analyzedError.code,
    severity: analyzedError.severity,
    isConnectionIssue: analyzedError.isConnectionIssue,
    isRetryable: analyzedError.isRetryable
  });

  // Handle connection issues
  if (analyzedError.isConnectionIssue) {
    console.warn('🔄 Connection issue detected, checking database health...');
    
    const isHealthy = await checkDatabaseHealth();
    
    if (!isHealthy) {
      console.warn('💔 Database is unhealthy, attempting recovery...');
      
      // Attempt recovery in background (don't wait for it)
      recoverDatabaseConnection().catch(recoveryError => {
        console.error('Recovery attempt failed:', recoveryError?.message);
      });
      
      // Return with longer delay for connection issues
      return {
        shouldRetry: analyzedError.isRetryable,
        delay: 5000 // 5 second delay for connection issues
      };
    }
  }

  // Return retry decision and delay
  return {
    shouldRetry: analyzedError.isRetryable,
    delay: analyzedError.isConnectionIssue ? 3000 : 1000
  };
}

/**
 * Wrapper for database operations with automatic error handling
 */
export async function withDatabaseErrorHandling<T>(
  operation: () => Promise<T>,
  context: string = 'database operation',
  maxRetries: number = 3
): Promise<T | null> {
  let lastError: any = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        // Final attempt failed
        console.error(`❌ ${context} failed after ${maxRetries + 1} attempts:`, {
          message: (error as any)?.message,
          code: (error as any)?.code
        });
        break;
      }
      
      // Handle the error and decide whether to retry
      const { shouldRetry, delay } = await handleDatabaseError(error, context);
      
      if (!shouldRetry) {
        console.error(`❌ ${context} failed with non-retryable error:`, (error as any)?.message);
        break;
      }
      
      // Wait before retrying
      console.log(`⏳ Retrying ${context} in ${delay}ms (attempt ${attempt + 2}/${maxRetries + 1})...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  return null;
}

/**
 * Get user-friendly error message for database errors
 */
export function getUserFriendlyErrorMessage(error: any): string {
  const analyzed = analyzeDatabaseError(error);
  
  if (analyzed.isConnectionIssue) {
    return 'Database connection issue. Please try again in a moment.';
  }
  
  if (analyzed.code === '23505') {
    return 'This item already exists.';
  }
  
  if (analyzed.code === '23503') {
    return 'Referenced item not found.';
  }
  
  if (analyzed.code === '42P01') {
    return 'Database table not found. Please contact support.';
  }
  
  return 'A database error occurred. Please try again.';
}