#!/bin/bash

# سكريبت إصلاح أخطاء 502 تلقائياً
# يعمل على Render وبيئات الإنتاج الأخرى

echo "🔧 بدء إصلاح مشاكل 502 Bad Gateway..."
echo "=================================="

# 1. التحقق من المتغيرات البيئية
echo "📋 فحص المتغيرات البيئية..."

if [ -z "$DATABASE_URL" ]; then
    echo "⚠️ DATABASE_URL غير محدد"
    echo "   يرجى تعيين DATABASE_URL في إعدادات Render"
fi

if [ -z "$JWT_SECRET" ]; then
    echo "⚠️ JWT_SECRET غير محدد"
    echo "   يرجى تعيين JWT_SECRET في إعدادات Render"
fi

if [ -z "$SESSION_SECRET" ]; then
    echo "⚠️ SESSION_SECRET غير محدد"
    echo "   يرجى تعيين SESSION_SECRET في إعدادات Render"
fi

# 2. إنشاء المجلدات المطلوبة
echo "📁 إنشاء المجلدات المطلوبة..."
mkdir -p client/public/uploads/avatars
mkdir -p client/public/uploads/banners
mkdir -p client/public/uploads/messages
mkdir -p client/public/uploads/profiles
mkdir -p temp/uploads
mkdir -p migrations

# 3. تعيين الصلاحيات
echo "🔐 تعيين الصلاحيات..."
chmod -R 755 client/public/uploads
chmod -R 755 temp

# 4. تنظيف ذاكرة التخزين المؤقت
echo "🧹 تنظيف ذاكرة التخزين المؤقت..."
rm -rf node_modules/.cache
rm -rf dist/.cache
rm -rf .npm-cache

# 5. إعادة بناء التطبيق إذا لزم الأمر
if [ "$1" == "--rebuild" ]; then
    echo "🔨 إعادة بناء التطبيق..."
    npm run build
fi

# 6. فحص قاعدة البيانات
echo "🗄️ فحص الاتصال بقاعدة البيانات..."
if [ ! -z "$DATABASE_URL" ]; then
    node -e "
    const postgres = require('postgres');
    const sql = postgres('$DATABASE_URL', { ssl: 'require' });
    sql\`SELECT 1 as ok\`
        .then(() => {
            console.log('✅ قاعدة البيانات متصلة');
            process.exit(0);
        })
        .catch(err => {
            console.error('❌ فشل الاتصال بقاعدة البيانات:', err.message);
            process.exit(1);
        });
    " 2>/dev/null || echo "⚠️ تحذير: لا يمكن التحقق من قاعدة البيانات"
fi

# 7. إعادة تشغيل الخادم إذا كان يعمل
if [ -f "server.pid" ]; then
    echo "🔄 إعادة تشغيل الخادم..."
    kill $(cat server.pid) 2>/dev/null
    sleep 2
fi

# 8. بدء الخادم
echo "🚀 بدء الخادم..."
if [ "$NODE_ENV" == "production" ]; then
    npm start &
    echo $! > server.pid
else
    npm run dev &
    echo $! > server.pid
fi

sleep 5

# 9. فحص صحة الخادم
echo "🏥 فحص صحة الخادم..."
PORT=${PORT:-5000}
curl -f http://localhost:$PORT/api/health > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ الخادم يعمل بنجاح!"
else
    echo "❌ الخادم لا يستجيب"
    echo "   يرجى فحص السجلات: npm run logs"
fi

echo ""
echo "=================================="
echo "✨ اكتمل الإصلاح!"
echo ""
echo "نصائح إضافية:"
echo "1. تأكد من تعيين جميع المتغيرات البيئية في Render"
echo "2. استخدم SOCKET_IO_POLLING_ONLY=true إذا استمرت مشاكل WebSocket"
echo "3. تحقق من سجلات Render للحصول على تفاصيل إضافية"
echo "4. قم بتشغيل: node health-check.js للفحص الشامل"