# دليل النشر - Deployment Guide

## مشكلة قاعدة البيانات وحلها

### المشكلة الأصلية:

كانت التغييرات في قاعدة البيانات لا تُطبق تلقائياً عند النشر على Render، مما يتطلب تدخل يدوي لتشغيل migrations.

### الحل المُطبق:

#### 1. تحديث إعداد النشر في `render.yaml`:

```yaml
buildCommand: npm install && npm run build && npm run db:migrate-production
```

#### 2. إضافة scripts جديدة في `package.json`:

- `db:migrate-production` - لتشغيل migrations في الإنتاج
- `db:check-production` - للتحقق من حالة قاعدة البيانات
- `deploy` - للنشر المحلي مع migrations

#### 3. ملفات جديدة:

- `migrate-production.js` - script آمن لتشغيل migrations في الإنتاج
- `check-production-db.js` - للتحقق من اتصال قاعدة البيانات

### كيفية النشر الآن:

#### النشر على Render:

```bash
git add .
git commit -m "Update database schema"
git push origin main
```

الآن عند النشر على Render:

1. ✅ يتم تثبيت المكتبات
2. ✅ يتم بناء التطبيق
3. ✅ يتم تشغيل migrations تلقائياً
4. ✅ يبدأ التطبيق

#### النشر المحلي:

```bash
npm run deploy
```

### التحقق من حالة قاعدة البيانات:

```bash
# محلياً
npm run db:check

# في الإنتاج (مع DATABASE_URL)
npm run db:check-production
```

### إعداد متغيرات البيئة في Render:

تأكد من وجود:

- `DATABASE_URL` - رابط قاعدة البيانات
- `NODE_ENV=production`

### نصائح مهمة:

1. 🔄 **Migrations تحدث تلقائياً** عند كل نشر
2. 📊 **التحقق من الحالة** قبل وبعد النشر
3. 🔒 **نسخ احتياطية** قبل التغييرات الكبيرة
4. ⚡ **سرعة النشر** محسنة مع migrations مُدمجة

### استكشاف الأخطاء:

إذا فشل النشر:

1. تحقق من logs في Render Dashboard
2. تأكد من صحة DATABASE_URL
3. شغل `npm run db:check-production` محلياً
4. تحقق من ملف migrations
