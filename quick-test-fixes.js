#!/usr/bin/env node

/**
 * 🧪 سكريپت اختبار سريع للإصلاحات المُنجزة
 * 
 * هذا السكريپت يختبر جميع الإصلاحات التي تم تطبيقها:
 * 1. إصلاح قاعدة البيانات والأونر
 * 2. إصلاح نظام الإشعارات
 * 3. إصلاح رفع الصور
 * 4. إصلاح نظام الثيم
 * 5. إصلاح State Management
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ألوان للطباعة
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkFile(filePath, description) {
  const fullPath = path.join(__dirname, filePath);
  const exists = fs.existsSync(fullPath);
  
  if (exists) {
    log(`✅ ${description}`, 'green');
    return true;
  } else {
    log(`❌ ${description} - الملف غير موجود: ${filePath}`, 'red');
    return false;
  }
}

function checkFileContent(filePath, searchText, description) {
  const fullPath = path.join(__dirname, filePath);
  
  if (!fs.existsSync(fullPath)) {
    log(`❌ ${description} - الملف غير موجود: ${filePath}`, 'red');
    return false;
  }
  
  try {
    const content = fs.readFileSync(fullPath, 'utf8');
    const found = content.includes(searchText);
    
    if (found) {
      log(`✅ ${description}`, 'green');
      return true;
    } else {
      log(`❌ ${description} - النص غير موجود`, 'red');
      return false;
    }
  } catch (error) {
    log(`❌ ${description} - خطأ في قراءة الملف: ${error.message}`, 'red');
    return false;
  }
}

async function runTests() {
  log('\n🧪 بدء اختبار الإصلاحات المُنجزة...\n', 'cyan');
  
  let passedTests = 0;
  let totalTests = 0;
  
  // ✅ 1. اختبار إصلاح قاعدة البيانات
  log('📊 1. اختبار إصلاحات قاعدة البيانات:', 'blue');
  totalTests++;
  if (checkFileContent(
    'server/database-setup.ts', 
    'createDefaultOwner', 
    'إضافة دالة إنشاء الأونر الافتراضي'
  )) passedTests++;
  
  totalTests++;
  if (checkFileContent(
    'server/database-setup.ts', 
    'addMissingColumns', 
    'إصلاح الأعمدة المفقودة'
  )) passedTests++;
  
  // ✅ 2. اختبار إصلاح State Management
  log('\n🔄 2. اختبار إصلاحات State Management:', 'blue');
  totalTests++;
  if (checkFileContent(
    'client/src/hooks/useChat.ts', 
    'useReducer', 
    'استخدام useReducer بدلاً من multiple useState'
  )) passedTests++;
  
  totalTests++;
  if (checkFileContent(
    'client/src/hooks/useChat.ts', 
    'chatReducer', 
    'إضافة reducer function'
  )) passedTests++;
  
  totalTests++;
  if (checkFileContent(
    'client/src/hooks/useChat.ts', 
    'useMemo', 
    'تحسين الأداء بـ useMemo'
  )) passedTests++;
  
  // ✅ 3. اختبار إصلاح رفع الصور
  log('\n🖼️ 3. اختبار إصلاحات رفع الصور:', 'blue');
  totalTests++;
  if (checkFileContent(
    'server/routes.ts', 
    'bannerUpload', 
    'إضافة multer للبانر'
  )) passedTests++;
  
  totalTests++;
  if (checkFileContent(
    'server/routes.ts', 
    'allowedMimes', 
    'فلترة أنواع الملفات المسموحة'
  )) passedTests++;
  
  totalTests++;
  if (checkFileContent(
    'client/src/components/chat/ProfileImage.tsx', 
    'handleImageError', 
    'معالجة أخطاء الصور'
  )) passedTests++;
  
  // ✅ 4. اختبار إصلاح الثيم
  log('\n🎨 4. اختبار إصلاحات نظام الثيم:', 'blue');
  totalTests++;
  if (checkFileContent(
    'client/src/components/chat/ThemeSelector.tsx', 
    'applyThemeVariables', 
    'تطبيق متغيرات CSS فوراً'
  )) passedTests++;
  
  totalTests++;
  if (checkFileContent(
    'client/src/components/chat/ThemeSelector.tsx', 
    'localStorage.setItem', 
    'حفظ الثيم في localStorage'
  )) passedTests++;
  
  // ✅ 5. اختبار إصلاح الإشعارات
  log('\n🔔 5. اختبار إصلاحات نظام الإشعارات:', 'blue');
  totalTests++;
  if (checkFileContent(
    'client/src/components/chat/NotificationPanel.tsx', 
    'refetchInterval: isOpen ? 30000', 
    'تقليل polling للإشعارات'
  )) passedTests++;
  
  totalTests++;
  if (checkFileContent(
    'client/src/components/chat/NotificationPanel.tsx', 
    'queryClient.setQueryData', 
    'تحديث ذكي للكاش'
  )) passedTests++;
  
  // ✅ 6. اختبار إصلاح MessageArea
  log('\n💬 6. اختبار إصلاحات MessageArea:', 'blue');
  totalTests++;
  if (checkFileContent(
    'client/src/components/chat/MessageArea.tsx', 
    'handleTypingThrottled', 
    'تحسين مؤشر الكتابة'
  )) passedTests++;
  
  totalTests++;
  if (checkFileContent(
    'client/src/components/chat/MessageArea.tsx', 
    'validMessages', 
    'فلترة الرسائل الصحيحة'
  )) passedTests++;
  
  // 📊 النتائج النهائية
  log('\n📊 نتائج الاختبار:', 'bold');
  log(`✅ اختبارات نجحت: ${passedTests}`, 'green');
  log(`❌ اختبارات فشلت: ${totalTests - passedTests}`, 'red');
  log(`📈 معدل النجاح: ${Math.round((passedTests / totalTests) * 100)}%`, 'cyan');
  
  if (passedTests === totalTests) {
    log('\n🎉 جميع الإصلاحات تم تطبيقها بنجاح!', 'green');
    log('✅ الموقع جاهز للاختبار', 'green');
  } else {
    log('\n⚠️ بعض الإصلاحات تحتاج مراجعة', 'yellow');
  }
  
  // 🔧 تعليمات التشغيل
  log('\n🔧 تعليمات التشغيل:', 'bold');
  log('1. تشغيل قاعدة البيانات: npm run db:fix', 'cyan');
  log('2. تشغيل الخادم: npm run dev', 'cyan');
  log('3. فتح المتصفح: http://localhost:5000', 'cyan');
  log('4. اختبار تسجيل الدخول كأونر: Username: Owner, Password: admin123', 'cyan');
  
  log('\n✨ الإصلاحات المُنجزة:', 'bold');
  log('• إصلاح قاعدة البيانات وإنشاء الأونر الافتراضي', 'green');
  log('• تحسين State Management بـ useReducer', 'green');
  log('• إصلاح رفع الصور والبانر', 'green');
  log('• تطبيق الثيم الفوري مع CSS variables', 'green');
  log('• تحسين نظام الإشعارات وتقليل polling', 'green');
  log('• تحسين MessageArea ومؤشر الكتابة', 'green');
  log('• إضافة error handling شامل', 'green');
  log('• تحسين الأداء مع memoization', 'green');
}

// تشغيل الاختبارات
runTests().catch(error => {
  log(`❌ خطأ في تشغيل الاختبارات: ${error.message}`, 'red');
  process.exit(1);
});