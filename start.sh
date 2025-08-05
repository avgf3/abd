#!/bin/bash

echo "🚀 بدء تشغيل تطبيق الدردشة العربية..."

# التحقق من وجود Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js غير مثبت. يرجى تثبيت Node.js أولاً."
    exit 1
fi

# التحقق من وجود npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm غير مثبت. يرجى تثبيت npm أولاً."
    exit 1
fi

# التحقق من وجود ملف .env
if [ ! -f .env ]; then
    echo "❌ ملف .env غير موجود. يرجى إنشاؤه أولاً."
    exit 1
fi

# تثبيت التبعيات إذا لم تكن مثبتة
if [ ! -d node_modules ]; then
    echo "📦 تثبيت التبعيات..."
    npm install
fi

# إيقاف أي عمليات سابقة
echo "🛑 إيقاف العمليات السابقة..."
pkill -f "npm run dev" 2>/dev/null
pkill -f "vite" 2>/dev/null
pkill -f "tsx server/index.ts" 2>/dev/null

# انتظار قليلاً
sleep 2

# تشغيل الخادم
echo "🔧 تشغيل الخادم..."
npm run dev > server.log 2>&1 &
SERVER_PID=$!

# انتظار بدء الخادم
echo "⏳ انتظار بدء الخادم..."
sleep 10

# التحقق من حالة الخادم
if curl -f http://localhost:3001/api/health > /dev/null 2>&1; then
    echo "✅ الخادم يعمل بنجاح على المنفذ 3001"
else
    echo "❌ فشل في تشغيل الخادم"
    exit 1
fi

# تشغيل Vite
echo "🎨 تشغيل Vite..."
npx vite --port 5173 --host localhost > vite.log 2>&1 &
VITE_PID=$!

# انتظار بدء Vite
echo "⏳ انتظار بدء Vite..."
sleep 5

# التحقق من حالة Vite
if curl -f http://localhost:5173 > /dev/null 2>&1; then
    echo "✅ Vite يعمل بنجاح على المنفذ 5173"
else
    echo "❌ فشل في تشغيل Vite"
    exit 1
fi

echo ""
echo "🎉 تم تشغيل التطبيق بنجاح!"
echo ""
echo "📱 الواجهة الأمامية: http://localhost:5173"
echo "🔧 الخادم API: http://localhost:3001/api"
echo "📊 صحة النظام: http://localhost:3001/api/health"
echo ""
echo "💡 لإيقاف التطبيق، اضغط Ctrl+C"
echo "📝 السجلات متاحة في: server.log و vite.log"
echo ""

# انتظار إشارة الإيقاف
trap "echo '🛑 إيقاف التطبيق...'; kill $SERVER_PID $VITE_PID 2>/dev/null; exit 0" INT TERM

# انتظار إلى ما لا نهاية
wait