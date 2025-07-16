#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');

console.log('🧪 اختبار البناء مع إصلاح تعارض Vite...');

try {
  // تنظيف شامل (مثل Render)
  console.log('🧹 تنظيف شامل...');
  if (fs.existsSync('dist')) {
    fs.rmSync('dist', { recursive: true, force: true });
  }
  if (fs.existsSync('node_modules')) {
    fs.rmSync('node_modules', { recursive: true, force: true });
  }
  if (fs.existsSync('package-lock.json')) {
    fs.unlinkSync('package-lock.json');
  }

  // تثبيت مع حل التعارضات
  console.log('📦 تثبيت المكتبات مع حل تعارض Vite...');
  execSync('npm install --legacy-peer-deps', { stdio: 'inherit' });

  // بناء مثل Render تماماً
  console.log('🏗️ بناء المشروع...');
  execSync('npm run build', { stdio: 'inherit' });

  // تحقق
  console.log('✅ فحص الملفات...');
  const distFiles = fs.readdirSync('dist');
  console.log('📁 ملفات dist:', distFiles);

  if (distFiles.includes('index.js') && distFiles.includes('public')) {
    console.log('✅ نجح البناء! الملفات جاهزة للنشر.');
    console.log('🚀 يمكن النشر على Render الآن بنجاح!');
  } else {
    console.log('❌ فشل البناء: ملفات مفقودة');
    process.exit(1);
  }

} catch (error) {
  console.error('❌ خطأ في الاختبار:', error.message);
  console.log('💡 تأكد من أن جميع التعارضات محلولة في package.json');
  process.exit(1);
}