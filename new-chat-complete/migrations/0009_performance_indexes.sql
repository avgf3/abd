-- Migration: تحسينات فهارس الأداء تحت الضغط
-- Date: 2024
-- Purpose: إضافة فهارس جزئية محسنة لتحسين أداء استعلامات الرسائل

-- ==========================================
-- 1. فهارس جزئية لرسائل الغرف
-- ==========================================

-- فهرس جزئي للرسائل الحديثة فقط (آخر 7 أيام)
-- يحسن أداء استعلامات الرسائل الحديثة بشكل كبير
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_room_messages_recent_partial
ON messages (room_id, timestamp DESC)
WHERE timestamp > (CURRENT_TIMESTAMP - INTERVAL '7 days')
  AND deleted_at IS NULL
  AND is_private = false;

-- فهرس جزئي للرسائل غير المحذوفة فقط
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_room_messages_active
ON messages (room_id, timestamp DESC)
WHERE deleted_at IS NULL
  AND is_private = false;

-- فهرس مركب للصفحات (pagination)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_pagination
ON messages (room_id, id DESC)
WHERE deleted_at IS NULL
  AND is_private = false;

-- ==========================================
-- 2. فهارس للرسائل الخاصة
-- ==========================================

-- فهرس جزئي للرسائل الخاصة النشطة
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_private_messages_active
ON messages (sender_id, receiver_id, timestamp DESC)
WHERE is_private = true
  AND deleted_at IS NULL;

-- فهرس للمحادثات الثنائية
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_private_conversations
ON messages (
  LEAST(sender_id, receiver_id),
  GREATEST(sender_id, receiver_id),
  timestamp DESC
)
WHERE is_private = true
  AND deleted_at IS NULL;

-- ==========================================
-- 3. فهارس الإحصائيات
-- ==========================================

-- فهرس لعد الرسائل بسرعة
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_count_per_room
ON messages (room_id)
WHERE deleted_at IS NULL
  AND is_private = false;

-- فهرس للرسائل حسب المستخدم
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_messages_recent
ON messages (sender_id, timestamp DESC)
WHERE timestamp > (CURRENT_TIMESTAMP - INTERVAL '30 days')
  AND deleted_at IS NULL;

-- ==========================================
-- 4. فهارس الغرف
-- ==========================================

-- فهرس للغرف النشطة
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rooms_active_sorted
ON rooms (created_at DESC)
WHERE deleted_at IS NULL
  AND is_active = true;

-- فهرس للبحث في أسماء الغرف
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rooms_name_search
ON rooms (LOWER(name))
WHERE deleted_at IS NULL;

-- ==========================================
-- 5. فهارس المستخدمين
-- ==========================================

-- فهرس للمستخدمين المتصلين
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_online_active
ON users (last_seen DESC)
WHERE is_online = true
  AND deleted_at IS NULL;

-- فهرس للبحث السريع عن المستخدمين
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_username_lower
ON users (LOWER(username))
WHERE deleted_at IS NULL;

-- ==========================================
-- 6. تحسينات إضافية
-- ==========================================

-- تحديث إحصائيات الجداول لتحسين خطط الاستعلام
ANALYZE messages;
ANALYZE rooms;
ANALYZE users;
ANALYZE room_members;

-- إعداد autovacuum للجداول عالية النشاط
ALTER TABLE messages SET (
  autovacuum_vacuum_scale_factor = 0.1,
  autovacuum_analyze_scale_factor = 0.05,
  autovacuum_vacuum_cost_delay = 10
);

ALTER TABLE rooms SET (
  autovacuum_vacuum_scale_factor = 0.2,
  autovacuum_analyze_scale_factor = 0.1
);

-- ==========================================
-- 7. حذف الفهارس القديمة غير الفعالة
-- ==========================================

-- حذف الفهارس المكررة أو غير الفعالة (إن وجدت)
DROP INDEX CONCURRENTLY IF EXISTS idx_messages_timestamp;
DROP INDEX CONCURRENTLY IF EXISTS idx_room_messages;

-- ==========================================
-- معلومات الفهارس
-- ==========================================
COMMENT ON INDEX idx_room_messages_recent_partial IS 'فهرس جزئي للرسائل الحديثة - يحسن أداء الاستعلامات للرسائل في آخر 7 أيام';
COMMENT ON INDEX idx_room_messages_active IS 'فهرس للرسائل النشطة غير المحذوفة - يحسن استعلامات جلب رسائل الغرف';
COMMENT ON INDEX idx_messages_pagination IS 'فهرس مركب للصفحات - يحسن أداء التنقل بين الصفحات';
COMMENT ON INDEX idx_private_messages_active IS 'فهرس للرسائل الخاصة النشطة - يحسن استعلامات المحادثات الخاصة';
COMMENT ON INDEX idx_private_conversations IS 'فهرس للمحادثات الثنائية - يحسن جلب المحادثات بين مستخدمين';