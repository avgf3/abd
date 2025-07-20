-- Emergency fix for missing points system columns
-- Run this directly in your PostgreSQL database console

-- Add missing points columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_points INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS level_progress INTEGER DEFAULT 0;

-- Update existing users with default values
UPDATE users 
SET 
  points = COALESCE(points, 0),
  level = COALESCE(level, 1),
  total_points = COALESCE(total_points, 0),
  level_progress = COALESCE(level_progress, 0)
WHERE points IS NULL OR level IS NULL OR total_points IS NULL OR level_progress IS NULL;

-- Create points_history table
CREATE TABLE IF NOT EXISTS points_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  points INTEGER NOT NULL,
  reason TEXT NOT NULL,
  action TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create level_settings table
CREATE TABLE IF NOT EXISTS level_settings (
  id SERIAL PRIMARY KEY,
  level INTEGER NOT NULL UNIQUE,
  required_points INTEGER NOT NULL,
  title TEXT NOT NULL,
  color TEXT DEFAULT '#FFFFFF',
  benefits JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert default level settings
INSERT INTO level_settings (level, required_points, title, color, benefits) VALUES
(1, 0, 'مبتدئ', '#A8A8A8', '{}'),
(2, 100, 'متفاعل', '#90EE90', '{}'),
(3, 300, 'نشيط', '#87CEEB', '{}'),
(4, 600, 'متميز', '#DDA0DD', '{}'),
(5, 1000, 'خبير', '#F0E68C', '{}'),
(6, 1500, 'محترف', '#FFA500', '{}'),
(7, 2500, 'أسطورة', '#FF6347', '{}'),
(8, 4000, 'عبقري', '#FF1493', '{}'),
(9, 6000, 'ملك', '#FFD700', '{}'),
(10, 10000, 'إمبراطور', '#8A2BE2', '{}')
ON CONFLICT (level) DO NOTHING;

-- Verify the columns exist
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('points', 'level', 'total_points', 'level_progress')
ORDER BY column_name;