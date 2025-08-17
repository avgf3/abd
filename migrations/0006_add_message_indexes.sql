-- Migration: Add indexes for optimizing private message queries
-- Created: 2025-01-27

-- Index for private message queries (optimizes sender-receiver lookup with timestamp)
CREATE INDEX IF NOT EXISTS idx_private_messages ON messages (is_private, sender_id, receiver_id, timestamp DESC);

-- Index for room message queries (optimizes room message lookup with timestamp)
CREATE INDEX IF NOT EXISTS idx_room_messages ON messages (room_id, timestamp DESC);

-- Index for sender-receiver relationship (optimizes user conversation lookup)
CREATE INDEX IF NOT EXISTS idx_sender_receiver ON messages (sender_id, receiver_id);

-- Index for timestamp ordering (optimizes general message ordering)
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages (timestamp DESC);

-- Additional composite index for private message conversations
CREATE INDEX IF NOT EXISTS idx_private_conversation ON messages (is_private, sender_id, receiver_id, timestamp DESC) 
WHERE is_private = true;

-- Index for message deletion queries
CREATE INDEX IF NOT EXISTS idx_messages_deleted ON messages (deleted_at) 
WHERE deleted_at IS NOT NULL;

-- Optimize LIKE searches on messages.content (PostgreSQL)
-- Requires pg_trgm extension
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_messages_content_trgm ON messages USING gin (content gin_trgm_ops);