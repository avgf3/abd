-- Migration: Rooms and Room Members with soft delete and indexes
-- Date: 2025-08-09

-- Enable citext for case-insensitive slug if not exists
CREATE EXTENSION IF NOT EXISTS citext;

-- 1) Add soft delete, slug, last_message_at to rooms (PostgreSQL schema currently uses text id)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'rooms' AND column_name = 'deleted_at'
    ) THEN
        ALTER TABLE rooms ADD COLUMN deleted_at TIMESTAMPTZ;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'rooms' AND column_name = 'last_message_at'
    ) THEN
        ALTER TABLE rooms ADD COLUMN last_message_at TIMESTAMPTZ;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'rooms' AND column_name = 'slug'
    ) THEN
        ALTER TABLE rooms ADD COLUMN slug CITEXT;
        -- initialize slug from id or name if possible
        UPDATE rooms SET slug = COALESCE(NULLIF(id, ''), NULLIF(name, ''))::citext WHERE slug IS NULL;
    END IF;
END $$;

-- Drop direct unique index on slug if exists and replace with partial unique on active rooms only
DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' AND indexname = 'rooms_slug_key'
    ) THEN
        DROP INDEX rooms_slug_key;
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_rooms_slug_active
  ON rooms (slug)
  WHERE deleted_at IS NULL AND slug IS NOT NULL;

-- Active rooms filter index
CREATE INDEX IF NOT EXISTS idx_rooms_active ON rooms (deleted_at) WHERE deleted_at IS NULL;

-- 2) Create room_members pivot with per-room moderation fields
CREATE TABLE IF NOT EXISTS room_members (
  room_id       TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role          TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner','admin','moderator','member')),
  muted_until   TIMESTAMPTZ,
  banned_until  TIMESTAMPTZ,
  joined_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (room_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_room_members_roles ON room_members (room_id, role);
CREATE INDEX IF NOT EXISTS idx_room_members_user ON room_members (user_id);
CREATE INDEX IF NOT EXISTS idx_room_members_mute ON room_members (room_id, muted_until) WHERE muted_until IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_room_members_ban  ON room_members (room_id, banned_until) WHERE banned_until IS NOT NULL;

-- Ensure only one owner per room
CREATE UNIQUE INDEX IF NOT EXISTS uniq_room_owner ON room_members (room_id) WHERE role = 'owner';

-- Backfill owner membership based on rooms.created_by if present
INSERT INTO room_members (room_id, user_id, role)
SELECT r.id, r.created_by, 'owner'
FROM rooms r
LEFT JOIN room_members rm ON rm.room_id = r.id AND rm.role = 'owner'
WHERE r.created_by IS NOT NULL AND rm.room_id IS NULL;

-- 3) Messages soft delete and metadata
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' AND column_name = 'deleted_at'
    ) THEN
        ALTER TABLE messages ADD COLUMN deleted_at TIMESTAMPTZ;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' AND column_name = 'edited_at'
    ) THEN
        ALTER TABLE messages ADD COLUMN edited_at TIMESTAMPTZ;
    END IF;
END $$;

-- attachments as JSONB default []
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' AND column_name = 'attachments'
    ) THEN
        ALTER TABLE messages ADD COLUMN attachments JSONB;
    END IF;
END $$;

ALTER TABLE messages ALTER COLUMN attachments SET DEFAULT '[]'::jsonb;

-- Index for room messages by timestamp excluding soft-deleted
DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_messages_room_time'
    ) THEN
        DROP INDEX idx_messages_room_time;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_messages_room_time
  ON messages (room_id, "timestamp" DESC)
  WHERE deleted_at IS NULL;

-- 4) Trigger to update rooms.last_message_at when a new non-deleted message is inserted (public messages only)
CREATE OR REPLACE FUNCTION set_room_last_message_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.deleted_at IS NULL AND NEW.is_private = false THEN
    UPDATE rooms SET last_message_at = NEW."timestamp" WHERE id = NEW.room_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_messages_set_last ON messages;
CREATE TRIGGER trg_messages_set_last
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION set_room_last_message_at();