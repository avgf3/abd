#!/usr/bin/env node

/**
 * سكريبت اختبار الضغط الشامل للسيرفر
 * يختبر جميع التحسينات المطبقة
 */

const http = require('http');
const https = require('https');
const { performance } = require('perf_hooks');

// إعدادات الاختبار
const CONFIG = {
  host: process.env.TEST_HOST || 'localhost',
  port: process.env.TEST_PORT || 5000,
  protocol: process.env.TEST_PROTOCOL || 'http',
  // عدد المستخدمين المتزامنين
  concurrentUsers: parseInt(process.env.CONCURRENT_USERS) || 100,
  // مدة الاختبار بالثواني
  testDuration: parseInt(process.env.TEST_DURATION) || 30,
  // تأخير بين الطلبات لكل مستخدم (ms)
  requestDelay: parseInt(process.env.REQUEST_DELAY) || 100,
};

// إحصائيات الاختبار
const stats = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  responseTimes: [],
  statusCodes: {},
  errors: [],
  cacheHits: 0,
  cacheMisses: 0,
  startTime: 0,
  endTime: 0,
};

// نقاط النهاية للاختبار
const endpoints = [
  { path: '/health', weight: 30, name: 'Health Check' },
  { path: '/api/rooms', weight: 25, name: 'Get Rooms' },
  { path: '/api/messages/room/general', weight: 20, name: 'Get Messages' },
  { path: '/api/users/online', weight: 15, name: 'Online Users' },
  { path: '/api/profile/1', weight: 10, name: 'User Profile' },
];

/**
 * إرسال طلب HTTP/HTTPS
 */
function makeRequest(endpoint) {
  return new Promise((resolve, reject) => {
    const startTime = performance.now();
    const client = CONFIG.protocol === 'https' ? https : http;
    
    const options = {
      hostname: CONFIG.host,
      port: CONFIG.port,
      path: endpoint.path,
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'StressTest/1.0',
        // إضافة رأس للتحقق من الكاش
        'Cache-Control': 'max-age=0',
      },
      timeout: 10000, // 10 ثواني timeout
    };
    
    const req = client.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        // تسجيل الإحصائيات
        stats.totalRequests++;
        stats.responseTimes.push(responseTime);
        stats.statusCodes[res.statusCode] = (stats.statusCodes[res.statusCode] || 0) + 1;
        
        if (res.statusCode >= 200 && res.statusCode < 300) {
          stats.successfulRequests++;
        } else {
          stats.failedRequests++;
        }
        
        // التحقق من الكاش
        const cacheHeader = res.headers['x-cache'];
        if (cacheHeader === 'HIT') {
          stats.cacheHits++;
        } else if (cacheHeader === 'MISS') {
          stats.cacheMisses++;
        }
        
        resolve({
          endpoint: endpoint.name,
          statusCode: res.statusCode,
          responseTime,
          cacheStatus: cacheHeader,
          responseSize: data.length,
        });
      });
    });
    
    req.on('error', (error) => {
      stats.failedRequests++;
      stats.errors.push({
        endpoint: endpoint.name,
        error: error.message,
        time: new Date().toISOString(),
      });
      reject(error);
    });
    
    req.on('timeout', () => {
      req.destroy();
      stats.failedRequests++;
      stats.errors.push({
        endpoint: endpoint.name,
        error: 'Request timeout',
        time: new Date().toISOString(),
      });
      reject(new Error('Request timeout'));
    });
    
    req.end();
  });
}

/**
 * اختيار نقطة نهاية عشوائية بناءً على الوزن
 */
function selectRandomEndpoint() {
  const totalWeight = endpoints.reduce((sum, ep) => sum + ep.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const endpoint of endpoints) {
    random -= endpoint.weight;
    if (random <= 0) {
      return endpoint;
    }
  }
  
  return endpoints[0];
}

/**
 * محاكاة مستخدم واحد
 */
async function simulateUser(userId) {
  const userStartTime = Date.now();
  const testEndTime = stats.startTime + (CONFIG.testDuration * 1000);
  
  console.log(`👤 المستخدم ${userId} بدأ الاختبار`);
  
  while (Date.now() < testEndTime) {
    const endpoint = selectRandomEndpoint();
    
    try {
      await makeRequest(endpoint);
      
      // تأخير عشوائي بين الطلبات
      const delay = CONFIG.requestDelay + Math.random() * CONFIG.requestDelay;
      await new Promise(resolve => setTimeout(resolve, delay));
    } catch (error) {
      // تسجيل الخطأ والمتابعة
      console.error(`❌ خطأ للمستخدم ${userId}:`, error.message);
    }
  }
  
  const userDuration = (Date.now() - userStartTime) / 1000;
  console.log(`✅ المستخدم ${userId} أنهى الاختبار (${userDuration.toFixed(1)}s)`);
}

/**
 * حساب الإحصائيات النهائية
 */
function calculateStats() {
  const duration = (stats.endTime - stats.startTime) / 1000;
  const avgResponseTime = stats.responseTimes.reduce((a, b) => a + b, 0) / stats.responseTimes.length || 0;
  const sortedTimes = [...stats.responseTimes].sort((a, b) => a - b);
  const p50 = sortedTimes[Math.floor(sortedTimes.length * 0.5)] || 0;
  const p95 = sortedTimes[Math.floor(sortedTimes.length * 0.95)] || 0;
  const p99 = sortedTimes[Math.floor(sortedTimes.length * 0.99)] || 0;
  const requestsPerSecond = stats.totalRequests / duration;
  const successRate = (stats.successfulRequests / stats.totalRequests * 100) || 0;
  const cacheHitRate = (stats.cacheHits / (stats.cacheHits + stats.cacheMisses) * 100) || 0;
  
  return {
    duration: duration.toFixed(2),
    totalRequests: stats.totalRequests,
    successfulRequests: stats.successfulRequests,
    failedRequests: stats.failedRequests,
    successRate: successRate.toFixed(2),
    requestsPerSecond: requestsPerSecond.toFixed(2),
    avgResponseTime: avgResponseTime.toFixed(2),
    p50ResponseTime: p50.toFixed(2),
    p95ResponseTime: p95.toFixed(2),
    p99ResponseTime: p99.toFixed(2),
    minResponseTime: Math.min(...stats.responseTimes).toFixed(2),
    maxResponseTime: Math.max(...stats.responseTimes).toFixed(2),
    cacheHits: stats.cacheHits,
    cacheMisses: stats.cacheMisses,
    cacheHitRate: cacheHitRate.toFixed(2),
    statusCodes: stats.statusCodes,
    errors: stats.errors.length,
  };
}

/**
 * طباعة التقرير النهائي
 */
function printReport(results) {
  console.log('\n' + '='.repeat(60));
  console.log('📊 تقرير اختبار الضغط الشامل');
  console.log('='.repeat(60));
  
  console.log('\n⚙️  إعدادات الاختبار:');
  console.log(`  - الخادم: ${CONFIG.protocol}://${CONFIG.host}:${CONFIG.port}`);
  console.log(`  - المستخدمون المتزامنون: ${CONFIG.concurrentUsers}`);
  console.log(`  - مدة الاختبار: ${CONFIG.testDuration} ثانية`);
  
  console.log('\n📈 النتائج الإجمالية:');
  console.log(`  - إجمالي الطلبات: ${results.totalRequests}`);
  console.log(`  - الطلبات الناجحة: ${results.successfulRequests} (${results.successRate}%)`);
  console.log(`  - الطلبات الفاشلة: ${results.failedRequests}`);
  console.log(`  - معدل الطلبات: ${results.requestsPerSecond} طلب/ثانية`);
  
  console.log('\n⏱️  أوقات الاستجابة (ms):');
  console.log(`  - المتوسط: ${results.avgResponseTime}`);
  console.log(`  - P50: ${results.p50ResponseTime}`);
  console.log(`  - P95: ${results.p95ResponseTime}`);
  console.log(`  - P99: ${results.p99ResponseTime}`);
  console.log(`  - الأدنى: ${results.minResponseTime}`);
  console.log(`  - الأقصى: ${results.maxResponseTime}`);
  
  console.log('\n💾 إحصائيات الكاش:');
  console.log(`  - Cache Hits: ${results.cacheHits}`);
  console.log(`  - Cache Misses: ${results.cacheMisses}`);
  console.log(`  - معدل Cache Hit: ${results.cacheHitRate}%`);
  
  console.log('\n📊 رموز الحالة:');
  Object.entries(results.statusCodes).forEach(([code, count]) => {
    console.log(`  - ${code}: ${count}`);
  });
  
  if (results.errors > 0) {
    console.log(`\n⚠️  الأخطاء: ${results.errors}`);
    stats.errors.slice(0, 5).forEach(error => {
      console.log(`  - ${error.endpoint}: ${error.error}`);
    });
  }
  
  console.log('\n' + '='.repeat(60));
  
  // تقييم الأداء
  console.log('\n🎯 تقييم الأداء:');
  
  if (results.successRate >= 99) {
    console.log('  ✅ معدل النجاح ممتاز');
  } else if (results.successRate >= 95) {
    console.log('  ⚠️  معدل النجاح جيد ولكن يمكن تحسينه');
  } else {
    console.log('  ❌ معدل النجاح منخفض - يحتاج تحسين');
  }
  
  if (results.p95ResponseTime <= 100) {
    console.log('  ✅ أوقات الاستجابة ممتازة');
  } else if (results.p95ResponseTime <= 500) {
    console.log('  ⚠️  أوقات الاستجابة مقبولة');
  } else {
    console.log('  ❌ أوقات الاستجابة بطيئة - يحتاج تحسين');
  }
  
  if (results.cacheHitRate >= 30) {
    console.log('  ✅ معدل استخدام الكاش جيد');
  } else {
    console.log('  ⚠️  معدل استخدام الكاش منخفض');
  }
  
  console.log('\n' + '='.repeat(60));
}

/**
 * تشغيل اختبار الضغط
 */
async function runStressTest() {
  console.log('🚀 بدء اختبار الضغط الشامل...\n');
  
  stats.startTime = Date.now();
  
  // إنشاء المستخدمين المتزامنين
  const userPromises = [];
  for (let i = 1; i <= CONFIG.concurrentUsers; i++) {
    // تأخير بسيط بين بدء كل مستخدم لتجنب الضغط المفاجئ
    await new Promise(resolve => setTimeout(resolve, 10));
    userPromises.push(simulateUser(i));
  }
  
  // انتظار انتهاء جميع المستخدمين
  await Promise.allSettled(userPromises);
  
  stats.endTime = Date.now();
  
  // حساب وطباعة النتائج
  const results = calculateStats();
  printReport(results);
  
  // حفظ النتائج في ملف
  const reportFile = `stress-test-report-${new Date().toISOString().replace(/:/g, '-')}.json`;
  require('fs').writeFileSync(reportFile, JSON.stringify({
    config: CONFIG,
    results,
    stats,
  }, null, 2));
  console.log(`\n💾 تم حفظ التقرير في: ${reportFile}`);
}

// معالجة إشارة الإيقاف
process.on('SIGINT', () => {
  console.log('\n\n⚠️  تم إيقاف الاختبار...');
  stats.endTime = Date.now();
  const results = calculateStats();
  printReport(results);
  process.exit(0);
});

// تشغيل الاختبار
runStressTest().catch(error => {
  console.error('❌ خطأ في تشغيل الاختبار:', error);
  process.exit(1);
});