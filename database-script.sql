-- سكريبت إنشاء جداول قاعدة البيانات الشامل
-- Database Tables Creation Script

-- ==============================================
-- جدول المستخدمين (Users Table)
-- ==============================================
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password TEXT,
    user_type TEXT NOT NULL DEFAULT 'guest',
    role TEXT NOT NULL DEFAULT 'guest',
    profile_image TEXT,
    profile_banner TEXT,
    profile_background_color TEXT DEFAULT '#3c0d0d',
    status TEXT,
    gender TEXT,
    age INTEGER,
    country TEXT,
    relation TEXT,
    bio TEXT,
    is_online BOOLEAN DEFAULT false,
    is_hidden BOOLEAN DEFAULT false,
    last_seen TIMESTAMP,
    join_date TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    is_muted BOOLEAN DEFAULT false,
    mute_expiry TIMESTAMP,
    is_banned BOOLEAN DEFAULT false,
    ban_expiry TIMESTAMP,
    is_blocked BOOLEAN DEFAULT false,
    ip_address VARCHAR(45),
    device_id VARCHAR(100),
    ignored_users TEXT[] DEFAULT '{}',
    username_color TEXT DEFAULT '#FFFFFF',
    user_theme TEXT DEFAULT 'default'
);

-- ==============================================
-- جدول الرسائل (Messages Table)
-- ==============================================
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    message_type TEXT NOT NULL DEFAULT 'text',
    is_private BOOLEAN DEFAULT false,
    timestamp TIMESTAMP DEFAULT NOW()
);

-- ==============================================
-- جدول الأصدقاء (Friends Table)
-- ==============================================
CREATE TABLE IF NOT EXISTS friends (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    friend_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, friend_id)
);

-- ==============================================
-- جدول الإشعارات (Notifications Table)
-- ==============================================
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    data JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ==============================================
-- جدول الأجهزة المحظورة (Blocked Devices Table)
-- ==============================================
CREATE TABLE IF NOT EXISTS blocked_devices (
    id SERIAL PRIMARY KEY,
    ip_address TEXT NOT NULL,
    device_id TEXT NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    blocked_at TIMESTAMP NOT NULL DEFAULT NOW(),
    blocked_by INTEGER NOT NULL REFERENCES users(id),
    UNIQUE(ip_address, device_id)
);

-- ==============================================
-- إنشاء فهارس لتحسين الأداء (Indexes for Performance)
-- ==============================================

-- فهارس جدول المستخدمين
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_user_type ON users(user_type);
CREATE INDEX IF NOT EXISTS idx_users_is_online ON users(is_online);
CREATE INDEX IF NOT EXISTS idx_users_ip_device ON users(ip_address, device_id);

-- فهارس جدول الرسائل
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
CREATE INDEX IF NOT EXISTS idx_messages_private ON messages(is_private);

-- فهارس جدول الأصدقاء
CREATE INDEX IF NOT EXISTS idx_friends_user_id ON friends(user_id);
CREATE INDEX IF NOT EXISTS idx_friends_friend_id ON friends(friend_id);
CREATE INDEX IF NOT EXISTS idx_friends_status ON friends(status);

-- فهارس جدول الإشعارات
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- فهارس جدول الأجهزة المحظورة
CREATE INDEX IF NOT EXISTS idx_blocked_devices_ip ON blocked_devices(ip_address);
CREATE INDEX IF NOT EXISTS idx_blocked_devices_device_id ON blocked_devices(device_id);
CREATE INDEX IF NOT EXISTS idx_blocked_devices_user_id ON blocked_devices(user_id);

-- ==============================================
-- إدراج بيانات افتراضية (Default Data)
-- ==============================================

-- إنشاء مستخدم أدمن افتراضي
INSERT INTO users (username, password, user_type, role, profile_image, join_date, created_at)
SELECT 'admin', 'admin123', 'owner', 'owner', '/default_avatar.svg', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin');

-- إنشاء مستخدم تجريبي
INSERT INTO users (username, password, user_type, role, profile_image, join_date, created_at)
SELECT 'testuser', 'test123', 'member', 'member', '/default_avatar.svg', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'testuser');

-- ==============================================
-- إنشاء views مفيدة (Useful Views)
-- ==============================================

-- عرض للمستخدمين المتصلين
CREATE OR REPLACE VIEW online_users AS
SELECT id, username, user_type, profile_image, status, last_seen
FROM users 
WHERE is_online = true AND is_hidden = false AND is_banned = false;

-- عرض لإحصائيات المستخدمين
CREATE OR REPLACE VIEW user_stats AS
SELECT 
    COUNT(*) as total_users,
    COUNT(CASE WHEN is_online = true THEN 1 END) as online_users,
    COUNT(CASE WHEN user_type = 'member' THEN 1 END) as members,
    COUNT(CASE WHEN user_type = 'guest' THEN 1 END) as guests,
    COUNT(CASE WHEN is_banned = true THEN 1 END) as banned_users
FROM users;

-- عرض للرسائل الحديثة
CREATE OR REPLACE VIEW recent_messages AS
SELECT 
    m.id,
    m.content,
    m.message_type,
    m.timestamp,
    s.username as sender_username,
    r.username as receiver_username
FROM messages m
JOIN users s ON m.sender_id = s.id
LEFT JOIN users r ON m.receiver_id = r.id
ORDER BY m.timestamp DESC;

-- ==============================================
-- إنشاء triggers للصيانة التلقائية (Triggers for Automatic Maintenance)
-- ==============================================

-- تحديث last_seen عند تسجيل الدخول
CREATE OR REPLACE FUNCTION update_last_seen()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_online = true AND OLD.is_online = false THEN
        NEW.last_seen = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_last_seen
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_last_seen();

-- ==============================================
-- تشغيل تحليل الجداول لتحسين الأداء (Analyze Tables)
-- ==============================================
ANALYZE users;
ANALYZE messages;
ANALYZE friends;
ANALYZE notifications;
ANALYZE blocked_devices;

-- ==============================================
-- نهاية السكريبت
-- ==============================================
-- Script completed successfully
-- جميع الجداول والفهارس والبيانات الافتراضية تم إنشاؤها بنجاح