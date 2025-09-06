-- Add chat lock settings to rooms table
-- This migration adds two new columns for chat locking functionality

-- Add chat_lock_all column (blocks all users except owner from chatting)
ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "chat_lock_all" boolean DEFAULT false;

-- Add chat_lock_visitors column (blocks only guest users from chatting)
ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "chat_lock_visitors" boolean DEFAULT false;

-- Update existing rooms to have chat lock settings as false
UPDATE "rooms" SET "chat_lock_all" = false WHERE "chat_lock_all" IS NULL;
UPDATE "rooms" SET "chat_lock_visitors" = false WHERE "chat_lock_visitors" IS NULL;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS "idx_rooms_chat_lock_all" ON "rooms" ("chat_lock_all");
CREATE INDEX IF NOT EXISTS "idx_rooms_chat_lock_visitors" ON "rooms" ("chat_lock_visitors");

-- Add comment explaining the chat lock functionality
COMMENT ON COLUMN "rooms"."chat_lock_all" IS 'When true, only room owner can send messages in this room';
COMMENT ON COLUMN "rooms"."chat_lock_visitors" IS 'When true, only registered members (non-guests) can send messages in this room';