-- Add is_locked column to rooms table
ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "is_locked" boolean DEFAULT false;

-- Update existing rooms to have is_locked as false
UPDATE "rooms" SET "is_locked" = false WHERE "is_locked" IS NULL;