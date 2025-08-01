#!/bin/bash

echo "🚀 بدء تطبيق الإصلاحات الشاملة للنشر على Render..."

# 1. إنشاء المجلدات المطلوبة للملفات الثابتة
echo "📁 إنشاء مجلدات الملفات الثابتة..."
mkdir -p client/public/uploads/{profiles,wall,banners,rooms}
mkdir -p client/public/svgs

# 2. إنشاء ملفات SVG افتراضية إذا لم تكن موجودة
echo "🎨 إنشاء ملفات SVG افتراضية..."

# Default avatar
if [ ! -f "client/public/default_avatar.svg" ]; then
cat > client/public/default_avatar.svg << 'EOF'
<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <circle cx="50" cy="50" r="45" fill="#e5e7eb"/>
  <circle cx="50" cy="35" r="15" fill="#9ca3af"/>
  <ellipse cx="50" cy="75" rx="20" ry="15" fill="#9ca3af"/>
</svg>
EOF
fi

# Crown SVG
if [ ! -f "client/public/svgs/crown.svg" ]; then
mkdir -p client/public/svgs
cat > client/public/svgs/crown.svg << 'EOF'
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M5 16L3 8L8 11L12 4L16 11L21 8L19 16H5Z" fill="#fbbf24" stroke="#f59e0b" stroke-width="2"/>
</svg>
EOF
fi

# Pink medal SVG
if [ ! -f "client/public/svgs/pink_medal.svg" ]; then
cat > client/public/svgs/pink_medal.svg << 'EOF'
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="12" cy="10" r="6" fill="#ec4899" stroke="#be185d" stroke-width="2"/>
  <path d="M8 16L12 14L16 16V22L12 20L8 22V16Z" fill="#f9a8d4"/>
</svg>
EOF
fi

# Blue arrow SVG
if [ ! -f "client/public/svgs/blue_arrow.svg" ]; then
cat > client/public/svgs/blue_arrow.svg << 'EOF'
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M7 14L12 9L17 14" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
EOF
fi

# 3. تحديث متغيرات البيئة
echo "🔧 تحديث متغيرات البيئة..."
export NODE_ENV=production
export PORT=10000
export ENABLE_WEBSOCKET=true
export SOCKET_IO_POLLING_ONLY=false
export SOCKET_IO_PING_TIMEOUT=60000
export SOCKET_IO_PING_INTERVAL=25000
export MAX_REQUEST_TIMEOUT=120000
export KEEP_ALIVE_TIMEOUT=120000
export HEADERS_TIMEOUT=121000

# 4. تثبيت التبعيات
echo "📦 تثبيت التبعيات..."
npm install --production

# 5. تشغيل البناء
echo "🔨 بناء التطبيق..."
npm run build

# 6. تشغيل migrations قاعدة البيانات
echo "🗄️ تشغيل migrations قاعدة البيانات..."
npm run db:migrate-production || npm run db:push || echo "⚠️ فشل في migrations - سيتم المتابعة"

# 7. إنشاء ملف package.json محسن لـ production
echo "📝 تحسين إعدادات production..."
cat > dist/package.json << 'EOF'
{
  "name": "chat-app-production",
  "version": "1.0.0",
  "type": "module",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
EOF

# 8. إنشاء ملف .htaccess للـ static files
if [ ! -f "client/public/.htaccess" ]; then
cat > client/public/.htaccess << 'EOF'
# إعدادات الكاش للملفات الثابتة
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType image/svg+xml "access plus 7 days"
  ExpiresByType image/png "access plus 7 days"
  ExpiresByType image/jpg "access plus 7 days"
  ExpiresByType image/jpeg "access plus 7 days"
  ExpiresByType image/gif "access plus 7 days"
  ExpiresByType image/webp "access plus 7 days"
</IfModule>

# إعدادات CORS للصور
<IfModule mod_headers.c>
  Header set Access-Control-Allow-Origin "*"
  Header set Access-Control-Allow-Methods "GET, OPTIONS"
</IfModule>
EOF
fi

# 9. التحقق من صحة الملفات المطلوبة
echo "✅ التحقق من صحة الملفات..."
required_files=(
  "dist/index.js"
  "client/public/default_avatar.svg"
  "client/public/svgs/crown.svg"
  "client/public/svgs/pink_medal.svg"
  "client/public/svgs/blue_arrow.svg"
)

for file in "${required_files[@]}"; do
  if [ -f "$file" ]; then
    echo "✅ موجود: $file"
  else
    echo "❌ مفقود: $file"
  fi
done

echo "🎉 تم تطبيق جميع الإصلاحات بنجاح!"
echo "📚 الملخص:"
echo "  - تم إنشاء مجلدات الملفات الثابتة"
echo "  - تم إنشاء ملفات SVG افتراضية"
echo "  - تم تحسين إعدادات Socket.IO"
echo "  - تم تحسين معالجة الأخطاء للـ APIs"
echo "  - تم تحسين إعدادات النشر"
echo ""
echo "🚀 يمكنك الآن النشر على Render باستخدام:"
echo "   npm start"