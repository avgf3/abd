# إصلاح مشكلة تسجيل دخول الأعضاء

## المشكلة
الموقع يسمح بدخول الزوار فقط لكن لا يسمح للأعضاء بتسجيل الدخول بسبب عمود `role` مفقود في قاعدة البيانات.

## الخطأ المُسجل
```
error: column "role" does not exist
```

## الحل

### الطريقة الأولى: تشغيل سكريبت الإصلاح

1. **تأكد من متغير البيئة:**
   ```bash
   echo $DATABASE_URL
   ```

2. **شغل سكريبت الإصلاح:**
   ```bash
   npm run db:fix
   ```

### الطريقة الثانية: إصلاح يدوي

1. **اتصل بقاعدة البيانات:**
   ```sql
   -- إضافة عمود role المفقود
   ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'guest';
   
   -- تحديث القيم الموجودة
   UPDATE users SET role = COALESCE(user_type, 'guest');
   
   -- إضافة أعمدة أخرى مفقودة (اختيارية)
   ALTER TABLE users ADD COLUMN profile_background_color TEXT DEFAULT '#3c0d0d';
   ALTER TABLE users ADD COLUMN username_color TEXT DEFAULT '#FFFFFF';
   ALTER TABLE users ADD COLUMN user_theme TEXT DEFAULT 'default';
   ALTER TABLE users ADD COLUMN bio TEXT;
   ALTER TABLE users ADD COLUMN ignored_users TEXT[] DEFAULT '{}';
   ```

2. **تحقق من النتيجة:**
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name='users' 
   ORDER BY ordinal_position;
   ```

## التحقق من الإصلاح

بعد تشغيل الإصلاح، يجب أن يعمل تسجيل دخول الأعضاء بشكل طبيعي.

### اختبار المستخدمين الافتراضيين:

1. **مدير:**
   - اسم المستخدم: `admin`
   - كلمة المرور: `admin123`

2. **عضو تجريبي:**
   - اسم المستخدم: `testuser`
   - كلمة المرور: `test123`

## الأسباب المحتملة للمشكلة

1. **تحديث غير مكتمل:** تم تحديث الكود لكن لم يتم تحديث قاعدة البيانات
2. **migration مفقود:** لم يتم تشغيل migration لإضافة العمود الجديد
3. **انقطاع في النشر:** حدث خطأ أثناء النشر منع إكمال تحديث قاعدة البيانات

## ملاحظات مهمة

- **الزوار يعملون:** لأنهم يُخزنون في الذاكرة وليس في قاعدة البيانات
- **الأعضاء يفشلون:** لأنهم يُخزنون في قاعدة البيانات التي تفتقر للعمود المطلوب
- **لا تفقد البيانات:** الإصلاح آمن ولا يحذف أي بيانات موجودة

## إذا استمرت المشكلة

1. تحقق من سجلات الخادم:
   ```bash
   tail -f server.log
   ```

2. تحقق من اتصال قاعدة البيانات:
   ```bash
   echo $DATABASE_URL
   ```

3. تأكد من صلاحيات قاعدة البيانات للتعديل