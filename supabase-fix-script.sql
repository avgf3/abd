-- سكريبت إصلاح قاعدة بيانات Supabase لحل مشاكل التسجيل والدخول
-- Supabase Database Fix Script for Login/Registration Issues

-- ==============================================
-- إضافة الأعمدة المفقودة لجدول المستخدمين
-- Adding Missing Columns to Users Table
-- ==============================================

-- إضافة عمود created_at إذا لم يكن موجود
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- إضافة عمود role إذا لم يكن موجود (مع تحديث القيم الموجودة)
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'guest';

-- تحديث عمود role للمستخدمين الموجودين
UPDATE users SET role = COALESCE(user_type, 'guest') WHERE role IS NULL OR role = '';

-- إضافة عمود blocked_devices إذا لم يكن موجود
CREATE TABLE IF NOT EXISTS blocked_devices (
    id SERIAL PRIMARY KEY,
    ip_address TEXT NOT NULL,
    device_id TEXT NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id),
    reason TEXT NOT NULL,
    blocked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    blocked_by INTEGER NOT NULL REFERENCES users(id),
    UNIQUE(ip_address, device_id)
);

-- ==============================================
-- إصلاح القيود والفهارس
-- Fixing Constraints and Indexes
-- ==============================================

-- إضافة فهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_user_type ON users(user_type);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_online ON users(is_online);
CREATE INDEX IF NOT EXISTS idx_users_ip_device ON users(ip_address, device_id);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- فهارس جدول الرسائل
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);

-- فهارس جدول الأصدقاء
CREATE INDEX IF NOT EXISTS idx_friends_user_id ON friends(user_id);
CREATE INDEX IF NOT EXISTS idx_friends_friend_id ON friends(friend_id);
CREATE INDEX IF NOT EXISTS idx_friends_status ON friends(status);

-- فهارس جدول الإشعارات
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- ==============================================
-- إضافة قيود فريدة مهمة
-- Adding Important Unique Constraints
-- ==============================================

-- إضافة قيد فريد لمنع تكرار الصداقات
ALTER TABLE friends ADD CONSTRAINT IF NOT EXISTS unique_friendship 
UNIQUE(user_id, friend_id);

-- ==============================================
-- إنشاء المستخدمين الافتراضيين
-- Creating Default Users
-- ==============================================

-- إنشاء مستخدم admin إذا لم يكن موجود
INSERT INTO users (
    username, 
    password, 
    user_type, 
    role, 
    profile_image, 
    join_date, 
    created_at
)
SELECT 
    'admin', 
    'admin123', 
    'owner', 
    'owner', 
    '/default_avatar.svg', 
    CURRENT_TIMESTAMP, 
    CURRENT_TIMESTAMP
WHERE NOT EXISTS (
    SELECT 1 FROM users WHERE username = 'admin'
);

-- إنشاء مستخدم تجريبي للاختبار
INSERT INTO users (
    username, 
    password, 
    user_type, 
    role, 
    profile_image, 
    join_date, 
    created_at
)
SELECT 
    'testuser', 
    'test123', 
    'member', 
    'member', 
    '/default_avatar.svg', 
    CURRENT_TIMESTAMP, 
    CURRENT_TIMESTAMP
WHERE NOT EXISTS (
    SELECT 1 FROM users WHERE username = 'testuser'
);

-- ==============================================
-- إنشاء Functions مفيدة لحل مشاكل المصادقة
-- Creating Useful Functions for Authentication Issues
-- ==============================================

-- Function للتحقق من صحة بيانات المستخدم
CREATE OR REPLACE FUNCTION validate_user_data()
RETURNS TRIGGER AS $$
BEGIN
    -- التأكد من وجود username
    IF NEW.username IS NULL OR TRIM(NEW.username) = '' THEN
        RAISE EXCEPTION 'Username cannot be empty';
    END IF;
    
    -- التأكد من صحة user_type
    IF NEW.user_type NOT IN ('guest', 'member', 'admin', 'owner') THEN
        NEW.user_type = 'guest';
    END IF;
    
    -- التأكد من صحة role
    IF NEW.role IS NULL OR NEW.role = '' THEN
        NEW.role = NEW.user_type;
    END IF;
    
    -- تحديث created_at إذا لم يكن موجود
    IF NEW.created_at IS NULL THEN
        NEW.created_at = CURRENT_TIMESTAMP;
    END IF;
    
    -- تحديث join_date إذا لم يكن موجود
    IF NEW.join_date IS NULL THEN
        NEW.join_date = CURRENT_TIMESTAMP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء Trigger للتحقق من البيانات
DROP TRIGGER IF EXISTS trigger_validate_user_data ON users;
CREATE TRIGGER trigger_validate_user_data
    BEFORE INSERT OR UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION validate_user_data();

-- ==============================================
-- Function لتحديث آخر نشاط للمستخدم
-- Function to Update User Last Activity
-- ==============================================

CREATE OR REPLACE FUNCTION update_user_activity()
RETURNS TRIGGER AS $$
BEGIN
    -- تحديث last_seen عند تغيير is_online إلى true
    IF NEW.is_online = TRUE AND (OLD.is_online = FALSE OR OLD.is_online IS NULL) THEN
        NEW.last_seen = CURRENT_TIMESTAMP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء Trigger لتحديث النشاط
DROP TRIGGER IF EXISTS trigger_update_user_activity ON users;
CREATE TRIGGER trigger_update_user_activity
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_user_activity();

-- ==============================================
-- إنشاء Views مفيدة للمصادقة
-- Creating Useful Views for Authentication
-- ==============================================

-- View للمستخدمين النشطين
CREATE OR REPLACE VIEW active_users AS
SELECT 
    id,
    username,
    user_type,
    role,
    profile_image,
    is_online,
    last_seen,
    created_at
FROM users 
WHERE 
    is_banned = FALSE 
    AND is_blocked = FALSE 
    AND username IS NOT NULL 
    AND TRIM(username) != '';

-- View لإحصائيات المستخدمين
CREATE OR REPLACE VIEW user_statistics AS
SELECT 
    COUNT(*) as total_users,
    COUNT(CASE WHEN is_online = TRUE THEN 1 END) as online_users,
    COUNT(CASE WHEN user_type = 'member' THEN 1 END) as members,
    COUNT(CASE WHEN user_type = 'guest' THEN 1 END) as guests,
    COUNT(CASE WHEN user_type = 'admin' THEN 1 END) as admins,
    COUNT(CASE WHEN is_banned = TRUE THEN 1 END) as banned_users,
    COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END) as today_registrations
FROM users;

-- ==============================================
-- تنظيف البيانات المعطوبة
-- Cleaning Corrupted Data
-- ==============================================

-- تنظيف المستخدمين بدون username
UPDATE users 
SET username = 'user_' || id::text 
WHERE username IS NULL OR TRIM(username) = '';

-- تنظيف user_type غير صحيح
UPDATE users 
SET user_type = 'guest' 
WHERE user_type NOT IN ('guest', 'member', 'admin', 'owner');

-- تنظيف role غير صحيح
UPDATE users 
SET role = user_type 
WHERE role IS NULL OR role = '' OR role NOT IN ('guest', 'member', 'admin', 'owner');

-- تحديث timestamps المفقودة
UPDATE users 
SET 
    created_at = COALESCE(created_at, join_date, CURRENT_TIMESTAMP),
    join_date = COALESCE(join_date, created_at, CURRENT_TIMESTAMP)
WHERE created_at IS NULL OR join_date IS NULL;

-- ==============================================
-- إنشاء Policy للأمان (إذا كنت تستخدم RLS)
-- Creating Security Policies (if using RLS)
-- ==============================================

-- تفعيل Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policy للمستخدمين - يمكن للجميع القراءة، المستخدم يمكنه تعديل بياناته فقط
CREATE POLICY IF NOT EXISTS "Users can view all profiles" ON users
    FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid()::text = id::text);

-- Policy للرسائل - المستخدم يرى رسائله فقط
CREATE POLICY IF NOT EXISTS "Users can view own messages" ON messages
    FOR SELECT USING (
        auth.uid()::text = sender_id::text OR 
        auth.uid()::text = receiver_id::text
    );

CREATE POLICY IF NOT EXISTS "Users can insert messages" ON messages
    FOR INSERT WITH CHECK (auth.uid()::text = sender_id::text);

-- ==============================================
-- تحليل الجداول لتحسين الأداء
-- Analyzing Tables for Performance
-- ==============================================

ANALYZE users;
ANALYZE messages;
ANALYZE friends;
ANALYZE notifications;
ANALYZE blocked_devices;

-- ==============================================
-- رسالة إتمام
-- Completion Message
-- ==============================================

DO $$
BEGIN
    RAISE NOTICE 'تم إصلاح قاعدة البيانات بنجاح! Database fixed successfully!';
    RAISE NOTICE 'يمكنك الآن اختبار التسجيل والدخول. You can now test registration and login.';
END $$;