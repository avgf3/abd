#!/bin/bash

# ملف تشغيل الاختبارات الشاملة للغرف والدردشة
echo "🚀 بدء تشغيل اختبارات النظام المحسن..."
echo "======================================="

# التحقق من وجود Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js غير مثبت. يرجى تثبيت Node.js أولاً."
    exit 1
fi

# التحقق من وجود npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm غير متوفر. يرجى تثبيت npm أولاً."
    exit 1
fi

# تثبيت التبعيات إذا لم تكن موجودة
if [ ! -d "node_modules" ]; then
    echo "📦 تثبيت التبعيات..."
    npm install
fi

# التحقق من وجود socket.io-client
if ! npm list socket.io-client &> /dev/null; then
    echo "📦 تثبيت socket.io-client..."
    npm install socket.io-client
fi

echo ""
echo "🔧 تشغيل الاختبارات الشاملة..."
echo "================================"
echo ""

# تشغيل الاختبارات
node test-rooms-comprehensive-fixed.js

# التحقق من نتيجة الاختبارات
if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 جميع الاختبارات نجحت!"
    echo "========================="
    echo "✅ النظام يعمل بشكل مثالي"
    echo "✅ الغرف تعمل بشكل صحيح"
    echo "✅ الدردشة العامة تعمل"
    echo "✅ الرسائل الخاصة تعمل"
    echo "✅ انضمام ومغادرة الغرف يعمل"
else
    echo ""
    echo "⚠️ بعض الاختبارات فشلت"
    echo "========================"
    echo "❌ يرجى مراجعة الأخطاء أعلاه"
    echo "🔧 قد تحتاج لإعادة تشغيل الخادم"
    exit 1
fi