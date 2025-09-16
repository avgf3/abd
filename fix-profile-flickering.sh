#!/bin/bash

# سكريبت إصلاح مشكلة التذبذب في الملف الشخصي
echo "🔧 بدء إصلاح مشكلة التذبذب في الملف الشخصي..."

# تطبيق migration على قاعدة البيانات
echo "📊 تطبيق migration على قاعدة البيانات..."
psql $DATABASE_URL -f fix-profile-flickering-migration.sql

if [ $? -eq 0 ]; then
    echo "✅ تم تطبيق migration بنجاح"
else
    echo "❌ فشل في تطبيق migration"
    exit 1
fi

# إعادة تشغيل الخادم لتطبيق التغييرات
echo "🔄 إعادة تشغيل الخادم..."
pm2 restart all

if [ $? -eq 0 ]; then
    echo "✅ تم إعادة تشغيل الخادم بنجاح"
else
    echo "❌ فشل في إعادة تشغيل الخادم"
    exit 1
fi

echo "🎉 تم إصلاح مشكلة التذبذب بنجاح!"
echo ""
echo "📋 ملخص الإصلاحات المطبقة:"
echo "1. ✅ منع التحديثات المتكررة في ProfileModal"
echo "2. ✅ تحسين معالجة currentRoom في الكاش"
echo "3. ✅ إصلاح معالجة أحداث Socket.IO"
echo "4. ✅ تحديث قاعدة البيانات لضمان استقرار البيانات"
echo "5. ✅ تحسين معالجة انقطاع الاتصال"
echo ""
echo "🔍 الآن يجب أن يعمل الملف الشخصي بشكل مستقر دون تذبذب!"