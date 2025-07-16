#!/bin/bash

# Build script for Arabic Chat App deployment
# Script for fixing dependency conflicts and building properly

echo "🚀 بدء عملية البناء للتطبيق العربي..."

# Set environment
export NODE_ENV=production

# Clear any existing node_modules and locks that might cause conflicts
echo "🧹 تنظيف المشروع..."
rm -rf node_modules package-lock.json

# Install dependencies with legacy peer deps to resolve conflicts
echo "📦 تثبيت المكتبات مع حل تضارب الإصدارات..."
npm install --legacy-peer-deps --no-fund --no-audit

# Update browserslist data
echo "🌐 تحديث قاعدة بيانات المتصفحات..."
npx update-browserslist-db@latest

# Build the client
echo "🏗️ بناء الواجهة الأمامية..."
npm run build:client || {
    echo "❌ فشل في بناء الواجهة الأمامية"
    echo "🔄 محاولة بناء مع إعدادات بديلة..."
    NODE_OPTIONS="--max-old-space-size=4096" npm run build:client
}

# Build the server
echo "🖥️ بناء الخادم..."
npm run build:server || {
    echo "❌ فشل في بناء الخادم"
    exit 1
}

echo "✅ اكتمل البناء بنجاح!"
echo "📁 ملفات البناء متوفرة في مجلد dist/"

# Verify build
if [ -d "dist" ]; then
    echo "✓ تم التحقق من وجود مجلد البناء"
    ls -la dist/
else
    echo "❌ مجلد البناء غير موجود!"
    exit 1
fi