
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../shared/schema';
import { eq } from 'drizzle-orm';

// Database connection with optimizations
const connectionString = process.env.DATABASE_URL || 'postgresql://localhost:5432/chat_db';

const queryClient = postgres(connectionString, {
  prepare: false,
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(queryClient, { schema });
export const dbType = 'postgresql';

// Connection test function
export async function testConnection() {
  try {
    await queryClient`SELECT 1`;
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

// Graceful shutdown
export function closeConnection() {
  return queryClient.end();
}
