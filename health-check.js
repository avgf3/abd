#!/usr/bin/env node

/**
 * سكريبت فحص شامل للنظام
 * يتحقق من جميع المكونات الحرجة
 */

import https from 'node:https';
import http from 'node:http';
import { URL } from 'node:url';
import fs from 'node:fs';

// الألوان للطباعة
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// قراءة URL من البيئة أو استخدام القيمة الافتراضية
const APP_URL = process.env.RENDER_EXTERNAL_URL || process.env.APP_URL || 'http://localhost:5000';

async function checkEndpoint(endpoint, method = 'GET', expectedStatus = 200) {
  return new Promise((resolve) => {
    const url = new URL(endpoint, APP_URL);
    const protocol = url.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'User-Agent': 'HealthCheck/1.0',
        'Accept': 'application/json',
      },
      timeout: 10000
    };

    const req = protocol.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const success = res.statusCode === expectedStatus;
        resolve({
          endpoint,
          status: res.statusCode,
          success,
          data: data.substring(0, 100), // أول 100 حرف فقط
          headers: res.headers
        });
      });
    });

    req.on('error', (error) => {
      resolve({
        endpoint,
        status: 0,
        success: false,
        error: error.message
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        endpoint,
        status: 0,
        success: false,
        error: 'Timeout'
      });
    });

    req.end();
  });
}

async function checkWebSocket() {
  return new Promise(async (resolve) => {
    try {
      const { io } = await import('socket.io-client');
      const socket = io(APP_URL, {
        path: '/socket.io',
        transports: ['polling', 'websocket'],
        timeout: 10000,
        reconnection: false
      });

      const timeout = setTimeout(() => {
        socket.disconnect();
        resolve({
          endpoint: 'WebSocket',
          success: false,
          error: 'Connection timeout'
        });
      }, 10000);

      socket.on('connect', () => {
        clearTimeout(timeout);
        const transport = socket.io.engine.transport.name;
        socket.disconnect();
        resolve({
          endpoint: 'WebSocket',
          success: true,
          transport
        });
      });

      socket.on('connect_error', (error) => {
        clearTimeout(timeout);
        resolve({
          endpoint: 'WebSocket',
          success: false,
          error: error.message
        });
      });
    } catch (error) {
      resolve({
        endpoint: 'WebSocket',
        success: false,
        error: 'Socket.IO client not available'
      });
    }
  });
}

async function runHealthCheck() {
  log('\n========================================', 'cyan');
  log('🔍 بدء الفحص الشامل للنظام', 'cyan');
  log(`📍 URL: ${APP_URL}`, 'cyan');
  log('========================================\n', 'cyan');

  const checks = [
    // فحص الصحة الأساسي
    { name: 'Health Check', check: () => checkEndpoint('/api/health') },
    
    // فحص الغرف
    { name: 'Rooms API', check: () => checkEndpoint('/api/rooms') },
    
    // فحص المستخدمين
    { name: 'Users API', check: () => checkEndpoint('/api/users') },
    
    // فحص الرسائل (المسار الصحيح للرسائل العامة)
    { name: 'Messages API', check: () => checkEndpoint('/api/messages/public') },
    
    // فحص الإعدادات
    { name: 'Settings API', check: () => checkEndpoint('/api/settings/site-theme') },
    
    // فحص WebSocket
    { name: 'WebSocket', check: () => checkWebSocket() },
    
    // فحص الملفات الثابتة
    { name: 'Static Files', check: () => checkEndpoint('/') },
    
    // فحص رفع الملفات (OPTIONS) مع ترويسات CORS قياسية
    { name: 'Upload CORS', check: () => checkEndpoint('/api/upload/profile-image?cors=1', 'OPTIONS', 204) },
  ];

  let successCount = 0;
  let failureCount = 0;
  const results = [];

  for (const { name, check } of checks) {
    process.stdout.write(`⏳ فحص ${name}...`);
    const result = await check();
    results.push({ name, ...result });
    
    if (result.success) {
      successCount++;
      process.stdout.write(`\r✅ ${name}: نجح\n`);
      if (result.transport) {
        log(`   Transport: ${result.transport}`, 'blue');
      }
    } else {
      failureCount++;
      process.stdout.write(`\r❌ ${name}: فشل\n`);
      log(`   Error: ${result.error || `Status ${result.status}`}`, 'red');
    }
  }

  // النتائج النهائية
  log('\n========================================', 'cyan');
  log('📊 النتائج النهائية:', 'cyan');
  log('========================================\n', 'cyan');
  
  log(`✅ نجح: ${successCount}`, 'green');
  log(`❌ فشل: ${failureCount}`, failureCount > 0 ? 'red' : 'green');
  
  const healthPercentage = Math.round((successCount / checks.length) * 100);
  
  if (healthPercentage === 100) {
    log('\n🎉 النظام يعمل بشكل مثالي!', 'green');
  } else if (healthPercentage >= 75) {
    log('\n⚠️ النظام يعمل مع بعض المشاكل', 'yellow');
  } else if (healthPercentage >= 50) {
    log('\n⚠️ النظام يواجه مشاكل متعددة', 'yellow');
  } else {
    log('\n🚨 النظام يواجه مشاكل خطيرة!', 'red');
  }
  
  log(`\n📈 صحة النظام: ${healthPercentage}%\n`, healthPercentage >= 75 ? 'green' : 'red');

  // حفظ التقرير
  const report = {
    timestamp: new Date().toISOString(),
    url: APP_URL,
    healthPercentage,
    successCount,
    failureCount,
    results
  };

  const reportPath = 'health-report.json';
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  log(`📄 تم حفظ التقرير في: ${reportPath}`, 'blue');

  process.exit(failureCount > 0 ? 1 : 0);
}

// تشغيل الفحص
runHealthCheck().catch(error => {
  log(`\n🚨 خطأ في تشغيل الفحص: ${error.message}`, 'red');
  process.exit(1);
});