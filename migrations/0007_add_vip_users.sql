-- Migration: Create vip_users table and supporting indexes
-- Created: 2025-08-21

-- Create vip_users table if not exists
CREATE TABLE IF NOT EXISTS vip_users (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Ensure one VIP record per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_vip_users_user_unique ON vip_users(user_id);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_vip_users_created_at ON vip_users(created_at DESC);
