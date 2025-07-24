#!/bin/bash

echo "🔧 بدء إصلاح مشاكل قاعدة البيانات..."

# التأكد من وجود متغيرات البيئة
if [ -z "$DATABASE_URL" ] && [ -z "$SUPABASE_DATABASE_URL" ]; then
    echo "❌ خطأ: متغير DATABASE_URL أو SUPABASE_DATABASE_URL غير محدد"
    exit 1
fi

# تشغيل سكريبت الإصلاح
echo "🚀 تشغيل سكريبت إصلاح قاعدة البيانات..."
node fix-database-issues.js

if [ $? -eq 0 ]; then
    echo "✅ تم إكمال إصلاح قاعدة البيانات بنجاح!"
    echo "🎉 يمكنك الآن إعادة نشر التطبيق"
else
    echo "❌ فشل في إصلاح قاعدة البيانات"
    exit 1
fi