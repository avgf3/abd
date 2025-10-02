-- Ensure default username color is blue and backfill old/white values
ALTER TABLE IF EXISTS users ALTER COLUMN username_color SET DEFAULT '#4A90E2';

-- Backfill existing invalid/empty/white username colors to blue
UPDATE users
SET username_color = '#4A90E2'
WHERE username_color IS NULL
   OR username_color = ''
   OR username_color = 'null'
   OR username_color = 'undefined'
   OR lower(username_color) IN ('#ffffff', '#fff');

-- Optional: update wall_posts colors that are white
UPDATE wall_posts
SET username_color = '#4A90E2'
WHERE username_color IS NULL
   OR username_color = ''
   OR username_color = 'null'
   OR username_color = 'undefined'
   OR lower(username_color) IN ('#ffffff', '#fff');
