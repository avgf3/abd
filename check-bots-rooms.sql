-- فحص البوتات بدون غرف صحيحة
-- تشغيل هذا الاستعلام لمعرفة البوتات التي تحتاج إصلاح

-- 1. البوتات بدون غرفة (NULL أو فارغة)
SELECT 
  id, 
  username, 
  current_room,
  is_active,
  created_at
FROM bots 
WHERE current_room IS NULL 
   OR current_room = '' 
   OR TRIM(current_room) = '';

-- 2. البوتات بغرف غير موجودة
SELECT 
  b.id, 
  b.username, 
  b.current_room,
  b.is_active,
  b.created_at
FROM bots b
LEFT JOIN rooms r ON b.current_room = r.id
WHERE b.current_room IS NOT NULL 
  AND b.current_room != ''
  AND r.id IS NULL;

-- 3. إحصائيات عامة
SELECT 
  'إجمالي البوتات' as النوع,
  COUNT(*) as العدد
FROM bots
UNION ALL
SELECT 
  'بوتات بدون غرفة' as النوع,
  COUNT(*) as العدد
FROM bots 
WHERE current_room IS NULL 
   OR current_room = '' 
   OR TRIM(current_room) = ''
UNION ALL
SELECT 
  'بوتات بغرف صحيحة' as النوع,
  COUNT(*) as العدد
FROM bots b
INNER JOIN rooms r ON b.current_room = r.id
WHERE b.current_room IS NOT NULL 
  AND b.current_room != '';

-- 4. قائمة جميع البوتات مع حالة الغرف
SELECT 
  b.id,
  b.username,
  b.current_room,
  CASE 
    WHEN b.current_room IS NULL OR b.current_room = '' THEN '❌ بدون غرفة'
    WHEN r.id IS NULL THEN '❌ غرفة غير موجودة'
    ELSE '✅ غرفة صحيحة'
  END as حالة_الغرفة,
  r.name as اسم_الغرفة,
  b.is_active
FROM bots b
LEFT JOIN rooms r ON b.current_room = r.id
ORDER BY b.id;