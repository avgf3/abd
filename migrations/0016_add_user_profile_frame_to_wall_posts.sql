-- Add user_profile_frame to wall_posts so VIP frames render on walls
ALTER TABLE wall_posts
  ADD COLUMN IF NOT EXISTS user_profile_frame TEXT;