-- إنشاء جدول الأعضاء (البوتات)
CREATE TABLE IF NOT EXISTS members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    status TEXT DEFAULT 'offline', -- online, offline, busy
    current_room TEXT DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- إنشاء جدول الغرف
CREATE TABLE IF NOT EXISTS rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    max_members INTEGER DEFAULT 50,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- إنشاء جدول سجل الحركة
CREATE TABLE IF NOT EXISTS movement_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER NOT NULL,
    from_room TEXT,
    to_room TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (member_id) REFERENCES members(id)
);

-- إضافة بعض الغرف الافتراضية
INSERT INTO rooms (name, description) VALUES 
    ('lobby', 'غرفة الاستقبال الرئيسية'),
    ('general', 'غرفة المحادثات العامة'),
    ('games', 'غرفة الألعاب'),
    ('music', 'غرفة الموسيقى'),
    ('tech', 'غرفة التقنية'),
    ('sports', 'غرفة الرياضة');