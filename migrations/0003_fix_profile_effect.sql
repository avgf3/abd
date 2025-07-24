-- Migration: Fix missing profile_effect column
-- Date: 2025-01-07

-- Add profile_effect column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'profile_effect') THEN
        ALTER TABLE users ADD COLUMN profile_effect TEXT DEFAULT 'none';
    END IF;
END $$;

-- Update existing users to have default effect
UPDATE users SET profile_effect = 'none' WHERE profile_effect IS NULL;

-- Ensure level_settings table exists with proper handling
CREATE TABLE IF NOT EXISTS "level_settings" (
    "id" serial PRIMARY KEY NOT NULL,
    "level" integer NOT NULL,
    "required_points" integer NOT NULL,
    "title" text NOT NULL,
    "color" text DEFAULT '#FFFFFF',
    "benefits" jsonb,
    "created_at" timestamp DEFAULT now(),
    CONSTRAINT "level_settings_level_unique" UNIQUE("level")
);

-- Insert default level settings if table is empty
INSERT INTO level_settings (level, required_points, title, color, benefits)
VALUES 
    (1, 0, 'مبتدئ', '#808080', '{"description": "مستوى البداية"}'),
    (2, 100, 'نشيط', '#4169E1', '{"description": "عضو نشيط"}'),
    (3, 500, 'متقدم', '#32CD32', '{"description": "عضو متقدم"}'),
    (4, 1000, 'خبير', '#FFD700', '{"description": "عضو خبير"}'),
    (5, 2000, 'نجم', '#FF4500', '{"description": "عضو نجم"}')
ON CONFLICT (level) DO NOTHING;