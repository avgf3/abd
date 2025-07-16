#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 بدء عملية النشر...');

try {
  // تنظيف الملفات القديمة
  console.log('🧹 تنظيف المشروع...');
  if (fs.existsSync('dist')) {
    fs.rmSync('dist', { recursive: true, force: true });
  }
  if (fs.existsSync('node_modules/.cache')) {
    fs.rmSync('node_modules/.cache', { recursive: true, force: true });
  }

  // تثبيت المكتبات
  console.log('📦 تثبيت المكتبات...');
  execSync('npm install --legacy-peer-deps --no-audit --no-fund', { stdio: 'inherit' });

  // تحديث browserslist
  console.log('🌐 تحديث browserslist...');
  try {
    execSync('npx update-browserslist-db@latest', { stdio: 'inherit' });
  } catch (error) {
    console.log('⚠️ تحديث browserslist فشل، لكن نكمل...');
  }

  // بناء الواجهة الأمامية
  console.log('🏗️ بناء الواجهة الأمامية...');
  execSync('npx vite build --mode production', { stdio: 'inherit' });

  // بناء الخادم
  console.log('🖥️ بناء الخادم...');
  execSync('npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist --target=node18', { stdio: 'inherit' });

  console.log('✅ تم النشر بنجاح!');
  
  // التحقق من الملفات
  if (fs.existsSync('dist')) {
    console.log('📁 ملفات البناء:');
    const files = fs.readdirSync('dist');
    files.forEach(file => console.log(`  - ${file}`));
  }

} catch (error) {
  console.error('❌ فشل النشر:', error.message);
  process.exit(1);
}