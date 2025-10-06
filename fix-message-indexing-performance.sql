-- إصلاح شامل لمشاكل الفهرسة والأداء في نظام الرسائل
-- تاريخ الإنشاء: 2025-01-06

-- 1. إضافة فهارس محسنة للرسائل الخاصة
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_private_conversation 
ON messages (sender_id, receiver_id, "timestamp" DESC) 
WHERE is_private = TRUE;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_private_reverse 
ON messages (receiver_id, sender_id, "timestamp" DESC) 
WHERE is_private = TRUE;

-- 2. فهرس مركب لمؤشرات القراءة
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_conversation_reads_unique 
ON conversation_reads (user_id, other_user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversation_reads_lookup 
ON conversation_reads (other_user_id, user_id);

-- 3. فهرس للرسائل حسب الغرفة والوقت
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_room_timestamp 
ON messages (room_id, "timestamp" DESC) 
WHERE is_private = FALSE AND deleted_at IS NULL;

-- 4. فهرس للرسائل الخاصة حسب المستلم والوقت (للعد السريع)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_receiver_timestamp 
ON messages (receiver_id, "timestamp" DESC) 
WHERE is_private = TRUE;

-- 5. فهرس جزئي للرسائل غير المحذوفة
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_active 
ON messages (id, "timestamp" DESC) 
WHERE deleted_at IS NULL;

-- 6. إحصائيات محدثة لمحسن الاستعلامات
ANALYZE messages;
ANALYZE conversation_reads;
ANALYZE users;

-- 7. تحسين إعدادات PostgreSQL للأداء
-- (يجب تطبيقها على مستوى قاعدة البيانات)
/*
shared_preload_libraries = 'pg_stat_statements'
effective_cache_size = '1GB'
random_page_cost = 1.1
work_mem = '16MB'
maintenance_work_mem = '256MB'
*/

COMMIT;