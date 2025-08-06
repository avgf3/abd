#!/usr/bin/env node

// Load environment variables if dotenv is available
try {
  require('dotenv').config();
} catch (e) {
  console.log('⚠️ dotenv not available, using system environment variables only');
}

console.log('🔍 فحص متغيرات البيئة...');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);
console.log('DATABASE_URL present:', !!process.env.DATABASE_URL);
console.log('DATABASE_URL length:', process.env.DATABASE_URL?.length || 0);

if (process.env.DATABASE_URL) {
  const url = process.env.DATABASE_URL;
  const maskedUrl = url.substring(0, 20) + '...' + url.substring(url.length - 20);
  console.log('DATABASE_URL (masked):', maskedUrl);
  
  // Check URL format
  if (url.startsWith('postgresql://') || url.startsWith('postgres://')) {
    console.log('✅ DATABASE_URL format looks correct');
  } else {
    console.log('❌ DATABASE_URL format is incorrect');
  }
} else {
  console.log('❌ DATABASE_URL is not set');
  console.log('Available environment variables:');
  Object.keys(process.env)
    .filter(key => key.includes('DATABASE') || key.includes('DB'))
    .forEach(key => console.log(`  ${key}: ${!!process.env[key]}`));
}

console.log('✅ فحص متغيرات البيئة مكتمل');