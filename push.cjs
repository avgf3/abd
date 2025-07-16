#!/usr/bin/env node

const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🚀 سكريبت رفع الملفات إلى Git');
console.log('================================');

function runCommand(command, description) {
  try {
    console.log(`\n⏳ ${description}...`);
    execSync(command, { stdio: 'inherit' });
    console.log(`✅ ${description} اكتمل بنجاح`);
    return true;
  } catch (error) {
    console.error(`❌ فشل في ${description}:`, error.message);
    return false;
  }
}

function getDefaultCommitMessage() {
  const now = new Date();
  const date = now.toLocaleDateString('ar-EG');
  const time = now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
  
  return `🔧 تحديث المشروع - ${date} ${time}

✅ إصلاح مشاكل النشر والـ dependencies
✅ تحديث إعدادات Vite و package.json  
✅ إزالة التضارب في المكتبات
✅ تحسين ملفات البناء والنشر
✅ إضافة سكريبتات النشر المحسنة

جاهز للنشر على Render! 🚀`;
}

function quickPush() {
  console.log('\n🚀 رفع سريع بالرسالة الافتراضية...\n');
  
  const message = getDefaultCommitMessage();
  console.log('📝 رسالة الكوميت:');
  console.log('-------------------');
  console.log(message);
  console.log('-------------------\n');

  // إضافة الملفات
  if (!runCommand('git add .', 'إضافة جميع الملفات')) return;

  // عمل كوميت
  const commitCommand = `git commit -m "${message.replace(/"/g, '\\"')}"`;
  if (!runCommand(commitCommand, 'عمل commit')) return;

  // رفع للريبو
  if (!runCommand('git push origin main', 'رفع الملفات للريبو')) return;

  console.log('\n🎉 تم رفع جميع الملفات بنجاح!');
  console.log('🔗 يمكنك الآن النشر على Render');
  console.log('📋 استخدم الإعدادات من ملف RENDER_DEPLOY.md');
  
  rl.close();
}

function customPush() {
  rl.question('\n✏️ اكتب رسالة الكوميت (اتركها فارغة للرسالة الافتراضية): ', (userMessage) => {
    const message = userMessage.trim() || getDefaultCommitMessage();
    
    console.log('\n📝 سيتم استخدام هذه الرسالة:');
    console.log('-------------------');
    console.log(message);
    console.log('-------------------\n');

    // إضافة الملفات
    if (!runCommand('git add .', 'إضافة جميع الملفات')) {
      rl.close();
      return;
    }

    // عمل كوميت
    const commitCommand = `git commit -m "${message.replace(/"/g, '\\"')}"`;
    if (!runCommand(commitCommand, 'عمل commit')) {
      rl.close();
      return;
    }

    // رفع للريبو
    if (!runCommand('git push origin main', 'رفع الملفات للريبو')) {
      rl.close();
      return;
    }

    console.log('\n🎉 تم رفع جميع الملفات بنجاح!');
    console.log('🔗 يمكنك الآن النشر على Render');
    
    rl.close();
  });
}

function checkGitStatus() {
  try {
    console.log('\n📊 حالة Git الحالية:');
    execSync('git status --porcelain', { stdio: 'pipe' });
    execSync('git status', { stdio: 'inherit' });
    return true;
  } catch (error) {
    console.error('❌ خطأ في فحص حالة Git:', error.message);
    return false;
  }
}

// فحص حالة Git أولاً
if (!checkGitStatus()) {
  console.log('❌ تأكد من أن المجلد يحتوي على Git repository');
  rl.close();
  process.exit(1);
}

// خيارات الرفع
console.log('\n🎯 اختر طريقة الرفع:');
console.log('1️⃣  رفع سريع (رسالة تلقائية)');
console.log('2️⃣  رفع مخصص (اكتب رسالتك)');
console.log('3️⃣  إلغاء');

rl.question('\n👉 اختر (1/2/3): ', (choice) => {
  switch (choice.trim()) {
    case '1':
      quickPush();
      break;
    case '2':
      customPush();
      break;
    case '3':
      console.log('❌ تم الإلغاء');
      rl.close();
      break;
    default:
      console.log('❌ خيار غير صحيح');
      rl.close();
      break;
  }
});