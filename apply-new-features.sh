#!/bin/bash

# 🚀 تطبيق الميزات الجديدة المستوحاة من arabic.chat
# هذا السكريبت يطبق جميع التحسينات على قاعدة البيانات

echo "🚀 بدء تطبيق الميزات الجديدة..."
echo ""

# التحقق من وجود DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
  echo "❌ خطأ: DATABASE_URL غير موجود في متغيرات البيئة"
  echo "💡 تأكد من إضافة DATABASE_URL في ملف .env"
  exit 1
fi

echo "✅ DATABASE_URL موجود"
echo ""

# تطبيق الـ migration
echo "📊 تطبيق migration قاعدة البيانات..."
psql "$DATABASE_URL" -f migrations/add_profile_advanced_features.sql

if [ $? -eq 0 ]; then
  echo "✅ تم تطبيق migration بنجاح"
else
  echo "❌ فشل تطبيق migration"
  exit 1
fi

echo ""
echo "🎉 تم تطبيق جميع الميزات بنجاح!"
echo ""
echo "📋 الميزات المضافة:"
echo "  ✅ نظام الإطارات (10 إطارات)"
echo "  ✅ تعليقات متعددة المستويات"
echo "  ✅ مودال الإشعارات المتقدم"
echo "  ✅ نظام الهدايا"
echo "  ✅ تتبع الزوار"
echo ""
echo "🔥 الخطوة التالية:"
echo "  1. أعد تشغيل السيرفر: npm run dev"
echo "  2. افتح الموقع واستمتع بالميزات الجديدة!"
echo ""
