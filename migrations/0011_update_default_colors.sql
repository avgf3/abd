-- تحديث الألوان الافتراضية من البني إلى الأبيض
-- Update default colors from brown to white

-- تحديث اللون الافتراضي للخلفية للمستخدمين الذين لديهم اللون البني القديم
UPDATE users 
SET profile_background_color = '#ffffff' 
WHERE profile_background_color = '#3c0d0d';

-- تحديث اللون الافتراضي لاسم المستخدم من الأسود إلى رمادي غامق
UPDATE users 
SET username_color = '#333333' 
WHERE username_color = '#000000';

-- تحديث القيود الافتراضية للأعمدة
ALTER TABLE users 
ALTER COLUMN profile_background_color SET DEFAULT '#ffffff';

-- إضافة تعليق توضيحي
COMMENT ON COLUMN users.profile_background_color IS 'لون خلفية الملف الشخصي - الافتراضي أبيض';
COMMENT ON COLUMN users.username_color IS 'لون اسم المستخدم - الافتراضي رمادي غامق';