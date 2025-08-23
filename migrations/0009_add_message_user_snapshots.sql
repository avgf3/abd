-- Preserve sender and receiver identity snapshots on each message
ALTER TABLE messages ADD COLUMN IF NOT EXISTS sender_username_snapshot TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS sender_profile_image_snapshot TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS sender_user_type_snapshot TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS sender_username_color_snapshot TEXT;

ALTER TABLE messages ADD COLUMN IF NOT EXISTS receiver_username_snapshot TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS receiver_profile_image_snapshot TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS receiver_user_type_snapshot TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS receiver_username_color_snapshot TEXT;