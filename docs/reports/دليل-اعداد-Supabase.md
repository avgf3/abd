# 📚 دليل إعداد قاعدة بيانات Supabase

## 🎯 المشكلة الحالية

- تطبيق الدردشة يحاول الاتصال بقاعدة بيانات محلية غير موجودة
- يحتاج إلى رابط قاعدة بيانات Supabase صالح للعمل بشكل صحيح

---

## 🚀 خطوات الإعداد

### 1. إنشاء مشروع Supabase جديد

1. **اذهب إلى**: https://supabase.com
2. **اضغط على**: "Start your project"
3. **قم بتسجيل الدخول** أو إنشاء حساب جديد
4. **اضغط على**: "New Project"
5. **املأ المعلومات**:
   - اسم المشروع: `arabic-chat-app`
   - كلمة مرور قاعدة البيانات: (استخدم كلمة مرور قوية)
   - المنطقة: اختر الأقرب لك

### 2. الحصول على رابط قاعدة البيانات

1. **بعد إنشاء المشروع**, انتظر حتى يكتمل الإعداد (2-3 دقائق)
2. **اذهب إلى**: Settings > Database
3. **انسخ** "Connection string" من قسم "Connection pooling"

الرابط سيكون بهذا الشكل:

```
postgresql://postgres:[YOUR-PASSWORD]@[PROJECT-ID].supabase.co:5432/postgres
```

### 3. تحديث ملف البيئة

1. **افتح ملف** `.env` في مجلد المشروع
2. **استبدل السطر الحالي** بالرابط الجديد:

```bash
# قبل (مشكلة):
DATABASE_URL=postgresql://localhost:5432/chatapp_dev

# بعد (الحل):
DATABASE_URL=postgresql://postgres:YOUR_ACTUAL_PASSWORD@your-project-id.supabase.co:5432/postgres
```

### 4. إنشاء الجداول المطلوبة

#### طريقة 1: استخدام SQL Editor في Supabase

1. **اذهب إلى**: SQL Editor في لوحة تحكم Supabase
2. **انسخ وألصق** هذا الكود:

```sql
-- إنشاء جدول المستخدمين
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT,
  user_type TEXT NOT NULL DEFAULT 'guest',
  role TEXT NOT NULL DEFAULT 'guest',
  profile_image TEXT,
  profile_banner TEXT,
  profile_background_color TEXT DEFAULT '#ffffff',
  status TEXT,
  gender TEXT,
  age INTEGER,
  country TEXT,
  relation TEXT,
  bio TEXT,
  is_online INTEGER DEFAULT 0,
  is_hidden INTEGER DEFAULT 0,
  last_seen TEXT,
  join_date TEXT,
  created_at TEXT,
  is_muted INTEGER DEFAULT 0,
  mute_expiry TEXT,
  is_banned INTEGER DEFAULT 0,
  ban_expiry TEXT,
  is_blocked INTEGER DEFAULT 0,
  ip_address TEXT,
  device_id TEXT,
  ignored_users TEXT DEFAULT '[]',
  username_color TEXT DEFAULT '#FFFFFF',
  user_theme TEXT DEFAULT 'default'
);

-- إنشاء جدول الرسائل
CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  sender_id INTEGER REFERENCES users(id),
  receiver_id INTEGER REFERENCES users(id),
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text',
  is_private INTEGER DEFAULT 0,
  timestamp TEXT
);

-- إنشاء جدول الأصدقاء
CREATE TABLE friends (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  friend_id INTEGER REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT
);

-- إنشاء جدول الإشعارات
CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read INTEGER DEFAULT 0,
  data TEXT,
  created_at TEXT
);

-- إنشاء جدول الأجهزة المحظورة
CREATE TABLE blocked_devices (
  id SERIAL PRIMARY KEY,
  ip_address TEXT NOT NULL,
  device_id TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  reason TEXT NOT NULL,
  blocked_at TEXT NOT NULL,
  blocked_by INTEGER NOT NULL
);

-- إنشاء مستخدم مدير افتراضي
INSERT INTO users (username, password, user_type, role, gender, profile_image, is_online, last_seen, join_date, created_at)
VALUES ('admin', 'admin123', 'owner', 'owner', 'male', '/default_avatar.svg', 0,
        datetime('now'), datetime('now'), datetime('now'));
```

3. **اضغط على**: Run

#### طريقة 2: استخدام Drizzle Migration (تلقائي)

```bash
# من مجلد المشروع
npm run db:push
```

---

## 🧪 اختبار الاتصال

### 1. تشغيل الخادم

```bash
npm run dev
```

### 2. اختبار تسجيل الدخول

```bash
# اختبار المدير
curl -X POST http://localhost:5000/api/auth/member \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

**النتيجة المتوقعة**:

```json
{
  "user": {
    "id": 1,
    "username": "admin",
    "userType": "owner",
    "role": "owner",
    "isOnline": true
  }
}
```

### 3. اختبار تسجيل عضوية جديدة

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username":"testuser",
    "password":"123456",
    "confirmPassword":"123456",
    "gender":"male"
  }'
```

---

## 🔧 حل المشاكل الشائعة

### مشكلة: "connection refused"

```bash
# تأكد من صحة رابط قاعدة البيانات
echo $DATABASE_URL
```

### مشكلة: "password authentication failed"

- تأكد من كلمة المرور في الرابط
- استخدم كلمة المرور التي أدخلتها عند إنشاء المشروع

### مشكلة: "database does not exist"

- تأكد من اسم قاعدة البيانات في الرابط (عادة `postgres`)

### مشكلة: "SSL connection required"

- أضف `?sslmode=require` لنهاية الرابط:

```
DATABASE_URL=postgresql://postgres:password@host:5432/postgres?sslmode=require
```

---

## ✅ علامات النجاح

عند نجاح الإعداد ستظهر هذه الرسائل في الكونسول:

```
✅ تم الاتصال بقاعدة بيانات PostgreSQL
✅ تم إنشاء المستخدم في قاعدة البيانات: admin
🚀 الخادم يعمل على البورت 5000
```

---

## 📞 المساعدة

إذا واجهت مشاكل:

1. تأكد من صحة رابط قاعدة البيانات
2. تحقق من أن المشروع في Supabase نشط
3. راجع رسائل الخطأ في الكونسول
4. جرب إعادة تشغيل الخادم بعد تحديث ملف `.env`

---

## 🎉 التأكيد النهائي

بعد إتمام الإعداد:

- ✅ تسجيل الدخول كمدير يعمل
- ✅ تسجيل عضوية جديدة يعمل
- ✅ قاعدة البيانات متصلة
- ✅ الرسائل محفوظة في قاعدة البيانات
