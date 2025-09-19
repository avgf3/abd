-- إضافة حقل current_room إلى جدول users
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_room TEXT DEFAULT 'general';

-- تحديث المستخدمين الموجودين ليكونوا في الغرفة العامة
UPDATE users SET current_room = 'general' WHERE current_room IS NULL;