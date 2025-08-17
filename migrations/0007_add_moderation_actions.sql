-- Migration: Add moderation_actions persistent table
-- Date: 2025-08-17

-- Create moderation_actions table if not exists
CREATE TABLE IF NOT EXISTS "moderation_actions" (
  "id" text PRIMARY KEY NOT NULL,
  "type" text NOT NULL,
  "target_user_id" integer NOT NULL,
  "moderator_id" integer NOT NULL,
  "reason" text NOT NULL,
  "duration" integer,
  "timestamp" timestamp DEFAULT now(),
  "ip_address" text,
  "device_id" text
);

-- Add foreign keys if not exists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'moderation_actions_target_user_id_users_id_fk'
  ) THEN
    ALTER TABLE "moderation_actions" 
      ADD CONSTRAINT "moderation_actions_target_user_id_users_id_fk" 
      FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id") 
      ON DELETE NO ACTION ON UPDATE NO ACTION;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'moderation_actions_moderator_id_users_id_fk'
  ) THEN
    ALTER TABLE "moderation_actions" 
      ADD CONSTRAINT "moderation_actions_moderator_id_users_id_fk" 
      FOREIGN KEY ("moderator_id") REFERENCES "public"."users"("id") 
      ON DELETE NO ACTION ON UPDATE NO ACTION;
  END IF;
END $$;

-- Index to speed up queries by timestamp
CREATE INDEX IF NOT EXISTS idx_moderation_actions_time ON moderation_actions ("timestamp" DESC);