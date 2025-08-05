#!/bin/bash

echo "🚀 بدء تشغيل موقع الدردشة العربية..."
echo "================================="

# التأكد من وجود node_modules
if [ ! -d "node_modules" ]; then
  echo "📦 تثبيت المتطلبات..."
  npm install
fi

# تنظيف العمليات السابقة
echo "🧹 تنظيف العمليات السابقة..."
pkill -f "tsx server/index.ts" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true

# انتظار قصير للتنظيف
sleep 2

echo "🔧 بدء الخادم على المنفذ 3001..."
NODE_ENV=development PORT=3001 tsx server/index.ts &
SERVER_PID=$!

echo "⏳ انتظار تشغيل الخادم..."
sleep 5

echo "🎨 بدء العميل على المنفذ 5173..."
vite &
CLIENT_PID=$!

echo ""
echo "✅ تم تشغيل الموقع بنجاح!"
echo "📱 العميل: http://localhost:5173"
echo "🔧 الخادم: http://localhost:3001"
echo "🔌 Socket.IO: http://localhost:3001/socket.io/"
echo ""
echo "للإيقاف: اضغط Ctrl+C"
echo "================================="

# إيقاف العمليات عند إنهاء الـ script
trap "echo '⏹️ إيقاف الخادم...'; kill $SERVER_PID $CLIENT_PID 2>/dev/null; exit" INT TERM

# انتظار إنهاء العمليات
wait