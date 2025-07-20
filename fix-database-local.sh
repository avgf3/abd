#!/bin/bash

echo "🔧 إصلاح قاعدة البيانات - حل مشكلة تسجيل دخول الأعضاء"
echo "=================================================="

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ متغير DATABASE_URL غير محدد"
    echo "💡 قم بتعيين متغير البيئة أولاً:"
    echo "   export DATABASE_URL='your-database-url'"
    exit 1
fi

echo "✅ متغير DATABASE_URL محدد"
echo "🔄 تشغيل سكريپت الإصلاح..."

# Run the fix
node fix-database.js

echo ""
echo "✅ تم الانتهاء من الإصلاح!"
echo ""
echo "🧪 لاختبار النتيجة:"
echo "   1. شغل الخادم: npm run dev"
echo "   2. جرب تسجيل دخول عضو موجود"
echo "   3. أو استخدم المستخدمين الافتراضيين:"
echo "      - admin / admin123"
echo "      - testuser / test123"