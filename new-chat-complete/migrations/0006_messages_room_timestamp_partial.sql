-- Optimize room messages listing by room and recency
-- Partial index to exclude deleted/private messages
CREATE INDEX IF NOT EXISTS idx_room_messages_recent
ON messages (room_id, timestamp DESC)
WHERE deleted_at IS NULL AND is_private = FALSE;

-- Supporting index for count queries by room
CREATE INDEX IF NOT EXISTS idx_room_messages_count
ON messages (room_id)
WHERE deleted_at IS NULL AND is_private = FALSE;
