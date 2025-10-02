-- إضافة حقلي الجنس والمستوى إلى جدول منشورات الحائط
ALTER TABLE wall_posts ADD COLUMN user_gender TEXT;
ALTER TABLE wall_posts ADD COLUMN user_level INTEGER DEFAULT 1;

-- تحديث المنشورات الموجودة لتحصل على بيانات الجنس والمستوى من جدول المستخدمين
UPDATE wall_posts 
SET user_gender = users.gender, user_level = users.level
FROM users 
WHERE wall_posts.user_id = users.id;