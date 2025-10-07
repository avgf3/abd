-- إضافة عمود user_profile_frame إلى جدول wall_posts لعرض إطارات أصحاب الإطارات في الحوائط
ALTER TABLE wall_posts ADD COLUMN IF NOT EXISTS user_profile_frame TEXT;

-- تحديث المنشورات الموجودة بإطارات المستخدمين الحاليين
UPDATE wall_posts 
SET user_profile_frame = users.profile_frame 
FROM users 
WHERE wall_posts.user_id = users.id 
AND users.profile_frame IS NOT NULL;