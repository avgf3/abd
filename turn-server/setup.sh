#!/bin/bash

# ========================================
# سكريبت إعداد خادم TURN/STUN
# ========================================

set -e

echo "🚀 بدء إعداد خادم TURN/STUN للغرف الصوتية..."

# ========================================
# المتغيرات - قم بتعديلها حسب احتياجاتك
# ========================================

DOMAIN="turn.yourdomain.com"
EMAIL="admin@yourdomain.com"
PUBLIC_IP=$(curl -s ifconfig.me)
PRIVATE_IP=$(hostname -I | awk '{print $1}')
SECRET=$(openssl rand -hex 32)

# ========================================
# الألوان للإخراج
# ========================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ========================================
# الدوال المساعدة
# ========================================

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# ========================================
# فحص المتطلبات
# ========================================

echo "📋 فحص المتطلبات..."

# فحص Docker
if ! command -v docker &> /dev/null; then
    print_error "Docker غير مثبت!"
    echo "🔧 تثبيت Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    rm get-docker.sh
    print_success "تم تثبيت Docker"
fi

# فحص Docker Compose
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose غير مثبت!"
    echo "🔧 تثبيت Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    print_success "تم تثبيت Docker Compose"
fi

# فحص Certbot
if ! command -v certbot &> /dev/null; then
    print_warning "Certbot غير مثبت - لن نتمكن من الحصول على شهادات SSL"
    echo "لتثبيت Certbot:"
    echo "sudo apt-get update && sudo apt-get install certbot -y"
fi

# ========================================
# إنشاء البنية
# ========================================

echo "📁 إنشاء البنية..."

# إنشاء المجلدات
mkdir -p certs logs data redis-data prometheus-data grafana-data
mkdir -p grafana/dashboards grafana/datasources

print_success "تم إنشاء المجلدات"

# ========================================
# الحصول على شهادات SSL
# ========================================

if command -v certbot &> /dev/null; then
    echo "🔒 الحصول على شهادات SSL..."
    
    read -p "هل تريد الحصول على شهادة SSL الآن؟ (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        sudo certbot certonly --standalone -d $DOMAIN --email $EMAIL --agree-tos --non-interactive
        
        if [ -d "/etc/letsencrypt/live/$DOMAIN" ]; then
            sudo cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem certs/
            sudo cp /etc/letsencrypt/live/$DOMAIN/privkey.pem certs/
            sudo chown $USER:$USER certs/*
            chmod 600 certs/*
            print_success "تم نسخ الشهادات"
        else
            print_error "فشل الحصول على الشهادات"
        fi
    fi
else
    print_warning "تخطي الحصول على شهادات SSL"
    echo "🔧 إنشاء شهادات ذاتية التوقيع للاختبار..."
    openssl req -x509 -newkey rsa:4096 -keyout certs/privkey.pem -out certs/fullchain.pem -days 365 -nodes -subj "/CN=$DOMAIN"
    chmod 600 certs/*
    print_success "تم إنشاء شهادات ذاتية التوقيع"
fi

# ========================================
# تحديث ملف التكوين
# ========================================

echo "⚙️  تحديث ملف التكوين..."

# نسخ احتياطي
cp coturn.conf coturn.conf.backup

# تحديث المتغيرات في الملف
sed -i "s/YOUR_PUBLIC_IP/$PUBLIC_IP/g" coturn.conf
sed -i "s/YOUR_PRIVATE_IP/$PRIVATE_IP/g" coturn.conf
sed -i "s/turn.yourdomain.com/$DOMAIN/g" coturn.conf
sed -i "s/a3f4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4/$SECRET/g" coturn.conf

print_success "تم تحديث ملف التكوين"

# ========================================
# إعداد Prometheus
# ========================================

echo "📊 إعداد Prometheus..."

cat > prometheus.yml << EOF
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'coturn'
    static_configs:
      - targets: ['localhost:9641']
    
  - job_name: 'redis'
    static_configs:
      - targets: ['localhost:9121']
EOF

print_success "تم إعداد Prometheus"

# ========================================
# إعداد Grafana
# ========================================

echo "📈 إعداد Grafana..."

cat > grafana/datasources/prometheus.yml << EOF
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    
  - name: Redis
    type: redis-datasource
    access: proxy
    url: redis://redis:6379
EOF

print_success "تم إعداد Grafana"

# ========================================
# إعداد الجدار الناري
# ========================================

echo "🔥 إعداد الجدار الناري..."

# فحص ufw
if command -v ufw &> /dev/null; then
    print_warning "تكوين UFW..."
    sudo ufw allow 3478/tcp
    sudo ufw allow 3478/udp
    sudo ufw allow 5349/tcp
    sudo ufw allow 5349/udp
    sudo ufw allow 49152:65535/udp
    print_success "تم تكوين UFW"
fi

# فحص firewalld
if command -v firewall-cmd &> /dev/null; then
    print_warning "تكوين firewalld..."
    sudo firewall-cmd --permanent --add-port=3478/tcp
    sudo firewall-cmd --permanent --add-port=3478/udp
    sudo firewall-cmd --permanent --add-port=5349/tcp
    sudo firewall-cmd --permanent --add-port=5349/udp
    sudo firewall-cmd --permanent --add-port=49152-65535/udp
    sudo firewall-cmd --reload
    print_success "تم تكوين firewalld"
fi

# ========================================
# إنشاء ملف البيئة
# ========================================

echo "📝 إنشاء ملف البيئة..."

cat > .env << EOF
# معلومات الخادم
PUBLIC_IP=$PUBLIC_IP
PRIVATE_IP=$PRIVATE_IP
DOMAIN=$DOMAIN

# كلمة السر السرية
TURN_SECRET=$SECRET

# بيانات الاعتماد
TURN_USERNAME=voiceuser
TURN_PASSWORD=$(openssl rand -hex 16)

# إعدادات Grafana
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=$(openssl rand -hex 16)
EOF

chmod 600 .env
print_success "تم إنشاء ملف البيئة"

# ========================================
# تشغيل الخدمات
# ========================================

echo "🚀 تشغيل الخدمات..."

docker-compose up -d

# انتظار بدء الخدمات
echo "⏳ انتظار بدء الخدمات..."
sleep 10

# فحص حالة الخدمات
if docker-compose ps | grep -q "Up"; then
    print_success "جميع الخدمات تعمل!"
else
    print_error "بعض الخدمات لم تبدأ بشكل صحيح"
    docker-compose logs
fi

# ========================================
# عرض المعلومات
# ========================================

echo ""
echo "========================================="
echo -e "${GREEN}✨ تم إعداد خادم TURN/STUN بنجاح!${NC}"
echo "========================================="
echo ""
echo "📋 معلومات الخادم:"
echo "   - العنوان العام: $PUBLIC_IP"
echo "   - النطاق: $DOMAIN"
echo "   - منفذ STUN: 3478"
echo "   - منفذ TURN: 3478"
echo "   - منفذ TURN/TLS: 5349"
echo ""
echo "🔑 بيانات الاعتماد:"
echo "   - كلمة السر السرية: $SECRET"
echo ""
echo "📊 لوحات المراقبة:"
echo "   - Prometheus: http://localhost:9090"
echo "   - Grafana: http://localhost:3000"
echo "   - اسم المستخدم: admin"
echo "   - كلمة المرور: VoiceTurnAdmin2024!"
echo ""
echo "📝 الأوامر المفيدة:"
echo "   - مشاهدة السجلات: docker-compose logs -f coturn"
echo "   - إعادة التشغيل: docker-compose restart"
echo "   - الإيقاف: docker-compose down"
echo "   - الحالة: docker-compose ps"
echo ""
echo "⚠️  تذكر:"
echo "   1. حفظ كلمة السر السرية في مكان آمن"
echo "   2. تحديث إعدادات التطبيق لاستخدام هذا الخادم"
echo "   3. اختبار الاتصال قبل الإنتاج"
echo ""
echo "========================================="

# ========================================
# حفظ المعلومات
# ========================================

cat > server-info.txt << EOF
TURN/STUN Server Information
Generated: $(date)
========================================

Public IP: $PUBLIC_IP
Private IP: $PRIVATE_IP
Domain: $DOMAIN

STUN URL: stun:$DOMAIN:3478
TURN URL: turn:$DOMAIN:3478
TURN/TLS URL: turns:$DOMAIN:5349

Secret: $SECRET

Test with:
- STUN: stun:$PUBLIC_IP:3478
- TURN: turn:$PUBLIC_IP:3478

========================================
EOF

print_success "تم حفظ المعلومات في server-info.txt"

echo ""
echo "✅ اكتمل الإعداد!"