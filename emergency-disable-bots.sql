-- إصلاح طارئ: إيقاف جميع البوتات مؤقتاً لمنع تداخل الهويات
-- هذا إجراء أمني فوري لحماية المستخدمين

-- إيقاف جميع البوتات
UPDATE bots SET 
  is_active = false,
  is_online = false,
  last_activity = NOW()
WHERE is_active = true;

-- إضافة تعليق للمراجعة
COMMENT ON TABLE bots IS 'تم إيقاف جميع البوتات مؤقتاً بسبب مشكلة أمنية - يجب فصل مساحات المعرفات قبل إعادة التفعيل';

-- تسجيل العملية
INSERT INTO system_logs (action, description, timestamp) 
VALUES ('EMERGENCY_BOT_DISABLE', 'تم إيقاف جميع البوتات لحل مشكلة تداخل المعرفات', NOW())
ON CONFLICT DO NOTHING;