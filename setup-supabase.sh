#!/bin/bash

echo "🚀 إعداد مشروع الدردشة العربية مع Supabase"
echo "==============================================="

# التحقق من وجود .env
if [ ! -f .env ]; then
    echo "❌ ملف .env غير موجود!"
    echo "يرجى إنشاء ملف .env وإضافة DATABASE_URL من Supabase"
    exit 1
fi

# التحقق من DATABASE_URL
if ! grep -q "DATABASE_URL=postgresql" .env; then
    echo "❌ DATABASE_URL غير محدد بشكل صحيح في .env"
    echo "يجب أن يكون: DATABASE_URL=postgresql://..."
    exit 1
fi

echo "✅ ملف .env موجود مع DATABASE_URL صحيح"

# تثبيت التبعيات إذا لم تكن موجودة
if [ ! -d "node_modules" ]; then
    echo "📦 تثبيت التبعيات..."
    npm install
fi

echo "🔄 توليد migrations من schema..."
npm run db:generate

echo "🔄 تشغيل migrations على Supabase..."
npm run db:migrate

echo "🧪 اختبار الاتصال بـ Supabase..."
npm run test:supabase

echo ""
echo "🎉 تم الإعداد بنجاح!"
echo ""
echo "📋 الخطوات التالية:"
echo "1. تشغيل الخادم: npm run dev"
echo "2. فتح المتصفح على: http://localhost:3000"
echo ""
echo "💡 نصائح:"
echo "- للتحقق من حالة قاعدة البيانات: npm run test:supabase"
echo "- لإعادة إنشاء الجداول: npm run db:push"