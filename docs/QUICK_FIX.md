# الحل السريع - مشكلة تسجيل دخول الأعضاء

## المشكلة
```
❌ الزوار يمكنهم الدخول
❌ الأعضاء لا يمكنهم الدخول
❌ خطأ: column "role" does not exist
```

## الحل السريع

### في بيئة الإنتاج (Render):
```bash
# تشغيل الإصلاح عبر console Render أو SSH
npm run db:fix
```

### في بيئة التطوير:
```bash
# تأكد من DATABASE_URL
export DATABASE_URL="your-postgresql-url"

# شغل الإصلاح
npm run db:fix
# أو
./fix-database-local.sh
```

### إصلاح يدوي مباشر:
```sql
ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'guest';
UPDATE users SET role = COALESCE(user_type, 'guest');
```

## اختبار الحل
```
👤 اسم المستخدم: admin
🔑 كلمة المرور: admin123

أو

👤 اسم المستخدم: testuser  
🔑 كلمة المرور: test123
```

## سبب المشكلة
- قاعدة البيانات لم تتحديث مع آخر تعديلات الكود
- عمود `role` مطلوب لكنه غير موجود في جدول `users`
- الزوار يعملون لأنهم في الذاكرة، الأعضاء في قاعدة البيانات

## الحل الآمن
- ✅ لا يحذف أي بيانات
- ✅ يضيف العمود المفقود فقط  
- ✅ يحدث القيم الموجودة تلقائياً