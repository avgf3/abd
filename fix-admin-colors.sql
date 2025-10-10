-- إزالة الألوان المخصصة للمشرفين لاستخدام اللون الافتراضي الجديد
UPDATE users 
SET username_color = NULL 
WHERE user_type IN ('admin', 'owner', 'moderator');

-- تحديث أي ألوان محددة للمشرفين
UPDATE users 
SET username_color = '#9B59B6' 
WHERE user_type = 'admin';

UPDATE users 
SET username_color = '#FFD700' 
WHERE user_type = 'owner';

UPDATE users 
SET username_color = '#4A90E2' 
WHERE user_type = 'moderator';
