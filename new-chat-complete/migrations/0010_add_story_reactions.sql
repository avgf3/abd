CREATE TABLE IF NOT EXISTS story_reactions (
  id SERIAL PRIMARY KEY,
  story_id INTEGER NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  reacted_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_story_reactions_story ON story_reactions (story_id);
CREATE INDEX IF NOT EXISTS idx_story_reactions_user ON story_reactions (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_story_reactions_unique ON story_reactions (story_id, user_id);
