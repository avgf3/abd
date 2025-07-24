# 🐘 دليل إعداد PostgreSQL مع schema public للدردشة العربية

## 📋 المتطلبات

- خادم PostgreSQL يعمل
- قاعدة بيانات جاهزة مع schema public
- صلاحيات كاملة للمستخدم

## 🔧 خطوات الإعداد

### 1. تحديث ملف .env

```bash
# تحديث رابط قاعدة البيانات
DATABASE_URL=postgresql://username:password@localhost:5432/database_name

# مثال للإعداد المحلي:
DATABASE_URL=postgresql://postgres:password@localhost:5432/chatapp

# مثال للخادم البعيد:
DATABASE_URL=postgresql://user:pass@hostname:5432/dbname
```

### 2. فحص الاتصال بقاعدة البيانات

```bash
# تحقق من الاتصال أولاً
psql -h localhost -U username -d database_name -c "SELECT version();"
```

### 3. تشغيل سكريپت الإصلاح

```bash
# إصلاح قاعدة البيانات PostgreSQL
npm run db:fix-postgresql
```

## 📊 ما يقوم به السكريپت

### 🗃️ الجداول التي يتم إنشاؤها في schema public:

1. **public.users** - جدول المستخدمين
   ```sql
   - id (SERIAL PRIMARY KEY)
   - username (TEXT UNIQUE)
   - password (TEXT)
   - user_type (TEXT DEFAULT 'guest')
   - role (TEXT DEFAULT 'guest')
   - profile_image (TEXT)
   - profile_banner (TEXT)
   - profile_background_color (TEXT)
   - bio (TEXT)
   - points (INTEGER DEFAULT 0)
   - level (INTEGER DEFAULT 1)
   - وجميع الحقول الأخرى...
   ```

2. **public.messages** - جدول الرسائل
3. **public.friends** - جدول الأصدقاء  
4. **public.notifications** - جدول الإشعارات
5. **public.points_history** - تاريخ النقاط
6. **public.level_settings** - إعدادات المستويات
7. **public.blocked_devices** - الأجهزة المحظورة

### 👑 المستخدم الافتراضي

يتم إنشاء مستخدم المالك:
- **اسم المستخدم**: المالك
- **كلمة المرور**: owner123
- **الصلاحيات**: مالك كامل
- **النقاط**: 50,000
- **المستوى**: 10

## 🚀 تشغيل التطبيق

```bash
# 1. إصلاح قاعدة البيانات
npm run db:fix-postgresql

# 2. تشغيل الخادم
npm run dev

# 3. فتح المتصفح
# http://localhost:5000
```

## 🔍 استكشاف الأخطاء

### خطأ "ENOTFOUND"
```bash
❌ المشكلة: لا يمكن العثور على الخادم
💡 الحل: تحقق من عنوان IP والمنفذ
```

### خطأ "ECONNREFUSED"  
```bash
❌ المشكلة: رفض الاتصال
💡 الحل: تأكد من تشغيل PostgreSQL
```

### خطأ "authentication failed"
```bash
❌ المشكلة: فشل في المصادقة
💡 الحل: تحقق من اسم المستخدم وكلمة المرور
```

### خطأ "database does not exist"
```bash
❌ المشكلة: قاعدة البيانات غير موجودة
💡 الحل: أنشئ قاعدة البيانات أولاً:
createdb chatapp
```

## 📝 أوامر PostgreSQL مفيدة

### إنشاء قاعدة بيانات جديدة:
```sql
CREATE DATABASE chatapp;
```

### إنشاء مستخدم جديد:
```sql
CREATE USER chatuser WITH PASSWORD 'password';
GRANT ALL PRIVILEGES ON DATABASE chatapp TO chatuser;
GRANT ALL PRIVILEGES ON SCHEMA public TO chatuser;
```

### فحص الجداول الموجودة:
```sql
\dt public.*
```

### فحص معلومات جدول معين:
```sql
\d public.users
```

## 🔐 إعدادات الأمان

### 1. تعيين كلمة مرور قوية
```bash
# في ملف .env
DATABASE_URL=postgresql://user:very_strong_password@localhost:5432/chatapp
```

### 2. تقييد الصلاحيات
```sql
-- منح صلاحيات محدودة فقط
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO chatuser;
```

### 3. تشفير الاتصال
```bash
# استخدام SSL
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require
```

## 📊 مراقبة الأداء

### فحص حالة الاتصالات:
```sql
SELECT * FROM pg_stat_activity WHERE datname = 'chatapp';
```

### فحص حجم قاعدة البيانات:
```sql
SELECT pg_size_pretty(pg_database_size('chatapp'));
```

## 🔄 النسخ الاحتياطي

### إنشاء نسخة احتياطية:
```bash
pg_dump chatapp > backup.sql
```

### استعادة من نسخة احتياطية:
```bash
psql chatapp < backup.sql
```

## ✅ التحقق من نجاح الإعداد

بعد تشغيل `npm run db:fix-postgresql`، يجب أن تشاهد:

```
✅ تم الاتصال بقاعدة البيانات بنجاح
✅ تم إنشاء/تحديث جدول المستخدمين
✅ تم إنشاء مستخدم المالك الافتراضي
✅ تم إصلاح قاعدة البيانات PostgreSQL بنجاح!
```

## 🎯 النتيجة النهائية

- 🟢 قاعدة بيانات PostgreSQL جاهزة مع schema public
- 🟢 جميع الجداول مُنشأة ومحدثة
- 🟢 مستخدم المالك جاهز للاستخدام
- 🟢 جميع الخصائص تعمل بكفاءة

**يمكنك الآن استخدام التطبيق مع قاعدة البيانات PostgreSQL! 🎉**