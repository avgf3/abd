-- Migration: Add badge column to level_settings (safe)
-- Date: 2025-08-09

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'level_settings' AND column_name = 'badge'
    ) THEN
        ALTER TABLE level_settings ADD COLUMN badge text;
    END IF;
END $$;