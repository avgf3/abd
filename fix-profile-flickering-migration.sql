-- إصلاح مشكلة التذبذب في الملف الشخصي
-- تحديث جميع المستخدمين الذين لديهم currentRoom = null أو 'null' إلى 'general'

-- تحديث المستخدمين الذين لديهم currentRoom = null
UPDATE users 
SET current_room = 'general' 
WHERE current_room IS NULL;

-- تحديث المستخدمين الذين لديهم currentRoom = 'null' (كنص)
UPDATE users 
SET current_room = 'general' 
WHERE current_room = 'null';

-- إضافة فهرس لتحسين الأداء إذا لم يكن موجوداً
CREATE INDEX IF NOT EXISTS idx_users_current_room ON users(current_room);

-- إضافة فهرس لـ last_seen إذا لم يكن موجوداً
CREATE INDEX IF NOT EXISTS idx_users_last_seen ON users(last_seen);

-- عرض إحصائيات التحديث
SELECT 
    'المستخدمين المحدثين' as description,
    COUNT(*) as count
FROM users 
WHERE current_room = 'general';

-- عرض توزيع الغرف الحالية
SELECT 
    current_room,
    COUNT(*) as user_count
FROM users 
GROUP BY current_room 
ORDER BY user_count DESC;