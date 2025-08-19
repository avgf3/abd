-- حذف حقل userProfileImage من جدول wall_posts
-- هذا الحقل غير ضروري لأننا يمكن جلب الصورة من جدول users

ALTER TABLE wall_posts DROP COLUMN IF EXISTS user_profile_image;