-- إصلاح معرفات البوتات لتجنب تداخل الهويات
-- الحل: إضافة 1000000 لجميع معرفات البوتات

BEGIN;

-- 1. إيقاف البوتات مؤقتاً أثناء التحديث
UPDATE bots SET is_active = false WHERE is_active = true;

-- 2. تحديث معرفات البوتات في جدول الرسائل أولاً (لتجنب مشاكل المراجع)
UPDATE messages 
SET sender_id = sender_id + 1000000 
WHERE sender_id IN (SELECT id FROM bots);

-- 3. تحديث معرفات البوتات في جدول التفاعلات إن وجد
UPDATE message_reactions 
SET user_id = user_id + 1000000 
WHERE user_id IN (SELECT id FROM bots);

-- 4. تحديث معرفات البوتات في أي جداول أخرى تحتوي على مراجع
-- (يمكن إضافة المزيد حسب الحاجة)

-- 5. أخيراً، تحديث معرفات البوتات في الجدول الرئيسي
UPDATE bots SET id = id + 1000000;

-- 6. إعادة تسلسل معرفات البوتات للمستقبل
SELECT setval('bots_id_seq', (SELECT MAX(id) FROM bots));

-- 7. إضافة قيود لضمان أن البوتات تبدأ من 1000000
ALTER TABLE bots ADD CONSTRAINT check_bot_id_range 
CHECK (id >= 1000000);

-- 8. إضافة قيود لضمان أن المستخدمين أقل من 1000000
ALTER TABLE users ADD CONSTRAINT check_user_id_range 
CHECK (id < 1000000);

COMMIT;

-- تسجيل العملية
INSERT INTO system_logs (action, description, timestamp) 
VALUES ('BOT_ID_MIGRATION', 'تم نقل معرفات البوتات لتبدأ من 1000000 لتجنب التداخل', NOW())
ON CONFLICT DO NOTHING;