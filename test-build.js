#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');

console.log('🧪 اختبار البناء المحلي...');

try {
  // تنظيف
  console.log('🧹 تنظيف...');
  if (fs.existsSync('dist')) {
    fs.rmSync('dist', { recursive: true, force: true });
  }

  // تثبيت
  console.log('📦 تثبيت المكتبات...');
  execSync('npm install --legacy-peer-deps', { stdio: 'inherit' });

  // بناء
  console.log('🏗️ بناء...');
  execSync('npx vite build', { stdio: 'inherit' });
  execSync('npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist', { stdio: 'inherit' });

  // تحقق
  console.log('✅ فحص الملفات...');
  const distFiles = fs.readdirSync('dist');
  console.log('📁 ملفات dist:', distFiles);

  if (distFiles.includes('index.js')) {
    console.log('✅ نجح البناء! الملفات جاهزة للنشر.');
  } else {
    console.log('❌ فشل البناء: index.js غير موجود');
    process.exit(1);
  }

} catch (error) {
  console.error('❌ خطأ في الاختبار:', error.message);
  process.exit(1);
}