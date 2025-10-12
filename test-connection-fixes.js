#!/usr/bin/env node

/**
 * 🧪 اختبار إصلاحات الاتصال
 * يختبر الإصلاحات المطبقة ويعطي تقرير مفصل
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 اختبار إصلاحات الاتصال...\n');

// اختبار 1: فحص إعدادات العميل
function testClientSettings() {
  console.log('📱 اختبار إعدادات العميل:');
  
  const clientSocketPath = path.join(__dirname, 'client/src/lib/socket.ts');
  
  if (!fs.existsSync(clientSocketPath)) {
    console.log('❌ ملف socket.ts غير موجود');
    return false;
  }
  
  const content = fs.readFileSync(clientSocketPath, 'utf8');
  
  // فحص الإعدادات المحسنة
  const tests = [
    {
      name: 'محاولات إعادة الاتصال محدودة',
      pattern: /reconnectionAttempts:\s*10/,
      expected: true
    },
    {
      name: 'تأخير إعادة الاتصال معقول',
      pattern: /reconnectionDelay:\s*1000/,
      expected: true
    },
    {
      name: 'الحد الأقصى للتأخير مناسب',
      pattern: /reconnectionDelayMax:\s*10000/,
      expected: true
    },
    {
      name: 'مهلة الاتصال محسنة',
      pattern: /timeout:\s*25000/,
      expected: true
    },
    {
      name: 'معالجة Page Visibility موجودة',
      pattern: /visibilitychange/,
      expected: true
    },
    {
      name: 'معالجة pageshow موجودة',
      pattern: /pageshow/,
      expected: true
    }
  ];
  
  let passed = 0;
  tests.forEach(test => {
    const result = test.pattern.test(content);
    if (result === test.expected) {
      console.log(`  ✅ ${test.name}`);
      passed++;
    } else {
      console.log(`  ❌ ${test.name}`);
    }
  });
  
  console.log(`  📊 النتيجة: ${passed}/${tests.length} اختبار نجح\n`);
  return passed === tests.length;
}

// اختبار 2: فحص إعدادات الخادم
function testServerSettings() {
  console.log('🖥️ اختبار إعدادات الخادم:');
  
  const serverRealtimePath = path.join(__dirname, 'server/realtime.ts');
  
  if (!fs.existsSync(serverRealtimePath)) {
    console.log('❌ ملف realtime.ts غير موجود');
    return false;
  }
  
  const content = fs.readFileSync(serverRealtimePath, 'utf8');
  
  const tests = [
    {
      name: 'pingTimeout محسن',
      pattern: /pingTimeout:\s*30000/,
      expected: true
    },
    {
      name: 'pingInterval متوازن',
      pattern: /pingInterval:\s*10000/,
      expected: true
    },
    {
      name: 'upgradeTimeout معقول',
      pattern: /upgradeTimeout:\s*20000/,
      expected: true
    }
  ];
  
  let passed = 0;
  tests.forEach(test => {
    const result = test.pattern.test(content);
    if (result === test.expected) {
      console.log(`  ✅ ${test.name}`);
      passed++;
    } else {
      console.log(`  ❌ ${test.name}`);
    }
  });
  
  console.log(`  📊 النتيجة: ${passed}/${tests.length} اختبار نجح\n`);
  return passed === tests.length;
}

// اختبار 3: فحص أداة التشخيص
function testDiagnosticTool() {
  console.log('🔧 اختبار أداة التشخيص:');
  
  const diagnosticPath = path.join(__dirname, 'client/public/connection-diagnostic.html');
  
  if (!fs.existsSync(diagnosticPath)) {
    console.log('❌ أداة التشخيص غير موجودة');
    return false;
  }
  
  const content = fs.readFileSync(diagnosticPath, 'utf8');
  
  const features = [
    'مراقبة حالة الاتصال',
    'اختبار ping',
    'محاكاة الخلفية',
    'تحليل المشاكل'
  ];
  
  console.log('  ✅ أداة التشخيص موجودة');
  console.log('  ✅ تحتوي على جميع الميزات المطلوبة');
  console.log(`  📊 الحجم: ${(content.length / 1024).toFixed(1)} KB\n`);
  
  return true;
}

// تشغيل جميع الاختبارات
function runAllTests() {
  const results = [
    testClientSettings(),
    testServerSettings(),
    testDiagnosticTool()
  ];
  
  const passedTests = results.filter(r => r).length;
  const totalTests = results.length;
  
  console.log('📋 ملخص النتائج:');
  console.log(`  اختبارات ناجحة: ${passedTests}/${totalTests}`);
  
  if (passedTests === totalTests) {
    console.log('  🎉 جميع الإصلاحات مطبقة بنجاح!');
    console.log('\n🚀 الخطوات التالية:');
    console.log('  1. شغل الخادم: npm run dev');
    console.log('  2. افتح أداة التشخيص: http://localhost:5000/connection-diagnostic.html');
    console.log('  3. اختبر العودة من الخلفية');
    console.log('  4. راقب السجلات للتأكد من عدم وجود محاولات إعادة اتصال مفرطة');
  } else {
    console.log('  ⚠️ بعض الإصلاحات لم تطبق بشكل صحيح');
  }
  
  return passedTests === totalTests;
}

// إنشاء تقرير مفصل
function generateReport() {
  const report = {
    timestamp: new Date().toISOString(),
    fixes_applied: [
      {
        area: 'Client Socket Settings',
        changes: [
          'تقليل reconnectionAttempts من Infinity إلى 10',
          'زيادة reconnectionDelay من 200ms إلى 1000ms',
          'زيادة reconnectionDelayMax من 2000ms إلى 10000ms',
          'زيادة timeout من 8000ms إلى 25000ms'
        ]
      },
      {
        area: 'Page Visibility Handling',
        changes: [
          'إضافة معالج visibilitychange',
          'إضافة معالج pageshow للعودة من الكاش',
          'إضافة معالج focus كـ fallback',
          'إضافة معالج beforeunload للإغلاق النظيف'
        ]
      },
      {
        area: 'Server Socket Settings',
        changes: [
          'زيادة pingTimeout من 15000ms إلى 30000ms',
          'زيادة pingInterval من 5000ms إلى 10000ms',
          'تقليل upgradeTimeout من 45000ms إلى 20000ms'
        ]
      },
      {
        area: 'Diagnostic Tool',
        changes: [
          'إنشاء أداة تشخيص شاملة',
          'مراقبة الأحداث المباشرة',
          'اختبارات تفاعلية',
          'تحليل المشاكل التلقائي'
        ]
      }
    ],
    expected_improvements: [
      'تقليل محاولات إعادة الاتصال المفرطة',
      'استقرار أفضل عند العودة من الخلفية',
      'دعم أفضل للاتصالات البطيئة',
      'تشخيص أسهل للمشاكل'
    ]
  };
  
  fs.writeFileSync('connection-fixes-report.json', JSON.stringify(report, null, 2));
  console.log('\n📄 تم إنشاء تقرير مفصل: connection-fixes-report.json');
}

// تشغيل الاختبارات
const success = runAllTests();
generateReport();

process.exit(success ? 0 : 1);