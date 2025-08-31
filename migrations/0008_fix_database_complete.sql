-- Migration: إصلاح كامل لقاعدة البيانات
-- Created: 2025-01-21
-- Description: إنشاء الجداول المفقودة وإصلاح المشاكل

-- 1. إنشاء جدول vip_users إذا لم يكن موجوداً
CREATE TABLE IF NOT EXISTS vip_users (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT vip_users_user_id_unique UNIQUE(user_id)
);

-- إنشاء الفهارس
CREATE INDEX IF NOT EXISTS idx_vip_users_user_id ON vip_users(user_id);
CREATE INDEX IF NOT EXISTS idx_vip_users_created_at ON vip_users(created_at DESC);

-- 2. التحقق من وجود الأعمدة المطلوبة في جدول users
DO $$ 
BEGIN
  -- إضافة عمود profile_background_color إذا لم يكن موجوداً
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'profile_background_color') THEN
    ALTER TABLE users ADD COLUMN profile_background_color TEXT DEFAULT '#ffffff';
  END IF;

  -- إضافة عمود username_color إذا لم يكن موجوداً
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'username_color') THEN
    ALTER TABLE users ADD COLUMN username_color TEXT DEFAULT '#FFFFFF';
  END IF;

  -- إضافة عمود profile_effect إذا لم يكن موجوداً
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'profile_effect') THEN
    ALTER TABLE users ADD COLUMN profile_effect TEXT DEFAULT 'none';
  END IF;

  -- إضافة عمود points إذا لم يكن موجوداً
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'points') THEN
    ALTER TABLE users ADD COLUMN points INTEGER DEFAULT 0;
  END IF;

  -- إضافة عمود level إذا لم يكن موجوداً
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'level') THEN
    ALTER TABLE users ADD COLUMN level INTEGER DEFAULT 1;
  END IF;

  -- إضافة عمود total_points إذا لم يكن موجوداً
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'total_points') THEN
    ALTER TABLE users ADD COLUMN total_points INTEGER DEFAULT 0;
  END IF;

  -- إضافة عمود level_progress إذا لم يكن موجوداً
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'level_progress') THEN
    ALTER TABLE users ADD COLUMN level_progress INTEGER DEFAULT 0;
  END IF;

  -- إضافة عمود avatar_version إذا لم يكن موجوداً
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'avatar_version') THEN
    ALTER TABLE users ADD COLUMN avatar_version INTEGER DEFAULT 1;
  END IF;

  -- إضافة عمود avatar_hash إذا لم يكن موجوداً
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'avatar_hash') THEN
    ALTER TABLE users ADD COLUMN avatar_hash TEXT;
  END IF;

  -- إضافة عمود bio إذا لم يكن موجوداً
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'bio') THEN
    ALTER TABLE users ADD COLUMN bio TEXT;
  END IF;

  -- إضافة عمود is_hidden إذا لم يكن موجوداً
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'is_hidden') THEN
    ALTER TABLE users ADD COLUMN is_hidden BOOLEAN DEFAULT FALSE;
  END IF;

  -- إضافة عمود ignored_users إذا لم يكن موجوداً
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'ignored_users') THEN
    ALTER TABLE users ADD COLUMN ignored_users TEXT DEFAULT '[]';
  END IF;
END $$;

-- 3. إنشاء جدول points_history إذا لم يكن موجوداً
CREATE TABLE IF NOT EXISTS points_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  reason TEXT NOT NULL,
  action TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- إنشاء فهرس للبحث السريع
CREATE INDEX IF NOT EXISTS idx_points_history_user_id ON points_history(user_id);
CREATE INDEX IF NOT EXISTS idx_points_history_created_at ON points_history(created_at DESC);

-- 4. إنشاء جدول level_settings إذا لم يكن موجوداً
CREATE TABLE IF NOT EXISTS level_settings (
  id SERIAL PRIMARY KEY,
  level INTEGER NOT NULL UNIQUE,
  required_points INTEGER NOT NULL,
  title TEXT NOT NULL,
  color TEXT DEFAULT '#FFFFFF',
  benefits JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 5. إنشاء جدول site_settings إذا لم يكن موجوداً
CREATE TABLE IF NOT EXISTS site_settings (
  id SERIAL PRIMARY KEY,
  site_theme TEXT DEFAULT 'default',
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 6. التحقق من وجود الأعمدة في جدول messages
DO $$ 
BEGIN
  -- إضافة عمود attachments إذا لم يكن موجوداً
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'messages' AND column_name = 'attachments') THEN
    ALTER TABLE messages ADD COLUMN attachments JSONB DEFAULT '[]'::jsonb;
  END IF;

  -- إضافة عمود edited_at إذا لم يكن موجوداً
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'messages' AND column_name = 'edited_at') THEN
    ALTER TABLE messages ADD COLUMN edited_at TIMESTAMP;
  END IF;

  -- إضافة عمود deleted_at إذا لم يكن موجوداً
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'messages' AND column_name = 'deleted_at') THEN
    ALTER TABLE messages ADD COLUMN deleted_at TIMESTAMP;
  END IF;
END $$;

-- 7. إنشاء جدول message_reactions إذا لم يكن موجوداً
CREATE TABLE IF NOT EXISTS message_reactions (
  id SERIAL PRIMARY KEY,
  message_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  timestamp TIMESTAMP DEFAULT NOW()
);

-- إنشاء فهرس فريد لضمان تفاعل واحد لكل مستخدم لكل رسالة
CREATE UNIQUE INDEX IF NOT EXISTS idx_message_reactions_unique ON message_reactions(message_id, user_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_message ON message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_user ON message_reactions(user_id);

-- 8. إنشاء جدول wall_posts إذا لم يكن موجوداً
CREATE TABLE IF NOT EXISTS wall_posts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  user_role TEXT NOT NULL,
  content TEXT,
  image_url TEXT,
  type TEXT NOT NULL DEFAULT 'public',
  timestamp TIMESTAMP DEFAULT NOW(),
  user_profile_image TEXT,
  username_color TEXT DEFAULT '#FFFFFF',
  total_likes INTEGER DEFAULT 0,
  total_dislikes INTEGER DEFAULT 0,
  total_hearts INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- إنشاء فهرس للبحث السريع
CREATE INDEX IF NOT EXISTS idx_wall_posts_user_id ON wall_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_wall_posts_created_at ON wall_posts(created_at DESC);

-- 9. إنشاء جدول wall_reactions إذا لم يكن موجوداً
CREATE TABLE IF NOT EXISTS wall_reactions (
  id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES wall_posts(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  type TEXT NOT NULL,
  timestamp TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- إنشاء فهرس فريد لضمان تفاعل واحد لكل مستخدم لكل منشور
CREATE UNIQUE INDEX IF NOT EXISTS idx_wall_reactions_unique ON wall_reactions(post_id, user_id);
CREATE INDEX IF NOT EXISTS idx_wall_reactions_post ON wall_reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_wall_reactions_user ON wall_reactions(user_id);

-- 10. إنشاء جدول room_members إذا لم يكن موجوداً
CREATE TABLE IF NOT EXISTS room_members (
  room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  muted_until TIMESTAMP,
  banned_until TIMESTAMP,
  joined_at TIMESTAMP DEFAULT NOW() NOT NULL,
  PRIMARY KEY (room_id, user_id)
);

-- إنشاء فهارس للبحث السريع
CREATE INDEX IF NOT EXISTS idx_room_members_room ON room_members(room_id);
CREATE INDEX IF NOT EXISTS idx_room_members_user ON room_members(user_id);

-- 11. إضافة بعض المستخدمين VIP الافتراضيين (owners و admins)
INSERT INTO vip_users (user_id, created_by)
SELECT id, 1 FROM users 
WHERE user_type IN ('owner', 'admin')
ON CONFLICT (user_id) DO NOTHING;

-- 12. إضافة إعدادات المستويات الافتراضية إذا لم تكن موجودة
INSERT INTO level_settings (level, required_points, title, color) VALUES
(1, 0, 'مبتدئ', '#808080'),
(2, 100, 'نشط', '#87CEEB'),
(3, 500, 'متقدم', '#32CD32'),
(4, 1000, 'محترف', '#FFD700'),
(5, 2500, 'خبير', '#FF8C00'),
(6, 5000, 'متميز', '#FF1493'),
(7, 10000, 'أسطورة', '#9400D3'),
(8, 20000, 'نخبة', '#FF0000'),
(9, 35000, 'سيد', '#000000'),
(10, 50000, 'إمبراطور', '#FFD700')
ON CONFLICT (level) DO NOTHING;

-- 13. تنظيف البيانات المكررة أو التالفة
-- حذف الرسائل اليتيمة (بدون مرسل)
DELETE FROM messages WHERE sender_id IS NOT NULL AND sender_id NOT IN (SELECT id FROM users);

-- حذف التفاعلات اليتيمة
DELETE FROM message_reactions WHERE message_id NOT IN (SELECT id FROM messages);
DELETE FROM message_reactions WHERE user_id NOT IN (SELECT id FROM users);

-- حذف منشورات الحائط اليتيمة
DELETE FROM wall_posts WHERE user_id NOT IN (SELECT id FROM users);

-- حذف تفاعلات الحائط اليتيمة
DELETE FROM wall_reactions WHERE post_id NOT IN (SELECT id FROM wall_posts);
DELETE FROM wall_reactions WHERE user_id NOT IN (SELECT id FROM users);

-- 14. تحديث الإحصائيات
-- تحديث عدد التفاعلات في منشورات الحائط
UPDATE wall_posts wp SET
  total_likes = (SELECT COUNT(*) FROM wall_reactions WHERE post_id = wp.id AND type = 'like'),
  total_dislikes = (SELECT COUNT(*) FROM wall_reactions WHERE post_id = wp.id AND type = 'dislike'),
  total_hearts = (SELECT COUNT(*) FROM wall_reactions WHERE post_id = wp.id AND type = 'heart');

-- 15. إنشاء دالة لتحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- إضافة trigger لتحديث updated_at في wall_posts
DROP TRIGGER IF EXISTS update_wall_posts_updated_at ON wall_posts;
CREATE TRIGGER update_wall_posts_updated_at 
  BEFORE UPDATE ON wall_posts 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- إضافة trigger لتحديث updated_at في site_settings
DROP TRIGGER IF EXISTS update_site_settings_updated_at ON site_settings;
CREATE TRIGGER update_site_settings_updated_at 
  BEFORE UPDATE ON site_settings 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- 16. تحسين الأداء بإضافة فهارس إضافية
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_user_type ON users(user_type);
CREATE INDEX IF NOT EXISTS idx_users_is_online ON users(is_online);
CREATE INDEX IF NOT EXISTS idx_messages_room_timestamp ON messages(room_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_messages_private ON messages(is_private, sender_id, receiver_id);

-- النهاية: رسالة نجاح
DO $$ 
BEGIN
  RAISE NOTICE '✅ تم إصلاح قاعدة البيانات بنجاح!';
END $$;