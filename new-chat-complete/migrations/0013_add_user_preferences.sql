-- إضافة أعمدة تفضيلات المستخدم العامة
ALTER TABLE users ADD COLUMN IF NOT EXISTS show_points_to_others BOOLEAN DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS show_system_messages BOOLEAN DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS global_sound_enabled BOOLEAN DEFAULT TRUE;

