-- إضافة حقل currentRoom لجدول users
ALTER TABLE users ADD COLUMN current_room TEXT DEFAULT 'general';

-- تحديث المستخدمين الموجودين ليكونوا في الغرفة العامة
UPDATE users SET current_room = 'general' WHERE current_room IS NULL;

-- إضافة فهرس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_users_current_room ON users(current_room);