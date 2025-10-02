# 🚀 دليل النشر

## المتطلبات

- Node.js >= 18.0.0
- PostgreSQL >= 14
- Redis (اختياري للكاش)
- مساحة تخزين للملفات المرفوعة

## البيئات المدعومة

- ✅ Replit
- ✅ Heroku
- ✅ Railway
- ✅ Render
- ✅ DigitalOcean
- ✅ AWS
- ✅ VPS

---

## 1️⃣ إعداد قاعدة البيانات

### خيار A: Supabase (مجاني)

1. اذهب إلى [supabase.com](https://supabase.com)
2. أنشئ مشروع جديد
3. انسخ `DATABASE_URL` من Settings > Database
4. نفّذ migrations:

```bash
psql $DATABASE_URL -f migrations/add_profile_advanced_features.sql
```

### خيار B: Neon (مجاني)

1. اذهب إلى [neon.tech](https://neon.tech)
2. أنشئ database جديد
3. انسخ connection string
4. نفّذ migrations

### خيار C: PostgreSQL محلي

```bash
# تثبيت PostgreSQL
sudo apt-get install postgresql

# إنشاء database
createdb arabic_chat

# تنفيذ migrations
psql arabic_chat < migrations/add_profile_advanced_features.sql
```

---

## 2️⃣ متغيرات البيئة

أنشئ ملف `.env`:

```env
# ==================================
# Database
# ==================================
DATABASE_URL=postgresql://user:password@host:port/database

# ==================================
# Redis (optional)
# ==================================
REDIS_URL=redis://localhost:6379

# ==================================
# Session
# ==================================
SESSION_SECRET=change-this-to-a-random-string-min-32-chars

# ==================================
# Server
# ==================================
PORT=5000
NODE_ENV=production

# ==================================
# Security (optional)
# ==================================
ALLOWED_ORIGINS=https://yourdomain.com
RATE_LIMIT_MAX=100
```

### توليد SESSION_SECRET آمن:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 3️⃣ البناء

```bash
# تثبيت الحزم
npm install

# بناء المشروع
npm run build
```

---

## 4️⃣ النشر

### A) Replit

1. Fork المشروع في Replit
2. أضف Secrets:
   - `DATABASE_URL`
   - `SESSION_SECRET`
3. اضغط Run

### B) Railway

```bash
# تثبيت Railway CLI
npm i -g @railway/cli

# تسجيل الدخول
railway login

# إنشاء مشروع جديد
railway init

# إضافة PostgreSQL
railway add postgresql

# إضافة متغيرات البيئة
railway variables set SESSION_SECRET=your-secret

# نشر
railway up
```

### C) Heroku

```bash
# تسجيل الدخول
heroku login

# إنشاء تطبيق
heroku create arabic-chat-app

# إضافة PostgreSQL
heroku addons:create heroku-postgresql:essential-0

# إضافة Redis (optional)
heroku addons:create heroku-redis:mini

# تعيين متغيرات البيئة
heroku config:set SESSION_SECRET=your-secret
heroku config:set NODE_ENV=production

# نشر
git push heroku main

# تشغيل migrations
heroku run bash
psql $DATABASE_URL -f migrations/add_profile_advanced_features.sql
```

### D) VPS (Ubuntu/Debian)

```bash
# 1. تحديث النظام
sudo apt update && sudo apt upgrade -y

# 2. تثبيت Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. تثبيت PostgreSQL
sudo apt-get install postgresql postgresql-contrib

# 4. تثبيت PM2
sudo npm install -g pm2

# 5. Clone المشروع
git clone https://github.com/yourusername/arabic-chat-complete.git
cd arabic-chat-complete

# 6. تثبيت الحزم
npm install

# 7. إعداد .env
nano .env
# (أضف المتغيرات)

# 8. بناء المشروع
npm run build

# 9. تشغيل بـ PM2
pm2 start dist/index.js --name arabic-chat

# 10. حفظ PM2
pm2 save
pm2 startup
```

---

## 5️⃣ Nginx (للـ VPS)

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
    }

    # WebSocket support
    location /socket.io/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

تفعيل SSL مع Let's Encrypt:

```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

---

## 6️⃣ Docker (اختياري)

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

RUN npm run build

EXPOSE 5000

CMD ["npm", "start"]
```

```bash
# بناء
docker build -t arabic-chat .

# تشغيل
docker run -p 5000:5000 \
  -e DATABASE_URL=your-db-url \
  -e SESSION_SECRET=your-secret \
  arabic-chat
```

---

## 7️⃣ بعد النشر

### تحقق من:

```bash
# 1. الصحة
curl https://yourdomain.com/health

# 2. قاعدة البيانات
# تسجيل دخول وتحقق من الاتصال

# 3. Socket.IO
# افتح DevTools > Network > WS
```

### Monitoring

```bash
# PM2 logs
pm2 logs arabic-chat

# PM2 monitoring
pm2 monit

# PM2 dashboard
pm2 plus
```

---

## 8️⃣ الصيانة

### النسخ الاحتياطي

```bash
# قاعدة البيانات
pg_dump $DATABASE_URL > backup.sql

# Uploads
tar -czf uploads-backup.tar.gz uploads/
```

### التحديث

```bash
# Pull latest
git pull origin main

# Install
npm install

# Build
npm run build

# Restart
pm2 restart arabic-chat
```

---

## 🔐 الأمان

### Checklist:

- ✅ تغيير `SESSION_SECRET`
- ✅ تفعيل HTTPS
- ✅ تعيين `ALLOWED_ORIGINS`
- ✅ تفعيل Rate Limiting
- ✅ تحديث Dependencies بانتظام
- ✅ Firewall على VPS
- ✅ نسخ احتياطية منتظمة

---

## 📊 الأداء

### تحسينات مقترحة:

1. **CDN** للملفات الثابتة
2. **Redis** للـ caching
3. **Load Balancer** للتوزيع
4. **Database Indexes** محسّنة
5. **Compression** للـ responses

---

## 🆘 استكشاف الأخطاء

### المشكلة: البناء يفشل
```bash
# مسح node_modules
rm -rf node_modules package-lock.json
npm install
npm run build
```

### المشكلة: قاعدة البيانات لا تتصل
```bash
# تحقق من DATABASE_URL
echo $DATABASE_URL

# اختبر الاتصال
psql $DATABASE_URL -c "SELECT 1"
```

### المشكلة: Socket.IO لا يعمل
- تأكد من تفعيل WebSocket في Nginx
- تحقق من CORS settings
- تحقق من Firewall

---

## 📞 الدعم

- GitHub Issues
- Email: support@yourdomain.com

---

**جاهز للنشر! 🚀**
