-- Remove default for bots.status and clear existing textual defaults
ALTER TABLE IF EXISTS bots ALTER COLUMN status DROP DEFAULT;

-- Normalize existing rows: set status to NULL where it equals the old default
UPDATE bots SET status = NULL WHERE status = 'بوت نشط';
