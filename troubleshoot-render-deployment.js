#!/usr/bin/env node

/**
 * Render Deployment Troubleshooting Script
 * يساعد في تشخيص وإصلاح مشاكل النشر على Render
 */

const https = require('https');
const http = require('http');

const RENDER_URL = 'https://abd-ylo2.onrender.com';
const ENDPOINTS_TO_CHECK = [
  '/api/health',
  '/api/ping',
  '/api/socket-status',
  '/socket.io/?EIO=4&transport=polling',
  '/svgs/crown.svg',
];

console.log('🔍 بدء فحص نشر Render...\n');

async function checkEndpoint(url) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const request = https.get(url, (res) => {
      const duration = Date.now() - startTime;
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        resolve({
          url,
          status: res.statusCode,
          duration,
          headers: res.headers,
          data: data.length > 1000 ? data.substring(0, 1000) + '...' : data,
          success: res.statusCode >= 200 && res.statusCode < 400,
        });
      });
    });

    request.on('error', (error) => {
      resolve({
        url,
        status: 0,
        duration: Date.now() - startTime,
        error: error.message,
        success: false,
      });
    });

    request.setTimeout(30000, () => {
      request.destroy();
      resolve({
        url,
        status: 0,
        duration: 30000,
        error: 'Timeout after 30 seconds',
        success: false,
      });
    });
  });
}

async function runDiagnostics() {
  console.log(`📡 فحص الخادم: ${RENDER_URL}\n`);

  const results = [];

  for (const endpoint of ENDPOINTS_TO_CHECK) {
    const fullUrl = RENDER_URL + endpoint;
    console.log(`🔍 فحص: ${endpoint}`);

    const result = await checkEndpoint(fullUrl);
    results.push(result);

    if (result.success) {
      console.log(`✅ ${endpoint} - ${result.status} (${result.duration}ms)`);
    } else {
      console.log(`❌ ${endpoint} - ${result.status || 'FAILED'} (${result.duration}ms)`);
      if (result.error) {
        console.log(`   خطأ: ${result.error}`);
      }
    }

    // إضافة تأخير قصير بين الطلبات
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  console.log('\n📊 ملخص النتائج:');
  console.log('='.repeat(50));

  const successful = results.filter((r) => r.success).length;
  const failed = results.length - successful;

  console.log(`✅ نجح: ${successful}/${results.length}`);
  console.log(`❌ فشل: ${failed}/${results.length}`);

  if (failed > 0) {
    console.log('\n🚨 المشاكل المكتشفة:');
    results
      .filter((r) => !r.success)
      .forEach((result) => {
        console.log(`- ${result.url}: ${result.error || `HTTP ${result.status}`}`);
      });

    console.log('\n💡 الحلول المقترحة:');

    // تحليل أنواع الأخطاء وتقديم حلول
    const errors = results.filter((r) => !r.success);

    if (errors.some((e) => e.status === 502 || e.error?.includes('502'))) {
      console.log('🔧 خطأ 502 Bad Gateway:');
      console.log('   - الخادم غير متاح أو لم يبدأ بعد');
      console.log('   - تحقق من سجلات Render للأخطاء');
      console.log('   - قد تحتاج لإعادة نشر التطبيق');
    }

    if (errors.some((e) => e.status === 500)) {
      console.log('🔧 خطأ 500 Internal Server Error:');
      console.log('   - مشكلة في كود الخادم');
      console.log('   - تحقق من متغيرات البيئة');
      console.log('   - تحقق من اتصال قاعدة البيانات');
    }

    if (errors.some((e) => e.error?.includes('timeout') || e.error?.includes('ECONNRESET'))) {
      console.log('🔧 مشاكل الاتصال:');
      console.log('   - الخادم بطيء في الاستجابة');
      console.log('   - قد تحتاج لزيادة timeout');
      console.log('   - تحقق من موارد الخادم');
    }

    console.log('\n📋 خطوات الإصلاح:');
    console.log('1. تحقق من سجلات Render: https://dashboard.render.com');
    console.log('2. تأكد من متغيرات البيئة');
    console.log('3. تحقق من اتصال قاعدة البيانات');
    console.log('4. أعد نشر التطبيق إذا لزم الأمر');
    console.log('5. تحقق من استخدام الموارد (CPU/Memory)');
  } else {
    console.log('\n🎉 جميع الخدمات تعمل بشكل صحيح!');
  }

  console.log('\n🔗 روابط مفيدة:');
  console.log(`- صحة النظام: ${RENDER_URL}/api/health`);
  console.log(`- حالة Socket.IO: ${RENDER_URL}/api/socket-status`);
  console.log(`- اختبار سريع: ${RENDER_URL}/api/ping`);
  console.log('- لوحة تحكم Render: https://dashboard.render.com');
}

// تشغيل التشخيص
runDiagnostics().catch((error) => {
  console.error('❌ خطأ في تشغيل التشخيص:', error);
  process.exit(1);
});
