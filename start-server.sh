#!/bin/bash

echo "🚀 بدء تشغيل الخادم..."

# إيقاف العمليات القديمة
echo "🛑 إيقاف العمليات القديمة..."
pkill -f "node.*3000" 2>/dev/null || true
pkill -f "npm.*start" 2>/dev/null || true

# انتظار قليل
sleep 2

# تشغيل الخادم
echo "🚀 تشغيل الخادم..."
NODE_ENV=development npm start

echo "✅ تم تشغيل الخادم"
