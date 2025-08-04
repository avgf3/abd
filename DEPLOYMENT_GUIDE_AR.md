# دليل نشر المشروع للإنتاج

## 1. إعداد البيئة

### متطلبات النظام:
- Node.js 18+ 
- PostgreSQL أو SQLite
- PM2 (لإدارة العملية)
- Nginx (اختياري للـ reverse proxy)

### متغيرات البيئة المطلوبة:
```bash
DATABASE_URL=postgresql://user:password@host:port/database
SESSION_SECRET=your-super-secret-key-here
FRONTEND_URL=https://yourdomain.com
PORT=5000
```

## 2. خطوات النشر

### أ. استنساخ المشروع:
```bash
git clone [repository-url]
cd [project-name]
```

### ب. تثبيت التبعيات:
```bash
npm install --production
```

### ج. إعداد قاعدة البيانات:
```bash
npm run db:migrate
```

### د. بناء المشروع:
```bash
chmod +x build-production.sh
./build-production.sh
```

### هـ. تشغيل المشروع:
```bash
# باستخدام PM2
pm2 start dist/index.js --name "chat-app"

# أو مباشرة
NODE_ENV=production node dist/index.js
```

## 3. إعداد Nginx (اختياري)

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /uploads {
        alias /path/to/project/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

## 4. الأمان

### أ. تفعيل HTTPS:
استخدم Let's Encrypt لشهادة SSL مجانية:
```bash
sudo certbot --nginx -d yourdomain.com
```

### ب. تكوين جدار الحماية:
```bash
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable
```

### ج. تحديثات الأمان:
```bash
# تحديث النظام
sudo apt update && sudo apt upgrade

# تحديث تبعيات Node.js
npm audit fix
```

## 5. المراقبة والصيانة

### أ. مراقبة السجلات:
```bash
# PM2 logs
pm2 logs chat-app

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### ب. نسخ احتياطي لقاعدة البيانات:
```bash
# PostgreSQL
pg_dump -U username dbname > backup_$(date +%Y%m%d).sql

# SQLite
cp data/chat.db backups/chat_$(date +%Y%m%d).db
```

### ج. تحديث التطبيق:
```bash
git pull origin main
npm install
./build-production.sh
pm2 restart chat-app
```

## 6. استكشاف الأخطاء

### المشكلة: التطبيق لا يعمل
- تحقق من السجلات: `pm2 logs`
- تحقق من البيئة: `pm2 env 0`
- تحقق من قاعدة البيانات: `npm run test:db`

### المشكلة: رفع الملفات لا يعمل
- تحقق من صلاحيات المجلد: `chmod -R 755 uploads`
- تحقق من حجم الملف المسموح
- تحقق من أنواع الملفات المسموحة

### المشكلة: WebSocket لا يعمل
- تحقق من إعدادات Nginx
- تحقق من جدار الحماية
- تحقق من CORS

## 7. الأداء

### أ. تفعيل التخزين المؤقت:
- استخدم Redis للجلسات
- فعّل تخزين الملفات الثابتة
- استخدم CDN للملفات الكبيرة

### ب. تحسين قاعدة البيانات:
- أضف فهارس للحقول المستخدمة بكثرة
- نظف البيانات القديمة دورياً
- استخدم connection pooling

### ج. مراقبة الأداء:
- استخدم New Relic أو DataDog
- راقب استخدام الذاكرة والمعالج
- راقب أوقات الاستجابة

---

للمساعدة والدعم، راجع الوثائق أو افتح issue في GitHub.
