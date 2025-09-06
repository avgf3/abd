-- إنشاء جدول البوتات
CREATE TABLE IF NOT EXISTS bots (
    id SERIAL PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    user_type TEXT NOT NULL DEFAULT 'bot',
    role TEXT NOT NULL DEFAULT 'bot',
    profile_image TEXT,
    profile_banner TEXT,
    profile_background_color TEXT DEFAULT '#2a2a2a',
    status TEXT,
    gender TEXT DEFAULT 'غير محدد',
    country TEXT DEFAULT 'غير محدد',
    relation TEXT DEFAULT 'غير محدد',
    bio TEXT DEFAULT 'أنا بوت آلي',
    is_online BOOLEAN DEFAULT true,
    current_room TEXT DEFAULT 'general',
    username_color TEXT DEFAULT '#00FF00',
    profile_effect TEXT DEFAULT 'none',
    points INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    total_points INTEGER DEFAULT 0,
    level_progress INTEGER DEFAULT 0,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    bot_type TEXT DEFAULT 'system',
    settings JSONB DEFAULT '{}'::jsonb
);

-- إنشاء فهرس على اسم المستخدم
CREATE INDEX idx_bots_username ON bots(username);

-- إنشاء فهرس على الغرفة الحالية
CREATE INDEX idx_bots_current_room ON bots(current_room);

-- إنشاء فهرس على حالة النشاط
CREATE INDEX idx_bots_is_active ON bots(is_active);

-- إنشاء فهرس على نوع البوت
CREATE INDEX idx_bots_bot_type ON bots(bot_type);