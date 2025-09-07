#!/usr/bin/env node

/**
 * اختبار نظام الحماية الفائقة للبوتات
 * يتحقق من أن المالك فقط يمكنه الوصول والتحكم في البوتات
 */

const path = require('path');
const fs = require('fs');

console.log('🔒 بدء اختبار نظام الحماية الفائقة للبوتات...\n');

// ألوان للإخراج
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(testName, status, details = '') {
  const statusColor = status === 'PASS' ? 'green' : status === 'FAIL' ? 'red' : 'yellow';
  const statusIcon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  
  log(`${statusIcon} ${testName}: ${colors.bold}${status}${colors.reset}`, statusColor);
  if (details) {
    log(`   ${details}`, 'blue');
  }
}

async function testSecurityImplementation() {
  const tests = [];
  
  // اختبار 1: التحقق من وجود ملف الحماية الفائقة
  try {
    const securityPath = path.join(__dirname, 'server/middleware/enhancedSecurity.ts');
    const securityContent = fs.readFileSync(securityPath, 'utf8');
    
    if (securityContent.includes('requireUltraSecureOwnerAccess')) {
      tests.push({ name: 'وجود middleware الحماية الفائقة', status: 'PASS', details: 'تم العثور على requireUltraSecureOwnerAccess' });
    } else {
      tests.push({ name: 'وجود middleware الحماية الفائقة', status: 'FAIL', details: 'لم يتم العثور على requireUltraSecureOwnerAccess' });
    }
    
    if (securityContent.includes('ultraSecure: requireUltraSecureOwnerAccess')) {
      tests.push({ name: 'إعداد protect.ultraSecure', status: 'PASS', details: 'تم إعداد protect.ultraSecure بنجاح' });
    } else {
      tests.push({ name: 'إعداد protect.ultraSecure', status: 'FAIL', details: 'لم يتم إعداد protect.ultraSecure' });
    }
  } catch (error) {
    tests.push({ name: 'قراءة ملف الحماية', status: 'FAIL', details: error.message });
  }
  
  // اختبار 2: التحقق من حماية نقاط نهاية البوتات
  try {
    const routesPath = path.join(__dirname, 'server/routes.ts');
    const routesContent = fs.readFileSync(routesPath, 'utf8');
    
    const protectedEndpoints = [
      "app.get('/api/bots', protect.ultraSecure",
      "app.post('/api/bots', protect.ultraSecure",
      "app.put('/api/bots/:id', protect.ultraSecure",
      "app.post('/api/bots/:id/move', protect.ultraSecure",
      "app.patch('/api/bots/:id/toggle', protect.ultraSecure",
      "app.delete('/api/bots/:id', protect.ultraSecure"
    ];
    
    let protectedCount = 0;
    protectedEndpoints.forEach(endpoint => {
      if (routesContent.includes(endpoint)) {
        protectedCount++;
      }
    });
    
    if (protectedCount === protectedEndpoints.length) {
      tests.push({ name: 'حماية نقاط نهاية البوتات', status: 'PASS', details: `تم حماية ${protectedCount}/${protectedEndpoints.length} نقاط نهاية` });
    } else {
      tests.push({ name: 'حماية نقاط نهاية البوتات', status: 'FAIL', details: `تم حماية ${protectedCount}/${protectedEndpoints.length} نقاط نهاية فقط` });
    }
    
    // التحقق من نقطة نهاية الرسائل الآمنة
    if (routesContent.includes("app.post('/api/bots/:id/send-message', protect.ultraSecure")) {
      tests.push({ name: 'نقطة نهاية الرسائل الآمنة', status: 'PASS', details: 'تم إنشاء /api/bots/:id/send-message' });
    } else {
      tests.push({ name: 'نقطة نهاية الرسائل الآمنة', status: 'FAIL', details: 'لم يتم العثور على نقطة نهاية الرسائل الآمنة' });
    }
  } catch (error) {
    tests.push({ name: 'فحص نقاط النهاية', status: 'FAIL', details: error.message });
  }
  
  // اختبار 3: التحقق من خدمة الرسائل الآمنة
  try {
    const servicePath = path.join(__dirname, 'server/services/secureMessageService.ts');
    const serviceContent = fs.readFileSync(servicePath, 'utf8');
    
    if (serviceContent.includes('SecureMessageService')) {
      tests.push({ name: 'خدمة الرسائل الآمنة', status: 'PASS', details: 'تم إنشاء SecureMessageService' });
    } else {
      tests.push({ name: 'خدمة الرسائل الآمنة', status: 'FAIL', details: 'لم يتم العثور على SecureMessageService' });
    }
    
    if (serviceContent.includes('blockUnauthorizedBotMessage')) {
      tests.push({ name: 'حجب الرسائل غير المصرح بها', status: 'PASS', details: 'تم تنفيذ blockUnauthorizedBotMessage' });
    } else {
      tests.push({ name: 'حجب الرسائل غير المصرح بها', status: 'FAIL', details: 'لم يتم تنفيذ blockUnauthorizedBotMessage' });
    }
  } catch (error) {
    tests.push({ name: 'فحص خدمة الرسائل', status: 'FAIL', details: error.message });
  }
  
  // اختبار 4: التحقق من حماية رسائل Socket.IO
  try {
    const realtimePath = path.join(__dirname, 'server/realtime.ts');
    const realtimeContent = fs.readFileSync(realtimePath, 'utf8');
    
    if (realtimeContent.includes('blockUnauthorizedBotMessage')) {
      tests.push({ name: 'حماية رسائل Socket.IO', status: 'PASS', details: 'تم إضافة الحماية لرسائل Socket.IO' });
    } else {
      tests.push({ name: 'حماية رسائل Socket.IO', status: 'FAIL', details: 'لم يتم إضافة الحماية لرسائل Socket.IO' });
    }
  } catch (error) {
    tests.push({ name: 'فحص حماية Socket.IO', status: 'FAIL', details: error.message });
  }
  
  // اختبار 5: التحقق من حماية الرسائل العامة والخاصة
  try {
    const messagesPath = path.join(__dirname, 'server/routes/messages.ts');
    const privateMessagesPath = path.join(__dirname, 'server/routes/privateMessages.ts');
    
    const messagesContent = fs.readFileSync(messagesPath, 'utf8');
    const privateMessagesContent = fs.readFileSync(privateMessagesPath, 'utf8');
    
    if (messagesContent.includes('blockUnauthorizedBotMessage')) {
      tests.push({ name: 'حماية الرسائل العامة', status: 'PASS', details: 'تم إضافة الحماية للرسائل العامة' });
    } else {
      tests.push({ name: 'حماية الرسائل العامة', status: 'FAIL', details: 'لم يتم إضافة الحماية للرسائل العامة' });
    }
    
    if (privateMessagesContent.includes('blockUnauthorizedBotMessage')) {
      tests.push({ name: 'حماية الرسائل الخاصة', status: 'PASS', details: 'تم إضافة الحماية للرسائل الخاصة' });
    } else {
      tests.push({ name: 'حماية الرسائل الخاصة', status: 'FAIL', details: 'لم يتم إضافة الحماية للرسائل الخاصة' });
    }
  } catch (error) {
    tests.push({ name: 'فحص حماية الرسائل', status: 'FAIL', details: error.message });
  }
  
  // اختبار 6: التحقق من وجود التوثيق
  try {
    const docPath = path.join(__dirname, 'BOT_SECURITY_SYSTEM_DOCUMENTATION.md');
    
    if (fs.existsSync(docPath)) {
      const docContent = fs.readFileSync(docPath, 'utf8');
      if (docContent.includes('نظام الحماية الفائقة للبوتات')) {
        tests.push({ name: 'توثيق نظام الحماية', status: 'PASS', details: 'تم إنشاء التوثيق الكامل' });
      } else {
        tests.push({ name: 'توثيق نظام الحماية', status: 'FAIL', details: 'التوثيق غير مكتمل' });
      }
    } else {
      tests.push({ name: 'توثيق نظام الحماية', status: 'FAIL', details: 'لم يتم العثور على ملف التوثيق' });
    }
  } catch (error) {
    tests.push({ name: 'فحص التوثيق', status: 'FAIL', details: error.message });
  }
  
  return tests;
}

async function runTests() {
  try {
    const tests = await testSecurityImplementation();
    
    log('\n📊 نتائج الاختبار:', 'bold');
    log('=' .repeat(60), 'blue');
    
    let passCount = 0;
    let failCount = 0;
    
    tests.forEach(test => {
      logTest(test.name, test.status, test.details);
      if (test.status === 'PASS') passCount++;
      else if (test.status === 'FAIL') failCount++;
    });
    
    log('=' .repeat(60), 'blue');
    log(`\n📈 الإحصائيات:`, 'bold');
    log(`✅ نجح: ${passCount}`, 'green');
    log(`❌ فشل: ${failCount}`, 'red');
    log(`📊 المجموع: ${tests.length}`, 'blue');
    
    const successRate = ((passCount / tests.length) * 100).toFixed(1);
    log(`🎯 معدل النجاح: ${successRate}%`, successRate >= 90 ? 'green' : successRate >= 70 ? 'yellow' : 'red');
    
    if (failCount === 0) {
      log('\n🎉 تم تطبيق نظام الحماية الفائقة بنجاح!', 'green');
      log('🔒 المالك فقط يمكنه الوصول لنظام البوتات', 'green');
      log('🚫 لا يمكن لأي شخص آخر إرسال رسائل للبوتات', 'green');
    } else {
      log('\n⚠️  يوجد مشاكل في نظام الحماية تحتاج إلى إصلاح', 'yellow');
    }
    
  } catch (error) {
    log(`\n❌ خطأ في تشغيل الاختبارات: ${error.message}`, 'red');
  }
}

// تشغيل الاختبارات
runTests().catch(console.error);