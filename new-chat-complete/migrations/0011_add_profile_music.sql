-- Migration: Add profile music fields to users
-- Date: 2025-08-31

-- Add columns if they do not exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'profile_music_url'
    ) THEN
        ALTER TABLE users ADD COLUMN profile_music_url TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'profile_music_title'
    ) THEN
        ALTER TABLE users ADD COLUMN profile_music_title TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'profile_music_enabled'
    ) THEN
        ALTER TABLE users ADD COLUMN profile_music_enabled BOOLEAN DEFAULT TRUE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'profile_music_volume'
    ) THEN
        ALTER TABLE users ADD COLUMN profile_music_volume INTEGER DEFAULT 70;
    END IF;
END $$;

-- Backfill sane defaults
UPDATE users 
SET 
  profile_music_enabled = COALESCE(profile_music_enabled, TRUE),
  profile_music_volume = COALESCE(profile_music_volume, 70)
WHERE TRUE;

