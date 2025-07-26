# إصلاح مشكلة قاعدة البيانات على Render

## المشكلة
- الموقع لا يتصل بقاعدة البيانات الحقيقية على Render
- التسجيلات الجديدة لا تذهب لقاعدة البيانات
- المشكلة في إعدادات البيئة المتغيرة

## الحلول

### 1. إصلاح ملف render.yaml
```yaml
services:
  - type: web
    name: chat-app-backend
    env: node
    buildCommand: npm install
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        fromDatabase:
          name: chat-app-db
          property: connectionString
      - key: JWT_SECRET
        generateValue: true
      - key: PORT
        value: 5000

databases:
  - name: chat-app-db
    databaseName: chat_app
    user: chat_user
```

### 2. إصلاح ملف database-adapter.ts
```typescript
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export default pool;
```

### 3. خطوات التطبيق

#### الخطوة 1: تحديث render.yaml
```bash
# نسخ الملف الجديد
cp render.yaml render.yaml.backup
```

#### الخطوة 2: إعادة نشر على Render
```bash
git add .
git commit -m "إصلاح قاعدة البيانات"
git push origin main
```

#### الخطوة 3: التحقق من المتغيرات البيئية
- اذهب إلى Render Dashboard
- اختر مشروعك
- اذهب إلى Environment Variables
- تأكد من وجود DATABASE_URL

#### الخطوة 4: إعادة تشغيل الخدمة
- في Render Dashboard
- اضغط على "Manual Deploy"
- اختر "Clear build cache & deploy"

### 4. التحقق من الإصلاح

#### اختبار الاتصال
```bash
curl -X GET https://your-app.onrender.com/api/health
```

#### اختبار التسجيل
```bash
curl -X POST https://your-app.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test123"}'
```

### 5. إعدادات إضافية

#### ملف .env.local للتطوير المحلي
```env
DATABASE_URL=postgresql://username:password@localhost:5432/chat_app
JWT_SECRET=your-secret-key
NODE_ENV=development
```

#### ملف .env.production للإنتاج
```env
DATABASE_URL=${DATABASE_URL}
JWT_SECRET=${JWT_SECRET}
NODE_ENV=production
```

### 6. استكشاف الأخطاء

#### التحقق من السجلات
```bash
# في Render Dashboard
# اذهب إلى Logs لرؤية الأخطاء
```

#### اختبار الاتصال المباشر
```bash
# في Render Shell
psql $DATABASE_URL
```

### 7. الأوامر المفيدة

#### إعادة تشغيل الخدمة
```bash
# في Render Dashboard
# Manual Deploy > Clear build cache & deploy
```

#### مسح الكاش
```bash
# في Render Dashboard
# Settings > Clear Build Cache
```

## ملاحظات مهمة
1. تأكد من أن DATABASE_URL صحيح في Render
2. تأكد من أن قاعدة البيانات نشطة
3. تأكد من أن الجداول موجودة
4. تحقق من السجلات في Render Dashboard

## إذا لم يعمل الحل
1. تحقق من سجلات Render
2. تأكد من إعدادات قاعدة البيانات
3. جرب إعادة إنشاء قاعدة البيانات
4. اتصل بدعم Render إذا لزم الأمر