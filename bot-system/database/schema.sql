-- إنشاء قاعدة البيانات
CREATE DATABASE IF NOT EXISTS bot_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE bot_system;

-- جدول المستخدمين (الأونر)
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('owner', 'admin') DEFAULT 'owner',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL
);

-- جدول البوتات
CREATE TABLE IF NOT EXISTS bots (
    id INT PRIMARY KEY AUTO_INCREMENT,
    bot_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    avatar VARCHAR(255),
    status ENUM('online', 'offline', 'busy') DEFAULT 'offline',
    current_room VARCHAR(100) DEFAULT 'lobby',
    behavior_type VARCHAR(50) DEFAULT 'normal',
    activity_level INT DEFAULT 5, -- من 1 إلى 10
    last_activity TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    settings JSON
);

-- جدول الغرف
CREATE TABLE IF NOT EXISTS rooms (
    id INT PRIMARY KEY AUTO_INCREMENT,
    room_name VARCHAR(100) UNIQUE NOT NULL,
    room_type VARCHAR(50) DEFAULT 'public',
    max_users INT DEFAULT 100,
    current_users INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- جدول سجل نشاط البوتات
CREATE TABLE IF NOT EXISTS bot_activities (
    id INT PRIMARY KEY AUTO_INCREMENT,
    bot_id VARCHAR(50),
    action_type VARCHAR(50),
    room_name VARCHAR(100),
    details TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bot_id) REFERENCES bots(bot_id) ON DELETE CASCADE
);

-- جدول الرسائل المحفوظة للبوتات
CREATE TABLE IF NOT EXISTS bot_messages (
    id INT PRIMARY KEY AUTO_INCREMENT,
    category VARCHAR(50),
    message TEXT,
    language VARCHAR(10) DEFAULT 'ar',
    usage_count INT DEFAULT 0
);

-- جدول إعدادات النظام
CREATE TABLE IF NOT EXISTS system_settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- إدراج المستخدم الافتراضي (الأونر)
INSERT INTO users (username, password, role) VALUES ('admin', '$2a$10$zqEjK2/Y.O5Z8.A6TnW6OuE3jR8YV6C1XU5o7VJX3B3kZu4qFaJGS', 'owner');

-- إدراج الغرف الافتراضية
INSERT INTO rooms (room_name, room_type) VALUES 
('lobby', 'public'),
('general', 'public'),
('gaming', 'public'),
('music', 'public'),
('sports', 'public');

-- إدراج رسائل افتراضية للبوتات
INSERT INTO bot_messages (category, message) VALUES
('greeting', 'مرحبا بالجميع! 👋'),
('greeting', 'السلام عليكم ورحمة الله'),
('greeting', 'أهلاً وسهلاً'),
('chat', 'كيف حالكم اليوم؟'),
('chat', 'الجو جميل اليوم'),
('chat', 'هل شاهد أحد المباراة أمس؟'),
('chat', 'أنا أحب هذه الغرفة'),
('reaction', 'هههههه 😂'),
('reaction', 'صحيح!'),
('reaction', 'ممتاز'),
('farewell', 'إلى اللقاء'),
('farewell', 'سأعود قريباً');

-- إنشاء الفهارس لتحسين الأداء
CREATE INDEX idx_bot_status ON bots(status);
CREATE INDEX idx_bot_room ON bots(current_room);
CREATE INDEX idx_activities_timestamp ON bot_activities(timestamp);