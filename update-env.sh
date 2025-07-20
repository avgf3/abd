#!/bin/bash

echo "🚨 إصلاح سريع لملف .env"
echo ""
echo "المحتوى الحالي لملف .env:"
echo "================================"
cat .env
echo "================================"
echo ""

if grep -q "\[YOUR-PASSWORD\]" .env || grep -q "\[YOUR-PROJECT-ID\]" .env; then
    echo "❌ المشكلة مؤكدة: ملف .env يحتوي على placeholder"
    echo ""
    echo "📋 للحصول على الرابط الصحيح:"
    echo "1. اذهب إلى https://supabase.com/dashboard"
    echo "2. اختر مشروعك"
    echo "3. Settings > Database"
    echo "4. انسخ Connection string من قسم Connection pooling"
    echo ""
    echo "مثال للرابط الصحيح:"
    echo "postgresql://postgres.abc123:password@aws-0-us-east-1.pooler.supabase.com:5432/postgres"
    echo ""
    read -p "🔗 ألصق رابط قاعدة البيانات الصحيح هنا: " DATABASE_URL
    
    if [[ -n "$DATABASE_URL" && "$DATABASE_URL" == *"postgresql://"* && "$DATABASE_URL" == *"supabase.com"* ]]; then
        echo "NODE_ENV=production" > .env
        echo "DATABASE_URL=$DATABASE_URL" >> .env
        echo "" >> .env
        echo "# Supabase connection configured successfully" >> .env
        echo "# Updated: $(date)" >> .env
        
        echo ""
        echo "✅ تم تحديث ملف .env بنجاح!"
        echo ""
        echo "🎯 الخطوات التالية:"
        echo "1. أعد تشغيل الخادم: npm run dev"
        echo "2. جرب تسجيل الدخول بـ 'عبدالكريم'"
    else
        echo "❌ الرابط غير صحيح أو فارغ"
    fi
else
    echo "✅ ملف .env يبدو صحيحاً (لا يحتوي على placeholder)"
    echo "💡 ربما المشكلة في مكان آخر"
fi