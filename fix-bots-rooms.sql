-- إصلاح بيانات البوتات - ضمان وجود غرفة صحيحة
-- تشغيل هذا الملف لإصلاح البيانات الموجودة

-- إصلاح البوتات التي لا تحتوي على غرفة
UPDATE bots 
SET current_room = 'general' 
WHERE current_room IS NULL OR current_room = '';

-- إصلاح البوتات التي تحتوي على غرف غير موجودة
UPDATE bots 
SET current_room = 'general' 
WHERE current_room NOT IN (
  SELECT id FROM rooms WHERE is_active = true
);

-- إضافة فهرس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_bots_current_room_valid 
ON bots(current_room) 
WHERE current_room IS NOT NULL;

-- عرض النتائج
SELECT 
  id, 
  username, 
  current_room,
  is_active,
  created_at
FROM bots 
ORDER BY id;