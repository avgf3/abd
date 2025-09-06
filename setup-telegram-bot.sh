#!/bin/bash

echo "🚀 إعداد بوت تليجرام الذكي للرسائل"
echo "=================================="

# إنشاء المجلدات المطلوبة
echo "📁 إنشاء المجلدات..."
mkdir -p data
mkdir -p logs

# تثبيت المتطلبات
echo "📦 تثبيت المتطلبات..."
npm init -y
npm install node-telegram-bot-api dotenv

# إنشاء ملف البيئة إذا لم يكن موجوداً
if [ ! -f .env.telegram ]; then
    echo "⚙️ إنشاء ملف الإعدادات..."
    cat > .env.telegram << EOL
# إعدادات بوت تليجرام
# احصل على التوكن من @BotFather في تليجرام
TELEGRAM_BOT_TOKEN=YOUR_BOT_TOKEN_HERE

# معرف المالك في تليجرام (يمكن الحصول عليه من @userinfobot)
OWNER_TELEGRAM_ID=YOUR_OWNER_ID_HERE

# إعدادات اختيارية
BOT_USERNAME=your_bot_username
BOT_NAME="بوت الرسائل الذكي"
EOL
fi

# إنشاء ملف بدء التشغيل
echo "🔧 إنشاء ملف بدء التشغيل..."
cat > start-bot.sh << 'EOL'
#!/bin/bash

echo "🤖 بدء تشغيل بوت تليجرام..."

# التحقق من وجود Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js غير مثبت. يرجى تثبيت Node.js أولاً."
    exit 1
fi

# التحقق من وجود ملف الإعدادات
if [ ! -f .env.telegram ]; then
    echo "❌ ملف .env.telegram غير موجود. يرجى إنشاؤه أولاً."
    exit 1
fi

# التحقق من الإعدادات
source .env.telegram
if [ "$TELEGRAM_BOT_TOKEN" = "YOUR_BOT_TOKEN_HERE" ] || [ "$OWNER_TELEGRAM_ID" = "YOUR_OWNER_ID_HERE" ]; then
    echo "❌ يرجى تعديل ملف .env.telegram وإضافة التوكن ومعرف المالك الصحيحين."
    echo "💡 احصل على التوكن من @BotFather"
    echo "💡 احصل على معرف المالك من @userinfobot"
    exit 1
fi

# بدء البوت
echo "✅ بدء تشغيل البوت..."
node smart-telegram-bot.js
EOL

chmod +x start-bot.sh

# إنشاء ملف خدمة systemd (اختياري)
echo "🔧 إنشاء ملف الخدمة..."
cat > telegram-bot.service << EOL
[Unit]
Description=Telegram Smart Message Bot
After=network.target

[Service]
Type=simple
User=\$USER
WorkingDirectory=$(pwd)
ExecStart=/usr/bin/node smart-telegram-bot.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOL

echo ""
echo "✅ تم إعداد البوت بنجاح!"
echo ""
echo "📋 الخطوات التالية:"
echo "1. عدّل ملف .env.telegram وأضف:"
echo "   - TELEGRAM_BOT_TOKEN (من @BotFather)"
echo "   - OWNER_TELEGRAM_ID (من @userinfobot)"
echo ""
echo "2. شغّل البوت باستخدام:"
echo "   ./start-bot.sh"
echo ""
echo "3. أو شغّله مباشرة:"
echo "   node smart-telegram-bot.js"
echo ""
echo "📚 للمساعدة:"
echo "   - أرسل /start للبوت"
echo "   - أرسل /help للحصول على قائمة الأوامر"
echo ""
echo "🎉 البوت جاهز للاستخدام!"