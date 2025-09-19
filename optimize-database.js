#!/usr/bin/env node

/**
 * Database Optimization Script
 * Run this script to optimize database performance and fix timeout issues
 */

import 'dotenv/config';
import { initializeDatabase } from './server/database-setup';
import { optimizeDatabaseIndexes, checkDatabasePerformance } from './server/utils/database-optimization';

async function main() {
  console.log('🚀 Starting database optimization...');
  
  try {
    // Initialize database connection
    const initialized = await initializeDatabase();
    if (!initialized) {
      console.error('❌ Failed to initialize database');
      process.exit(1);
    }
    
    console.log('✅ Database initialized successfully');
    
    // Check current performance
    await checkDatabasePerformance();
    
    // Optimize indexes
    await optimizeDatabaseIndexes();
    
    // Check performance again
    console.log('\n🔍 Performance check after optimization:');
    await checkDatabasePerformance();
    
    console.log('\n✅ Database optimization completed successfully!');
    console.log('📈 Your database should now perform better and have fewer timeout issues.');
    
  } catch (error) {
    console.error('❌ Database optimization failed:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

main();