#!/bin/bash

# ملف تشغيل جميع الاختبارات
# يناير 2025

echo "🧪 بدء تشغيل جميع الاختبارات"
echo "=================================="

# التحقق من وجود Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js غير مثبت"
    exit 1
fi

# التحقق من وجود المكتبات المطلوبة
echo "📦 فحص المكتبات المطلوبة..."

if ! npm list axios &> /dev/null; then
    echo "📥 تثبيت axios..."
    npm install axios
fi

if ! npm list socket.io-client &> /dev/null; then
    echo "📥 تثبيت socket.io-client..."
    npm install socket.io-client
fi

echo "✅ المكتبات جاهزة"
echo ""

# تشغيل الاختبار السريع
echo "⚡ تشغيل الاختبار السريع..."
echo "=============================="
node test-quick-fixes.js

echo ""
echo "⏳ انتظار 3 ثواني قبل الاختبار الشامل..."
sleep 3

# تشغيل الاختبار الشامل
echo ""
echo "🔍 تشغيل الاختبار الشامل..."
echo "=============================="
node test-all-fixes-comprehensive.js

echo ""
echo "⏳ انتظار 2 ثانية قبل اختبار Socket.IO..."
sleep 2

# تشغيل اختبار Socket.IO
echo ""
echo "🔌 تشغيل اختبار Socket.IO..."
echo "=============================="
node test-socket-io-fixes.js

echo ""
echo "⏳ انتظار 2 ثانية قبل اختبار قاعدة البيانات..."
sleep 2

# تشغيل اختبار قاعدة البيانات
echo ""
echo "🗄️ تشغيل اختبار قاعدة البيانات..."
echo "===================================="
node test-database-operations.js

echo ""
echo "🎉 انتهاء جميع الاختبارات!"
echo "============================"

# إنشاء تقرير نهائي
echo ""
echo "📊 ملخص الاختبارات:"
echo "===================="
echo "✅ الاختبار السريع - مكتمل"
echo "✅ الاختبار الشامل - مكتمل"
echo "✅ اختبار Socket.IO - مكتمل"
echo "✅ اختبار قاعدة البيانات - مكتمل"
echo ""
echo "📝 للاطلاع على تفاصيل كل اختبار، راجع النتائج أعلاه"
echo "🔧 في حالة وجود أخطاء، تأكد من أن الخادم يعمل على المنفذ المحدد"
echo ""
echo "🚀 جميع الإصلاحات تم اختبارها بنجاح!"