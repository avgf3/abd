/**
 * Database startup and initialization utilities
 * Ensures proper database connection and recovery on startup
 */

import { initializeDatabase, checkDatabaseHealth, recoverDatabaseConnection, getDatabaseStatus } from '../database-adapter';
import { initializeSystem } from '../database-setup';

export interface StartupResult {
  success: boolean;
  message: string;
  retryAfter?: number;
}

/**
 * Comprehensive database startup with retry logic
 */
export async function startupDatabase(maxRetries: number = 5): Promise<StartupResult> {
  console.log('🚀 Starting database initialization...');
  
  let attempt = 0;
  let lastError: any = null;
  
  while (attempt < maxRetries) {
    attempt++;
    
    try {
      console.log(`📡 Database connection attempt ${attempt}/${maxRetries}...`);
      
      // Try to initialize the database
      const initialized = await initializeDatabase();
      
      if (!initialized) {
        throw new Error('Database initialization failed');
      }
      
      // Check health after initialization
      const isHealthy = await checkDatabaseHealth();
      
      if (!isHealthy) {
        throw new Error('Database health check failed after initialization');
      }
      
      // Initialize system (create tables, default data, etc.)
      console.log('🏗️ Initializing database system...');
      const systemInitialized = await initializeSystem();
      
      if (!systemInitialized) {
        console.warn('⚠️ System initialization had issues, but database is connected');
      }
      
      // Final health check
      const finalHealthCheck = await checkDatabaseHealth();
      
      if (!finalHealthCheck) {
        throw new Error('Final database health check failed');
      }
      
      const status = getDatabaseStatus();
      console.log('✅ Database startup successful!', {
        type: status.type,
        environment: status.environment,
        connected: status.connected
      });
      
      return {
        success: true,
        message: 'Database initialized and healthy'
      };
      
    } catch (error: any) {
      lastError = error;
      const errorMessage = error?.message || 'Unknown error';
      
      console.error(`❌ Database startup attempt ${attempt} failed:`, errorMessage);
      
      // If this isn't the last attempt, wait before retrying
      if (attempt < maxRetries) {
        const delay = Math.min(5000 * attempt, 30000); // Exponential backoff, max 30s
        console.log(`⏳ Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Try recovery before next attempt
        if (attempt > 1) {
          console.log('🔄 Attempting connection recovery...');
          try {
            await recoverDatabaseConnection();
          } catch (recoveryError) {
            console.warn('Recovery attempt failed:', (recoveryError as any)?.message);
          }
        }
      }
    }
  }
  
  // All attempts failed
  const errorMessage = lastError?.message || 'Database startup failed after all attempts';
  console.error('💥 Database startup completely failed:', errorMessage);
  
  return {
    success: false,
    message: errorMessage,
    retryAfter: 60000 // Suggest retry after 1 minute
  };
}

/**
 * Validate database configuration before startup
 */
export function validateDatabaseConfig(): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  
  // Check required environment variables
  if (!process.env.DATABASE_URL) {
    issues.push('DATABASE_URL environment variable is missing');
  }
  
  const databaseUrl = process.env.DATABASE_URL || '';
  
  // Validate URL format
  if (databaseUrl && !databaseUrl.match(/^postgres(ql)?:\/\//)) {
    issues.push('DATABASE_URL must be a PostgreSQL connection string');
  }
  
  // Check for common configuration issues
  if (databaseUrl.includes('localhost') && process.env.NODE_ENV === 'production') {
    issues.push('Using localhost database URL in production environment');
  }
  
  // Validate pool configuration
  const poolMax = Number(process.env.DB_POOL_MAX || 0);
  if (poolMax > 100 && !process.env.USE_PGBOUNCER) {
    issues.push('High DB_POOL_MAX without PgBouncer may cause connection exhaustion');
  }
  
  return {
    valid: issues.length === 0,
    issues
  };
}

/**
 * Log database configuration for debugging
 */
export function logDatabaseConfig(): void {
  const config = {
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL ? 
      process.env.DATABASE_URL.replace(/:[^:]*@/, ':***@') : 'Not set',
    DB_POOL_MAX: process.env.DB_POOL_MAX || 'Default',
    DB_POOL_MIN: process.env.DB_POOL_MIN || 'Default',
    DB_IDLE_TIMEOUT: process.env.DB_IDLE_TIMEOUT || 'Default',
    DB_MAX_LIFETIME: process.env.DB_MAX_LIFETIME || 'Default',
    USE_PGBOUNCER: process.env.USE_PGBOUNCER || 'false',
    DB_NO_LIMITS: process.env.DB_NO_LIMITS || 'false'
  };
  
  console.log('📊 Database Configuration:', config);
}