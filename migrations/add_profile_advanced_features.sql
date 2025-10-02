-- Migration: إضافة ميزات الملف الشخصي المتقدمة
-- Date: 2025-10-02
-- Description: إضافة نظام الإطارات، الزوار، والهدايا

-- ====================================
-- 1. إضافة حقول جديدة لجدول users
-- ====================================

-- حقل نوع الإطار
ALTER TABLE users ADD COLUMN IF NOT EXISTS frame_type VARCHAR(50) DEFAULT 'bronze';

-- عداد الزوار
ALTER TABLE users ADD COLUMN IF NOT EXISTS visitor_count INTEGER DEFAULT 0;

-- شارات الإنجازات (JSON array)
ALTER TABLE users ADD COLUMN IF NOT EXISTS achievements JSONB DEFAULT '[]';

-- الأوسمة (JSON array)
ALTER TABLE users ADD COLUMN IF NOT EXISTS badges JSONB DEFAULT '[]';

-- تعليق على الملف الشخصي
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_bio TEXT;

-- آخر تحديث للملف الشخصي
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- ====================================
-- 2. جدول زوار الملف الشخصي
-- ====================================

CREATE TABLE IF NOT EXISTS profile_visitors (
  id SERIAL PRIMARY KEY,
  profile_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  visitor_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  visited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- منع التكرار
  UNIQUE(profile_user_id, visitor_user_id)
);

-- Indexes للأداء
CREATE INDEX IF NOT EXISTS idx_profile_visitors_profile ON profile_visitors(profile_user_id, visited_at DESC);
CREATE INDEX IF NOT EXISTS idx_profile_visitors_visitor ON profile_visitors(visitor_user_id);

-- ====================================
-- 3. جدول الإطارات المتاحة
-- ====================================

CREATE TABLE IF NOT EXISTS profile_frames (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL UNIQUE, -- bronze, silver, gold, diamond, legendary, special_*
  min_level INTEGER NOT NULL DEFAULT 0,
  price_points INTEGER DEFAULT 0,
  is_special BOOLEAN DEFAULT FALSE,
  animation_css TEXT,
  description TEXT,
  emoji VARCHAR(10),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ====================================
-- 4. جدول إطارات المستخدمين
-- ====================================

CREATE TABLE IF NOT EXISTS user_frames (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  frame_id INTEGER NOT NULL REFERENCES profile_frames(id) ON DELETE CASCADE,
  equipped BOOLEAN DEFAULT FALSE,
  purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- مستخدم واحد لا يمكنه امتلاك نفس الإطار مرتين
  UNIQUE(user_id, frame_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_frames_user ON user_frames(user_id);
CREATE INDEX IF NOT EXISTS idx_user_frames_equipped ON user_frames(user_id, equipped) WHERE equipped = TRUE;

-- ====================================
-- 5. جدول الهدايا المتاحة
-- ====================================

CREATE TABLE IF NOT EXISTS gifts (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  emoji VARCHAR(10) NOT NULL,
  price_points INTEGER NOT NULL,
  category VARCHAR(50) DEFAULT 'general', -- general, romantic, funny, luxury
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ====================================
-- 6. جدول الهدايا المرسلة
-- ====================================

CREATE TABLE IF NOT EXISTS user_gifts (
  id SERIAL PRIMARY KEY,
  gift_id INTEGER NOT NULL REFERENCES gifts(id) ON DELETE CASCADE,
  sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT,
  is_anonymous BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_gifts_receiver ON user_gifts(receiver_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_gifts_sender ON user_gifts(sender_id);

-- ====================================
-- 7. جدول التعليقات المتعددة المستويات
-- ====================================

CREATE TABLE IF NOT EXISTS wall_comments (
  id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES wall_posts(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_comment_id INTEGER REFERENCES wall_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_wall_comments_post ON wall_comments(post_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wall_comments_parent ON wall_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_wall_comments_user ON wall_comments(user_id);

-- ====================================
-- 8. جدول إعجابات التعليقات
-- ====================================

CREATE TABLE IF NOT EXISTS comment_likes (
  id SERIAL PRIMARY KEY,
  comment_id INTEGER NOT NULL REFERENCES wall_comments(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(comment_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_comment_likes_comment ON comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_user ON comment_likes(user_id);

-- ====================================
-- 9. جدول الإشعارات المتقدم
-- ====================================

CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- message, like, comment, friend, gift, mention, system
  sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  data JSONB DEFAULT '{}', -- بيانات إضافية (post_id, comment_id, etc)
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(user_id, type);

-- ====================================
-- 10. إدخال البيانات الافتراضية
-- ====================================

-- الإطارات الافتراضية
INSERT INTO profile_frames (name, type, min_level, price_points, emoji, description) VALUES
  ('إطار برونزي', 'bronze', 0, 0, '🥉', 'الإطار الأساسي لجميع المستخدمين'),
  ('إطار فضي', 'silver', 15, 0, '🥈', 'للأعضاء الذين وصلوا المستوى 15'),
  ('إطار ذهبي', 'gold', 30, 0, '🥇', 'للأعضاء الذين وصلوا المستوى 30'),
  ('إطار ماسي', 'diamond', 50, 0, '💎', 'للأعضاء الذين وصلوا المستوى 50'),
  ('إطار أسطوري', 'legendary', 100, 0, '👑', 'للأعضاء الأسطوريين - المستوى 100+'),
  ('إطار النار', 'special_fire', 20, 5000, '🔥', 'إطار مميز بتأثيرات نارية'),
  ('إطار القلب', 'special_heart', 20, 5000, '❤️', 'إطار رومانسي بتأثيرات قلوب'),
  ('إطار النجمة', 'special_star', 25, 7500, '⭐', 'إطار نجمي براق'),
  ('إطار الجليد', 'special_ice', 25, 7500, '❄️', 'إطار جليدي متلألئ'),
  ('إطار قوس قزح', 'special_rainbow', 30, 10000, '🌈', 'إطار بألوان قوس قزح')
ON CONFLICT (type) DO NOTHING;

-- الهدايا الافتراضية
INSERT INTO gifts (name, emoji, price_points, category) VALUES
  -- رومانسية
  ('وردة حمراء', '🌹', 100, 'romantic'),
  ('باقة ورود', '💐', 500, 'romantic'),
  ('قلب', '❤️', 200, 'romantic'),
  ('خاتم', '💍', 2000, 'romantic'),
  ('شوكولاتة', '🍫', 150, 'romantic'),
  
  -- مضحكة
  ('وجه مضحك', '😂', 50, 'funny'),
  ('بالون', '🎈', 100, 'funny'),
  ('كيك', '🎂', 300, 'funny'),
  ('آيس كريم', '🍦', 80, 'funny'),
  
  -- فاخرة
  ('تاج', '👑', 5000, 'luxury'),
  ('ألماسة', '💎', 10000, 'luxury'),
  ('سيارة', '🚗', 20000, 'luxury'),
  ('طائرة', '✈️', 50000, 'luxury'),
  ('يخت', '🛥️', 100000, 'luxury'),
  
  -- عامة
  ('نجمة', '⭐', 150, 'general'),
  ('كأس', '🏆', 400, 'general'),
  ('ميدالية', '🏅', 300, 'general'),
  ('هدية', '🎁', 250, 'general')
ON CONFLICT DO NOTHING;

-- ====================================
-- 11. Functions مساعدة
-- ====================================

-- Function لتحديث عداد الزوار
CREATE OR REPLACE FUNCTION update_visitor_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE users 
  SET visitor_count = (
    SELECT COUNT(DISTINCT visitor_user_id) 
    FROM profile_visitors 
    WHERE profile_user_id = NEW.profile_user_id
  )
  WHERE id = NEW.profile_user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger لتحديث عداد الزوار تلقائياً
DROP TRIGGER IF EXISTS trigger_update_visitor_count ON profile_visitors;
CREATE TRIGGER trigger_update_visitor_count
AFTER INSERT ON profile_visitors
FOR EACH ROW
EXECUTE FUNCTION update_visitor_count();

-- Function لتحديث عدد الإعجابات على التعليقات
CREATE OR REPLACE FUNCTION update_comment_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE wall_comments 
    SET likes_count = likes_count + 1
    WHERE id = NEW.comment_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE wall_comments 
    SET likes_count = likes_count - 1
    WHERE id = OLD.comment_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger لتحديث عدد الإعجابات تلقائياً
DROP TRIGGER IF EXISTS trigger_update_comment_likes_count ON comment_likes;
CREATE TRIGGER trigger_update_comment_likes_count
AFTER INSERT OR DELETE ON comment_likes
FOR EACH ROW
EXECUTE FUNCTION update_comment_likes_count();

-- ====================================
-- 12. إعطاء الإطارات الافتراضية لجميع المستخدمين
-- ====================================

-- إعطاء الإطار البرونزي لجميع المستخدمين
INSERT INTO user_frames (user_id, frame_id, equipped)
SELECT 
  u.id,
  (SELECT id FROM profile_frames WHERE type = 'bronze'),
  TRUE
FROM users u
WHERE NOT EXISTS (
  SELECT 1 FROM user_frames uf 
  WHERE uf.user_id = u.id 
  AND uf.frame_id = (SELECT id FROM profile_frames WHERE type = 'bronze')
)
ON CONFLICT DO NOTHING;

-- تحديث frame_type لجميع المستخدمين حسب مستواهم
UPDATE users SET frame_type = 
  CASE 
    WHEN level >= 100 THEN 'legendary'
    WHEN level >= 50 THEN 'diamond'
    WHEN level >= 30 THEN 'gold'
    WHEN level >= 15 THEN 'silver'
    ELSE 'bronze'
  END
WHERE frame_type IS NULL OR frame_type = 'bronze';

-- منح الإطارات المناسبة حسب المستوى
INSERT INTO user_frames (user_id, frame_id, equipped)
SELECT 
  u.id,
  pf.id,
  (pf.type = u.frame_type) -- تفعيل الإطار المناسب للمستوى
FROM users u
CROSS JOIN profile_frames pf
WHERE pf.min_level <= COALESCE(u.level, 0)
  AND pf.is_special = FALSE
  AND NOT EXISTS (
    SELECT 1 FROM user_frames uf 
    WHERE uf.user_id = u.id AND uf.frame_id = pf.id
  )
ON CONFLICT DO NOTHING;

-- ====================================
-- النهاية
-- ====================================

-- إضافة تعليق على الـ migration
COMMENT ON TABLE profile_visitors IS 'تسجيل زيارات المستخدمين للملفات الشخصية';
COMMENT ON TABLE profile_frames IS 'الإطارات المتاحة للملفات الشخصية';
COMMENT ON TABLE user_frames IS 'الإطارات التي يملكها كل مستخدم';
COMMENT ON TABLE gifts IS 'الهدايا المتاحة للشراء';
COMMENT ON TABLE user_gifts IS 'الهدايا المرسلة بين المستخدمين';
COMMENT ON TABLE wall_comments IS 'التعليقات على منشورات الحائط';
COMMENT ON TABLE comment_likes IS 'إعجابات التعليقات';
COMMENT ON TABLE notifications IS 'نظام الإشعارات المتقدم';
