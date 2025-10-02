-- Migration: إضافة مؤشرات لتحسين أداء الدردشة
-- التاريخ: 2024
-- الهدف: تحسين سرعة استعلامات قاعدة البيانات

-- 1. مؤشرات إضافية على جدول الرسائل
-- مؤشر مركب للبحث السريع عن الرسائل حسب الغرفة والوقت (موجود بالفعل: idx_room_messages)
-- إضافة مؤشر منفصل على senderId لتحسين البحث عن رسائل مستخدم معين
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(senderId);

-- مؤشر على الرسائل المحذوفة لتصفيتها بسرعة
CREATE INDEX IF NOT EXISTS idx_messages_deleted_at ON messages(deletedAt) WHERE deletedAt IS NULL;

-- مؤشر مركب للرسائل العامة في الغرف
CREATE INDEX IF NOT EXISTS idx_public_room_messages ON messages(roomId, timestamp DESC) 
WHERE isPrivate = false AND deletedAt IS NULL;

-- 2. مؤشرات على جدول المستخدمين
-- مؤشر على username (موجود بالفعل كـ UNIQUE)
-- مؤشر على الحالة الاتصال
CREATE INDEX IF NOT EXISTS idx_users_online_status ON users(isOnline) WHERE isOnline = true;

-- مؤشر على المستخدمين المحظورين/المكتومين
CREATE INDEX IF NOT EXISTS idx_users_moderation ON users(isBanned, isMuted) 
WHERE isBanned = true OR isMuted = true;

-- مؤشر على deviceId و ipAddress للبحث السريع
CREATE INDEX IF NOT EXISTS idx_users_device_id ON users(deviceId);
CREATE INDEX IF NOT EXISTS idx_users_ip_address ON users(ipAddress);

-- 3. مؤشرات على جدول الإشعارات
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(userId, isRead, createdAt DESC) 
WHERE isRead = false;

-- 4. مؤشرات على جدول الأصدقاء
CREATE INDEX IF NOT EXISTS idx_friends_user_status ON friends(userId, status);
CREATE INDEX IF NOT EXISTS idx_friends_friend_status ON friends(friendId, status);

-- 5. مؤشرات على جدول نقاط المستخدمين
CREATE INDEX IF NOT EXISTS idx_points_history_user ON pointsHistory(userId, createdAt DESC);

-- 6. مؤشرات على جدول الغرف
CREATE INDEX IF NOT EXISTS idx_rooms_active ON rooms(isActive, lastMessageAt DESC) WHERE isActive = true;

-- 7. مؤشرات على جدول مستخدمي الغرف
CREATE INDEX IF NOT EXISTS idx_room_users_room ON roomUsers(roomId, joinedAt DESC);
CREATE INDEX IF NOT EXISTS idx_room_users_user ON roomUsers(userId);

-- 8. تحسين أداء الاستعلامات بإضافة VACUUM و ANALYZE
-- هذا سيحسن خطط الاستعلام ويزيل الصفوف المحذوفة
VACUUM ANALYZE messages;
VACUUM ANALYZE users;
VACUUM ANALYZE rooms;
VACUUM ANALYZE roomUsers;

-- 9. إحصائيات للمساعدة في تحسين الأداء
-- عرض عدد الرسائل لكل غرفة
SELECT 
    roomId, 
    COUNT(*) as message_count,
    MAX(timestamp) as last_message_time
FROM messages 
WHERE deletedAt IS NULL 
GROUP BY roomId;

-- عرض المؤشرات الحالية
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;