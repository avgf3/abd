# 🚀 دليل نشر تطبيق الدردشة العربية على Render مع Supabase

## 🎯 المشكلة المحددة

- التطبيق لا يستطيع الاتصال بقاعدة بيانات Supabase عند النشر على Render
- رسائل خطأ في الاتصال أو مشاكل في SSL

---

## ✅ الحل الكامل خطوة بخطوة

### 1. إعداد قاعدة بيانات Supabase

#### 1.1 الحصول على رابط قاعدة البيانات الصحيح

1. **اذهب إلى**: https://supabase.com/dashboard/project/qzehjgmawnrihmepboca
2. **اضغط على**: Settings (الإعدادات)
3. **اختر**: Database من القائمة الجانبية
4. **انسخ**: Connection string من قسم "Connection pooling"

الرابط يجب أن يكون بهذا الشكل:

```
postgresql://postgres.qzehjgmawnrihmepboca:[YOUR-PASSWORD]@aws-0-us-west-1.pooler.supabase.com:5432/postgres
```

#### 1.2 تحديث كلمة المرور

**مهم جداً**: استبدل `[YOUR-PASSWORD]` بكلمة المرور الفعلية لقاعدة البيانات.

### 2. إعداد الجداول في Supabase

#### 2.1 باستخدام SQL Editor

1. **اذهب إلى**: SQL Editor في Supabase Dashboard
2. **انسخ وألصق** الكود التالي:

```sql
-- إنشاء جدول المستخدمين
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT,
  user_type TEXT NOT NULL DEFAULT 'guest',
  role TEXT NOT NULL DEFAULT 'guest',
  profile_image TEXT,
  profile_banner TEXT,
  profile_background_color TEXT DEFAULT '#3c0d0d',
  status TEXT,
  gender TEXT,
  age INTEGER,
  country TEXT,
  relation TEXT,
  bio TEXT,
  is_online BOOLEAN DEFAULT false,
  is_hidden BOOLEAN DEFAULT false,
  last_seen TIMESTAMP,
  join_date TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  is_muted BOOLEAN DEFAULT false,
  mute_expiry TIMESTAMP,
  is_banned BOOLEAN DEFAULT false,
  ban_expiry TIMESTAMP,
  is_blocked BOOLEAN DEFAULT false,
  ip_address VARCHAR(45),
  device_id VARCHAR(100),
  ignored_users TEXT DEFAULT '[]',
  username_color TEXT DEFAULT '#FFFFFF',
  user_theme TEXT DEFAULT 'default',
  profile_effect TEXT DEFAULT 'none',
  points INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  total_points INTEGER DEFAULT 0,
  level_progress INTEGER DEFAULT 0
);

-- إنشاء جدول الرسائل
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  sender_id INTEGER REFERENCES users(id),
  receiver_id INTEGER REFERENCES users(id),
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text',
  is_private BOOLEAN DEFAULT false,
  room_id TEXT DEFAULT 'general',
  timestamp TIMESTAMP DEFAULT NOW()
);

-- إنشاء جدول الأصدقاء
CREATE TABLE IF NOT EXISTS friends (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  friend_id INTEGER REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

-- إنشاء جدول الإشعارات
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- إنشاء جدول الأجهزة المحظورة
CREATE TABLE IF NOT EXISTS blocked_devices (
  id SERIAL PRIMARY KEY,
  ip_address TEXT NOT NULL,
  device_id TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  reason TEXT NOT NULL,
  blocked_at TIMESTAMP NOT NULL,
  blocked_by INTEGER NOT NULL,
  UNIQUE(ip_address, device_id)
);

-- إنشاء جدول إعدادات المستويات
CREATE TABLE IF NOT EXISTS level_settings (
  id SERIAL PRIMARY KEY,
  level INTEGER NOT NULL UNIQUE,
  required_points INTEGER NOT NULL,
  title TEXT NOT NULL,
  color TEXT DEFAULT '#FFFFFF',
  benefits JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- إنشاء جدول تاريخ النقاط
CREATE TABLE IF NOT EXISTS points_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  points INTEGER NOT NULL,
  reason TEXT NOT NULL,
  action TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- إنشاء المستخدم الافتراضي (المدير)
INSERT INTO users (username, password, user_type, role, gender, profile_image,
                  is_online, points, level, total_points, level_progress)
VALUES ('admin', 'admin123', 'owner', 'owner', 'male', '/default_avatar.svg',
        false, 1000, 3, 1000, 0)
ON CONFLICT (username) DO NOTHING;

-- إنشاء مستخدم اختبار
INSERT INTO users (username, password, user_type, role, gender, profile_image,
                  is_online, points, level, total_points, level_progress)
VALUES ('testuser', 'test123', 'member', 'member', 'female', '/default_avatar.svg',
        false, 150, 2, 150, 50)
ON CONFLICT (username) DO NOTHING;

-- إعداد مستويات النقاط
INSERT INTO level_settings (level, required_points, title, color, benefits) VALUES
(1, 0, 'مبتدئ', '#FFFFFF', '{"dailyBonus": 10, "specialFeatures": []}'),
(2, 100, 'متدرب', '#10B981', '{"dailyBonus": 20, "specialFeatures": []}'),
(3, 250, 'نشط', '#3B82F6', '{"dailyBonus": 30, "specialFeatures": []}'),
(4, 500, 'متقدم', '#8B5CF6', '{"dailyBonus": 40, "specialFeatures": []}'),
(5, 1000, 'خبير', '#F59E0B', '{"dailyBonus": 50, "specialFeatures": []}'),
(6, 2000, 'محترف', '#EF4444', '{"dailyBonus": 60, "specialFeatures": ["custom_colors"]}'),
(7, 4000, 'أسطورة', '#EC4899', '{"dailyBonus": 70, "specialFeatures": ["custom_colors", "profile_effects"]}'),
(8, 8000, 'بطل', '#6366F1', '{"dailyBonus": 80, "specialFeatures": ["custom_colors", "profile_effects"]}'),
(9, 15000, 'ملك', '#F97316', '{"dailyBonus": 90, "specialFeatures": ["custom_colors", "profile_effects"]}'),
(10, 30000, 'إمبراطور', '#DC2626', '{"dailyBonus": 100, "specialFeatures": ["custom_colors", "profile_effects"]}')
ON CONFLICT (level) DO NOTHING;
```

3. **اضغط على**: Run للتشغيل

### 3. اختبار الاتصال محلياً

1. **حدث ملف `.env`**:

```bash
DATABASE_URL=postgresql://postgres.qzehjgmawnrihmepboca:YOUR_ACTUAL_PASSWORD@aws-0-us-west-1.pooler.supabase.com:5432/postgres?sslmode=require
NODE_ENV=development
PORT=3000
```

2. **شغل سكريبت الاختبار**:

```bash
node fix-supabase-connection.js
```

### 4. إعداد النشر على Render

#### 4.1 إعداد متغيرات البيئة في Render

1. **اذهب إلى**: Render Dashboard
2. **اختر مشروعك** أو أنشئ خدمة جديدة
3. **في قسم Environment Variables**, أضف:

```bash
DATABASE_URL=postgresql://postgres.qzehjgmawnrihmepboca:YOUR_ACTUAL_PASSWORD@aws-0-us-west-1.pooler.supabase.com:5432/postgres?sslmode=require
NODE_ENV=production
PORT=10000
JWT_SECRET=arabic-chat-secret-key-2025-production
SESSION_SECRET=arabic-chat-session-secret-2025-production
CORS_ORIGIN=https://your-app-name.onrender.com
ENABLE_WEBSOCKET=true
SOCKET_IO_POLLING_ONLY=false
```

#### 4.2 إعداد Build وStart Commands

- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`

#### 4.3 تحديث ملف `render.yaml`

استخدم الإعدادات المحدثة في ملف `render.yaml`:

```yaml
services:
  - type: web
    name: arabic-chat-app
    env: node
    region: oregon
    buildCommand: npm install && npm run build
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 10000
      - key: DATABASE_URL
        value: postgresql://postgres.qzehjgmawnrihmepboca:YOUR_ACTUAL_PASSWORD@aws-0-us-west-1.pooler.supabase.com:5432/postgres?sslmode=require
      - key: JWT_SECRET
        value: arabic-chat-secret-key-2025-production
      - key: SESSION_SECRET
        value: arabic-chat-session-secret-2025-production
      - key: CORS_ORIGIN
        value: https://your-app-name.onrender.com
      - key: ENABLE_WEBSOCKET
        value: true
    healthCheckPath: /api/health
    plan: free
```

### 5. تشخيص وحل المشاكل

#### 5.1 مشكلة SSL

إذا ظهرت رسالة خطأ SSL:

```bash
# تأكد من وجود ?sslmode=require في نهاية الرابط
DATABASE_URL=...?sslmode=require
```

#### 5.2 مشكلة كلمة المرور

```bash
# احصل على كلمة المرور من Supabase:
# Settings > Database > Database password > Reset password
```

#### 5.3 مشكلة الاتصال

```bash
# تأكد من أن مشروع Supabase نشط ومتاح
# اختبر الاتصال محلياً أولاً
```

### 6. التحقق من النجاح

#### 6.1 فحص Logs في Render

ابحث عن هذه الرسائل في السجلات:

```
✅ نجح الاتصال بقاعدة بيانات Supabase
✅ تم إنشاء/التحقق من جميع الجداول
🚀 الخادم يعمل على البورت 10000
```

#### 6.2 اختبار الواجهة

1. **افتح الرابط**: https://your-app-name.onrender.com
2. **جرب تسجيل الدخول** بـ:
   - Username: `admin`
   - Password: `admin123`
3. **أنشئ حساب جديد** واختبر الدردشة

### 7. أوامر مفيدة للتشخيص

```bash
# اختبار الاتصال محلياً
node test-supabase-connection.js

# إصلاح الاتصال وإعداد الجداول
node fix-supabase-connection.js

# فحص قاعدة البيانات
node check-production-db.js

# تشغيل الخادم محلياً
npm run dev
```

---

## 🎉 النتيجة المتوقعة

بعد إتمام جميع الخطوات:

- ✅ التطبيق يعمل على Render بدون أخطاء
- ✅ قاعدة البيانات Supabase متصلة بنجاح
- ✅ تسجيل الدخول وإنشاء الحسابات يعمل
- ✅ الدردشة والرسائل محفوظة في قاعدة البيانات
- ✅ نظام النقاط والمستويات يعمل

---

## 📞 المساعدة الإضافية

إذا واجهت أي مشاكل:

1. **تحقق من السجلات** في Render Dashboard
2. **اختبر الاتصال محلياً** أولاً
3. **تأكد من صحة رابط قاعدة البيانات** وكلمة المرور
4. **راجع متغيرات البيئة** في Render
