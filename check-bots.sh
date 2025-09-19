#!/bin/bash
# فحص البوتات بدون غرف من خلال Terminal
# تشغيل: chmod +x check-bots.sh && ./check-bots.sh

echo "🔍 فحص البوتات بدون غرف..."
echo "================================"

# 1. فحص الملفات المطلوبة
if [ ! -f "check-bots-rooms.sql" ]; then
    echo "❌ ملف check-bots-rooms.sql غير موجود"
    exit 1
fi

# 2. تشغيل استعلام قاعدة البيانات
echo "📊 تشغيل استعلام قاعدة البيانات..."
echo ""

# إذا كان لديك psql مثبت
if command -v psql &> /dev/null; then
    echo "استخدام psql:"
    psql $DATABASE_URL -f check-bots-rooms.sql
else
    echo "❌ psql غير مثبت"
    echo "يمكنك تشغيل ملف check-bots-rooms.sql يدوياً في قاعدة البيانات"
fi

echo ""
echo "✅ انتهى الفحص"
echo ""
echo "📋 طرق أخرى للفحص:"
echo "1. تشغيل check-bots-api.js في المتصفح"
echo "2. تشغيل check-bots-console.js في Developer Tools"
echo "3. إضافة debug-bots-endpoint.js إلى routes.ts"