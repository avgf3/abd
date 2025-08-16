-- حذف عمود user_theme الغير مستخدم
ALTER TABLE "users" DROP COLUMN IF EXISTS "user_theme";