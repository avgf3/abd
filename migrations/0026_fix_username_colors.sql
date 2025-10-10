-- إصلاح ألوان أسماء المستخدمين وإزالة القيم الفارغة أو غير الصالحة
-- Migration: 0026_fix_username_colors.sql

-- تحديث الألوان غير الصالحة إلى اللون الأزرق الافتراضي
UPDATE users
SET username_color = '#4A90E2'
WHERE username_color IS NULL
   OR username_color = ''
   OR username_color = 'null'
   OR username_color = 'undefined'
   OR LOWER(username_color) IN ('#ffffff', '#fff', 'white');

-- تنظيف التدرجات غير الصالحة
UPDATE users
SET username_gradient = NULL
WHERE username_gradient IS NOT NULL
   AND (username_gradient = ''
        OR username_gradient = 'null'
        OR username_gradient = 'undefined'
        OR username_gradient NOT LIKE 'linear-gradient(%');

-- تنظيف التأثيرات غير الصالحة
UPDATE users
SET username_effect = NULL
WHERE username_effect IS NOT NULL
   AND (username_effect = ''
        OR username_effect = 'null'
        OR username_effect = 'undefined'
        OR username_effect = 'none');

-- التأكد من أن البوتات لديها ألوان صحيحة
UPDATE bots
SET username_color = '#00FF00'
WHERE username_color IS NULL
   OR username_color = ''
   OR username_color = 'null'
   OR username_color = 'undefined';

-- تحديث ألوان منشورات الحائط
UPDATE wall_posts
SET username_color = '#4A90E2'
WHERE username_color IS NULL
   OR username_color = ''
   OR username_color = 'null'
   OR username_color = 'undefined'
   OR LOWER(username_color) IN ('#ffffff', '#fff', 'white');

-- إضافة تعليقات للحقول
COMMENT ON COLUMN users.username_color IS 'لون اسم المستخدم (HEX فقط)';
COMMENT ON COLUMN users.username_gradient IS 'تدرج لوني لاسم المستخدم (للمشرفين فقط) - يجب أن يبدأ بـ linear-gradient(';
COMMENT ON COLUMN users.username_effect IS 'تأثير حركي لاسم المستخدم (للمشرفين فقط) - مثل effect-glow, effect-pulse إلخ';