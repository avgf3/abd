-- سكريپت SQL لإلغاء حظر جميع المحظورين

-- عرض المستخدمين المحظورين أولاً
\echo '🔍 المستخدمين المحظورين حالياً:'
SELECT id, username, user_type, ip_address, device_id 
FROM users 
WHERE is_blocked = true;

-- إلغاء حظر جميع المستخدمين
\echo '🔓 إلغاء حظر جميع المستخدمين...'
UPDATE users 
SET is_blocked = false, 
    ip_address = NULL, 
    device_id = NULL 
WHERE is_blocked = true;

-- تنظيف جدول الأجهزة المحجوبة
\echo '🧹 تنظيف الأجهزة المحجوبة...'
DELETE FROM blocked_devices;

-- التحقق النهائي
\echo '✅ التحقق النهائي:'
SELECT COUNT(*) as "عدد المحظورين المتبقين" FROM users WHERE is_blocked = true;
SELECT COUNT(*) as "عدد الأجهزة المحجوبة المتبقية" FROM blocked_devices;

\echo '🎉 تم إلغاء حظر جميع المستخدمين!'