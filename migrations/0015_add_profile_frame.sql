-- Add profile_frame column to users table to store selected avatar frame
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_frame TEXT;

-- Optional: create a simple check to limit length
-- NOTE: Postgres TEXT has no length limit; this is just defensive.
-- You can extend with a FK to a frames table later if needed.
