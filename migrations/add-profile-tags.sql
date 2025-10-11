-- إضافة حقل التاجات للمستخدمين
ALTER TABLE users ADD COLUMN profile_tags JSONB DEFAULT '[]'::jsonb;

-- إنشاء فهرس لتحسين الأداء عند البحث في التاجات
CREATE INDEX IF NOT EXISTS idx_users_profile_tags ON users USING GIN (profile_tags);

-- تعليق توضيحي
COMMENT ON COLUMN users.profile_tags IS 'تاجات البروفايل - JSON array للتاجات المتعددة مثل VIP, Premium, إلخ';