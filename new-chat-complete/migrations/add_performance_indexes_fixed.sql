-- Migration: إضافة مؤشرات لتحسين أداء الدردشة
-- التاريخ: 2024
-- الهدف: تحسين سرعة استعلامات قاعدة البيانات

-- 1. مؤشرات إضافية على جدول الرسائل
-- مؤشر على senderId لتحسين البحث عن رسائل مستخدم معين
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);

-- مؤشر على الرسائل المحذوفة لتصفيتها بسرعة
CREATE INDEX IF NOT EXISTS idx_messages_deleted_at ON messages(deleted_at) WHERE deleted_at IS NULL;

-- مؤشر مركب للرسائل العامة في الغرف
CREATE INDEX IF NOT EXISTS idx_public_room_messages ON messages(room_id, timestamp DESC) 
WHERE is_private = false AND deleted_at IS NULL;

-- 2. مؤشرات على جدول المستخدمين
-- مؤشر على الحالة الاتصال
CREATE INDEX IF NOT EXISTS idx_users_online_status ON users(is_online) WHERE is_online = true;

-- مؤشر على المستخدمين المحظورين/المكتومين
CREATE INDEX IF NOT EXISTS idx_users_moderation ON users(is_banned, is_muted) 
WHERE is_banned = true OR is_muted = true;

-- مؤشر على device_id و ip_address للبحث السريع
CREATE INDEX IF NOT EXISTS idx_users_device_id ON users(device_id);
CREATE INDEX IF NOT EXISTS idx_users_ip_address ON users(ip_address);

-- 3. مؤشرات على جدول الإشعارات
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC) 
WHERE is_read = false;

-- 4. مؤشرات على جدول الأصدقاء
CREATE INDEX IF NOT EXISTS idx_friends_user_status ON friends(user_id, status);
CREATE INDEX IF NOT EXISTS idx_friends_friend_status ON friends(friend_id, status);

-- 5. مؤشرات على جدول نقاط المستخدمين
CREATE INDEX IF NOT EXISTS idx_points_history_user ON points_history(user_id, created_at DESC);

-- 6. مؤشرات على جدول الغرف
CREATE INDEX IF NOT EXISTS idx_rooms_active ON rooms(is_active, last_message_at DESC) WHERE is_active = true;

-- 7. مؤشرات على جدول مستخدمي الغرف
CREATE INDEX IF NOT EXISTS idx_room_users_room ON room_users(room_id, joined_at DESC);
CREATE INDEX IF NOT EXISTS idx_room_users_user ON room_users(user_id);

-- 8. تحسين أداء الاستعلامات بإضافة VACUUM و ANALYZE
VACUUM ANALYZE messages;
VACUUM ANALYZE users;
VACUUM ANALYZE rooms;
VACUUM ANALYZE room_users;