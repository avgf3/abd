-- إضافة حقول التدرج والتأثير لأسماء المستخدمين في منشورات الحائط
ALTER TABLE wall_posts 
ADD COLUMN username_gradient TEXT,
ADD COLUMN username_effect TEXT;

-- تحديث المنشورات الموجودة للمشرفين بناءً على بيانات المستخدمين الحالية
UPDATE wall_posts 
SET username_gradient = users.username_gradient,
    username_effect = users.username_effect
FROM users 
WHERE wall_posts.user_id = users.id 
AND users.user_type IN ('admin', 'owner', 'moderator')
AND users.username_gradient IS NOT NULL;

-- تحديث المنشورات الموجودة بألوان المشرفين الافتراضية إذا لم تكن موجودة
UPDATE wall_posts 
SET username_color = CASE 
    WHEN users.user_type = 'owner' THEN '#FFD700'
    WHEN users.user_type = 'admin' THEN '#9B59B6'  
    WHEN users.user_type = 'moderator' THEN '#4A90E2'
    ELSE wall_posts.username_color
END
FROM users 
WHERE wall_posts.user_id = users.id 
AND users.user_type IN ('admin', 'owner', 'moderator')
AND (wall_posts.username_color IS NULL OR wall_posts.username_color = '#4A90E2');