-- سكربت إنشاء جميع الجداول الأساسية كما هو معرف في السكيمة البرمجية

-- جدول المستخدمين
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password TEXT,
    user_type TEXT NOT NULL DEFAULT 'guest',
    profile_image TEXT,
    profile_banner TEXT,
    status TEXT,
    gender TEXT,
    age INTEGER,
    country TEXT,
    relation TEXT,
    bio TEXT,
    is_online BOOLEAN DEFAULT FALSE,
    is_hidden BOOLEAN DEFAULT FALSE,
    last_seen TIMESTAMP,
    join_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_muted BOOLEAN DEFAULT FALSE,
    mute_expiry TIMESTAMP,
    is_banned BOOLEAN DEFAULT FALSE,
    ban_expiry TIMESTAMP,
    is_blocked BOOLEAN DEFAULT FALSE,
    ip_address VARCHAR(45),
    device_id VARCHAR(100),
    ignored_users TEXT[],
    username_color TEXT DEFAULT '#FFFFFF',
    user_theme TEXT DEFAULT 'default',
    profile_background_color TEXT DEFAULT '#3c0d0d'
);

-- جدول الرسائل
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    sender_id INTEGER REFERENCES users(id),
    receiver_id INTEGER REFERENCES users(id),
    content TEXT NOT NULL,
    message_type TEXT NOT NULL DEFAULT 'text',
    is_private BOOLEAN DEFAULT FALSE,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- جدول الأصدقاء
CREATE TABLE IF NOT EXISTS friends (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    friend_id INTEGER REFERENCES users(id),
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- جدول الإشعارات
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);