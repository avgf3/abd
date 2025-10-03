-- Add dm_privacy column to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS dm_privacy TEXT NOT NULL DEFAULT 'all';

-- Backfill any invalid values
UPDATE users
SET dm_privacy = 'all'
WHERE dm_privacy IS NULL OR dm_privacy NOT IN ('all','friends','none');