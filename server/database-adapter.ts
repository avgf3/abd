import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as pgSchema from '../shared/schema';

export interface DatabaseAdapter {
  db: any;
  isConnected: boolean;
  healthCheck: () => Promise<boolean>;
}

export function createDatabaseAdapter(): DatabaseAdapter {
  const DATABASE_URL = process.env.DATABASE_URL;
  
  if (!DATABASE_URL) {
    console.error('DATABASE_URL is not defined');
    return {
      db: null,
      isConnected: false,
      healthCheck: async () => false
    };
  }

  try {
    const sql = neon(DATABASE_URL);
    const db = drizzle(sql as any, { schema: pgSchema });
    
    return {
      db,
      isConnected: true,
      healthCheck: async () => {
        try {
          await sql`SELECT 1`;
          return true;
        } catch (error) {
          console.error('Database health check failed:', error);
          return false;
        }
      }
    };
  } catch (error) {
    console.error('Failed to create database adapter:', error);
    return {
      db: null,
      isConnected: false,
      healthCheck: async () => false
    };
  }
}

// Create the database adapter instance
const dbAdapter = createDatabaseAdapter();
export const db = dbAdapter.db;

// Database status interface
export interface DatabaseStatus {
  isConnected: boolean;
  health: boolean;
  timestamp: Date;
}

// Get database status
export async function getDatabaseStatus(): Promise<DatabaseStatus> {
  const health = await dbAdapter.healthCheck();
  
  return {
    isConnected: dbAdapter.isConnected,
    health,
    timestamp: new Date()
  };
}

// Reconnect to database
export async function reconnectDatabase(): Promise<boolean> {
  try {
    const newAdapter = createDatabaseAdapter();
    if (newAdapter.isConnected) {
      Object.assign(dbAdapter, newAdapter);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Failed to reconnect to database:', error);
    return false;
  }
}

// Check database health
export async function checkDatabaseHealth(): Promise<boolean> {
  return await dbAdapter.healthCheck();
}