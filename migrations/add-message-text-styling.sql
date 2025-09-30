-- Migration: Add text styling fields to messages table
-- Date: 2025-01-01
-- Description: Add textColor and bold fields to support text styling in messages

-- Add textColor column to messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS text_color TEXT;

-- Add bold column to messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS bold BOOLEAN DEFAULT false;

-- Create index for better query performance (optional)
CREATE INDEX IF NOT EXISTS idx_messages_text_styling ON messages(text_color, bold);