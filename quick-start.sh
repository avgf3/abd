#!/bin/bash

clear
echo "🚀 بوت تليجرام الذكي - البدء السريع"
echo "====================================="
echo ""

# ألوان للنص
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # بدون لون

# دالة طباعة ملونة
print_step() {
    echo -e "${BLUE}[خطوة $1]${NC} $2"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# التحقق من Node.js
print_step "1" "التحقق من Node.js..."
if ! command -v node &> /dev/null; then
    print_error "Node.js غير مثبت!"
    echo "يرجى تثبيت Node.js من: https://nodejs.org/"
    exit 1
fi
print_success "Node.js متوفر: $(node --version)"

# التحقق من npm
if ! command -v npm &> /dev/null; then
    print_error "npm غير متوفر!"
    exit 1
fi
print_success "npm متوفر: $(npm --version)"

# تثبيت المتطلبات
print_step "2" "تثبيت المتطلبات..."
if [ ! -f "package.json" ]; then
    npm init -y > /dev/null 2>&1
fi

npm install node-telegram-bot-api dotenv > /dev/null 2>&1
if [ $? -eq 0 ]; then
    print_success "تم تثبيت المتطلبات بنجاح"
else
    print_error "فشل في تثبيت المتطلبات"
    exit 1
fi

# إنشاء المجلدات
print_step "3" "إنشاء المجلدات..."
mkdir -p data logs
print_success "تم إنشاء المجلدات"

# التحقق من ملف الإعدادات
print_step "4" "فحص ملف الإعدادات..."
if [ ! -f ".env.telegram" ]; then
    print_warning "ملف .env.telegram غير موجود. سيتم إنشاؤه..."
    cat > .env.telegram << 'EOL'
# إعدادات بوت تليجرام - يجب تعديل هذه القيم
TELEGRAM_BOT_TOKEN=YOUR_BOT_TOKEN_HERE
OWNER_TELEGRAM_ID=YOUR_OWNER_ID_HERE
EOL
    print_success "تم إنشاء ملف .env.telegram"
fi

# قراءة الإعدادات
source .env.telegram

# التحقق من الإعدادات
print_step "5" "التحقق من الإعدادات..."
if [ "$TELEGRAM_BOT_TOKEN" = "YOUR_BOT_TOKEN_HERE" ] || [ -z "$TELEGRAM_BOT_TOKEN" ]; then
    print_error "يجب تعديل TELEGRAM_BOT_TOKEN في ملف .env.telegram"
    echo ""
    echo "📋 للحصول على التوكن:"
    echo "1. ابحث عن @BotFather في تليجرام"
    echo "2. أرسل /newbot"
    echo "3. اتبع التعليمات"
    echo "4. انسخ التوكن إلى .env.telegram"
    echo ""
    read -p "هل تريد فتح ملف الإعدادات الآن؟ (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if command -v nano &> /dev/null; then
            nano .env.telegram
        elif command -v vim &> /dev/null; then
            vim .env.telegram
        else
            echo "يرجى تعديل ملف .env.telegram يدوياً"
        fi
    fi
    exit 1
fi

if [ "$OWNER_TELEGRAM_ID" = "YOUR_OWNER_ID_HERE" ] || [ -z "$OWNER_TELEGRAM_ID" ]; then
    print_error "يجب تعديل OWNER_TELEGRAM_ID في ملف .env.telegram"
    echo ""
    echo "📋 للحصول على معرف المالك:"
    echo "1. ابحث عن @userinfobot في تليجرام"
    echo "2. أرسل له أي رسالة"
    echo "3. انسخ User ID إلى .env.telegram"
    echo ""
    read -p "هل تريد فتح ملف الإعدادات الآن؟ (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if command -v nano &> /dev/null; then
            nano .env.telegram
        elif command -v vim &> /dev/null; then
            vim .env.telegram
        else
            echo "يرجى تعديل ملف .env.telegram يدوياً"
        fi
    fi
    exit 1
fi

print_success "الإعدادات صحيحة"

# اختبار الاتصال بـ Telegram
print_step "6" "اختبار الاتصال..."
response=$(curl -s "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getMe")
if echo "$response" | grep -q '"ok":true'; then
    bot_username=$(echo "$response" | grep -o '"username":"[^"]*' | cut -d'"' -f4)
    print_success "الاتصال ناجح! اسم البوت: @$bot_username"
else
    print_error "فشل في الاتصال بـ Telegram API"
    echo "تحقق من التوكن في ملف .env.telegram"
    exit 1
fi

# بدء تشغيل البوت
echo ""
echo "🎉 كل شيء جاهز! البوت سيبدأ الآن..."
echo ""
print_step "7" "بدء تشغيل البوت..."
echo ""
echo "==================================="
echo "🤖 بوت تليجرام يعمل الآن..."
echo "📱 ابحث عن @$bot_username في تليجرام"
echo "⏹️  للإيقاف: اضغط Ctrl+C"
echo "==================================="
echo ""

# تشغيل البوت
node smart-telegram-bot.js