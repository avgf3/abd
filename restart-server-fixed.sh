#!/bin/bash

echo "🔄 إعادة تشغيل السيرفر مع الإصلاحات..."

# إيقاف العمليات الحالية
echo "⏹️ إيقاف العمليات الحالية..."
pkill -f "node.*dist/index.js" || true
pkill -f "tsx.*server/index.ts" || true

# إيقاف PM2 إذا كان يعمل
if command -v pm2 &> /dev/null; then
    echo "🛑 إيقاف PM2..."
    pm2 stop chat-app || true
    pm2 delete chat-app || true
fi

# انتظار قليل للتأكد من إيقاف العمليات
sleep 3

# بناء المشروع
echo "🔨 بناء المشروع..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ تم البناء بنجاح"
else
    echo "❌ فشل في البناء"
    exit 1
fi

# بدء تشغيل السيرفر
echo "🚀 بدء تشغيل السيرفر..."

if command -v pm2 &> /dev/null; then
    echo "📱 استخدام PM2..."
    pm2 start ecosystem.config.js
    pm2 logs chat-app --lines 20
else
    echo "🔧 تشغيل مباشر..."
    NODE_ENV=production node dist/index.js
fi

echo "✅ تم إعادة تشغيل السيرفر"