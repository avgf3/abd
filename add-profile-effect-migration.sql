-- Migration: Add profile_effect column to users table
-- Date: 2025-07-21

-- Add profile_effect column for PostgreSQL
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_effect TEXT DEFAULT 'none';

-- For SQLite (if using SQLite fallback)
-- ALTER TABLE users ADD COLUMN profile_effect TEXT DEFAULT 'none';

-- Update existing users to have default effect
UPDATE users SET profile_effect = 'none' WHERE profile_effect IS NULL;