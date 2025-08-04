#!/bin/bash
echo "🚀 بدء بناء الإنتاج..."

# Clean previous builds
echo "🧹 تنظيف البناءات السابقة..."
rm -rf dist

# Build client
echo "🎨 بناء العميل..."
npm run build

# Create necessary directories in dist
echo "📁 إنشاء المجلدات المطلوبة..."
mkdir -p dist/uploads/profiles
mkdir -p dist/uploads/banners
mkdir -p dist/uploads/rooms
mkdir -p dist/data

# Copy static files
echo "📋 نسخ الملفات الثابتة..."
cp -r uploads dist/ 2>/dev/null || true
cp -r shared dist/ 2>/dev/null || true
cp -r migrations dist/ 2>/dev/null || true

# Copy environment files
echo "🔐 نسخ ملفات البيئة..."
cp .env.production dist/.env 2>/dev/null || true

echo "✅ اكتمل البناء!"
echo "📌 لتشغيل الإنتاج: cd dist && node index.js"
