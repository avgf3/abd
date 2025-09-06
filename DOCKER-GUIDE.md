# 🐳 دليل تشغيل البوت باستخدام Docker

## 🚀 البدء السريع مع Docker

### 1. إعداد ملف البيئة
```bash
# نسخ ملف الإعدادات النموذجي
cp .env.telegram.example .env.telegram

# تعديل الإعدادات
nano .env.telegram
```

### 2. بناء وتشغيل البوت
```bash
# بناء الصورة
docker-compose -f docker-compose.telegram.yml build

# تشغيل البوت
docker-compose -f docker-compose.telegram.yml up -d
```

### 3. مراقبة البوت
```bash
# عرض السجلات
docker-compose -f docker-compose.telegram.yml logs -f

# فحص حالة البوت
docker-compose -f docker-compose.telegram.yml ps
```

## 📋 الأوامر المفيدة

### إدارة الحاوية
```bash
# إيقاف البوت
docker-compose -f docker-compose.telegram.yml stop

# إعادة تشغيل البوت
docker-compose -f docker-compose.telegram.yml restart

# حذف الحاوية
docker-compose -f docker-compose.telegram.yml down

# حذف الحاوية مع البيانات
docker-compose -f docker-compose.telegram.yml down -v
```

### مراقبة الأداء
```bash
# إحصائيات الاستخدام
docker stats telegram-smart-bot

# دخول للحاوية
docker exec -it telegram-smart-bot sh

# فحص البيانات
docker exec -it telegram-smart-bot ls -la data/
```

## 🔧 تخصيص الإعدادات

### تعديل docker-compose.yml
```yaml
# تغيير حدود الذاكرة
deploy:
  resources:
    limits:
      memory: 512M  # زيادة الذاكرة
      
# إضافة متغيرات بيئة
environment:
  - DEBUG=true
  - LOG_LEVEL=verbose
```

### استخدام ملف إعدادات خارجي
```bash
# ربط ملف إعدادات من مكان آخر
volumes:
  - /path/to/your/.env.telegram:/app/.env.telegram:ro
```

## 🔄 التحديثات

### تحديث البوت
```bash
# سحب آخر تحديثات الكود
git pull

# إعادة بناء الصورة
docker-compose -f docker-compose.telegram.yml build --no-cache

# إعادة تشغيل بالإصدار الجديد
docker-compose -f docker-compose.telegram.yml up -d
```

## 🛡️ النسخ الاحتياطية

### نسخ احتياطي للبيانات
```bash
# إنشاء نسخة احتياطية
docker run --rm -v $(pwd)/data:/backup alpine tar czf /backup/bot-backup-$(date +%Y%m%d).tar.gz /backup

# استعادة النسخة الاحتياطية
docker run --rm -v $(pwd)/data:/backup alpine tar xzf /backup/bot-backup-YYYYMMDD.tar.gz -C /
```

## 🔍 استكشاف الأخطاء

### مشاكل شائعة
```bash
# البوت لا يبدأ
docker-compose -f docker-compose.telegram.yml logs telegram-bot

# مشاكل الأذونات
docker exec -it telegram-smart-bot ls -la /app/data/

# مشاكل الذاكرة
docker stats --no-stream telegram-smart-bot
```

## 🌐 النشر على الخوادم

### النشر على VPS
```bash
# نسخ الملفات للخادم
scp -r . user@server:/opt/telegram-bot/

# تشغيل على الخادم
ssh user@server "cd /opt/telegram-bot && docker-compose -f docker-compose.telegram.yml up -d"
```

### استخدام Docker Swarm
```bash
# تهيئة Swarm
docker swarm init

# نشر البوت
docker stack deploy -c docker-compose.telegram.yml telegram-bot-stack
```

## 📊 المراقبة المتقدمة

### إضافة Prometheus monitoring
```yaml
# إضافة للـ docker-compose.yml
  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
```

### إضافة Grafana للإحصائيات
```yaml
  grafana:
    image: grafana/grafana
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin123
```

هذا الدليل يوفر جميع المعلومات المطلوبة لتشغيل البوت باستخدام Docker بطريقة احترافية! 🚀