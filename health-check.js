#!/usr/bin/env node

/**
 * Enhanced Health Check Script for Render
 * 
 * This script provides comprehensive health monitoring
 * for the deployed application on Render
 */

import dotenv from 'dotenv';
import postgres from 'postgres';

dotenv.config();

const PORT = process.env.PORT || 10000;
const DATABASE_URL = process.env.DATABASE_URL;

console.log('🏥 بدء فحص صحة التطبيق...\n');

// Basic health check
function basicHealthCheck() {
  console.log('📊 فحص أساسي:');
  console.log(`   - المنفذ: ${PORT}`);
  console.log(`   - البيئة: ${process.env.NODE_ENV}`);
  console.log(`   - قاعدة البيانات: ${DATABASE_URL ? '✅ محدد' : '❌ غير محدد'}`);
  console.log(`   - اتصالات قاعدة البيانات: ${process.env.DB_MAX_CONNECTIONS || 'غير محدد'}`);
  
  return {
    port: PORT,
    environment: process.env.NODE_ENV,
    databaseConfigured: !!DATABASE_URL,
    maxConnections: process.env.DB_MAX_CONNECTIONS
  };
}

// Database health check
async function databaseHealthCheck() {
  console.log('\n🔗 فحص صحة قاعدة البيانات...');
  
  if (!DATABASE_URL) {
    console.log('⚠️ DATABASE_URL غير محدد - تخطي فحص قاعدة البيانات');
    return { connected: false, error: 'DATABASE_URL not configured' };
  }
  
  try {
    const client = postgres(DATABASE_URL, {
      ssl: 'require',
      max: 1,
      idle_timeout: 5,
      connect_timeout: 30,
      prepare: false,
    });
    
    const startTime = Date.now();
    await client`select 1 as health_check`;
    const responseTime = Date.now() - startTime;
    await client.end();
    
    console.log(`✅ قاعدة البيانات متصلة (${responseTime}ms)`);
    return { 
      connected: true, 
      responseTime,
      error: null 
    };
  } catch (error) {
    console.log(`❌ فشل الاتصال بقاعدة البيانات: ${error.message}`);
    return { 
      connected: false, 
      error: error.message 
    };
  }
}

// Memory usage check
function memoryHealthCheck() {
  console.log('\n💾 فحص استخدام الذاكرة...');
  
  const memUsage = process.memoryUsage();
  const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
  const externalMB = Math.round(memUsage.external / 1024 / 1024);
  
  console.log(`   - الذاكرة المستخدمة: ${heapUsedMB}MB`);
  console.log(`   - إجمالي الذاكرة: ${heapTotalMB}MB`);
  console.log(`   - الذاكرة الخارجية: ${externalMB}MB`);
  
  const memoryHealthy = heapUsedMB < 400; // Render Free Tier limit is ~512MB
  
  if (memoryHealthy) {
    console.log('✅ استخدام الذاكرة طبيعي');
  } else {
    console.log('⚠️ استخدام الذاكرة مرتفع');
  }
  
  return {
    heapUsed: heapUsedMB,
    heapTotal: heapTotalMB,
    external: externalMB,
    healthy: memoryHealthy
  };
}

// Uptime check
function uptimeCheck() {
  console.log('\n⏰ فحص وقت التشغيل...');
  
  const uptime = Math.floor(process.uptime());
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = uptime % 60;
  
  console.log(`   - وقت التشغيل: ${hours}س ${minutes}د ${seconds}ث`);
  
  return {
    uptime,
    formatted: `${hours}h ${minutes}m ${seconds}s`
  };
}

// Generate health report
function generateHealthReport(results) {
  console.log('\n' + '='.repeat(50));
  console.log('📋 تقرير صحة التطبيق:');
  console.log('='.repeat(50));
  
  const overallHealth = results.basic.databaseConfigured && 
                      results.database.connected && 
                      results.memory.healthy;
  
  console.log(`الحالة العامة: ${overallHealth ? '✅ صحية' : '⚠️ تحتاج انتباه'}`);
  console.log('');
  
  console.log('📊 التفاصيل:');
  console.log(`   - المنفذ: ${results.basic.port}`);
  console.log(`   - البيئة: ${results.basic.environment}`);
  console.log(`   - قاعدة البيانات: ${results.database.connected ? '✅ متصلة' : '❌ غير متصلة'}`);
  if (results.database.responseTime) {
    console.log(`   - سرعة الاستجابة: ${results.database.responseTime}ms`);
  }
  console.log(`   - الذاكرة: ${results.memory.heapUsed}MB / ${results.memory.heapTotal}MB`);
  console.log(`   - وقت التشغيل: ${results.uptime.formatted}`);
  
  if (!overallHealth) {
    console.log('\n⚠️ المشاكل المكتشفة:');
    if (!results.basic.databaseConfigured) {
      console.log('   - DATABASE_URL غير محدد');
    }
    if (!results.database.connected) {
      console.log(`   - قاعدة البيانات غير متصلة: ${results.database.error}`);
    }
    if (!results.memory.healthy) {
      console.log('   - استخدام الذاكرة مرتفع');
    }
  }
  
  return overallHealth;
}

// Main execution
async function main() {
  try {
    const basic = basicHealthCheck();
    const database = await databaseHealthCheck();
    const memory = memoryHealthCheck();
    const uptime = uptimeCheck();
    
    const results = { basic, database, memory, uptime };
    const healthy = generateHealthReport(results);
    
    // Return appropriate exit code
    process.exit(healthy ? 0 : 1);
    
  } catch (error) {
    console.error('\n💥 خطأ في فحص الصحة:', error.message);
    process.exit(1);
  }
}

// Run the health check
main();