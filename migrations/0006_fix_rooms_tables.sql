-- Migration: Fix rooms tables and add missing constraints
-- Date: 2025-01-07

-- Drop existing tables if they exist (for clean slate)
DROP TABLE IF EXISTS "room_users" CASCADE;
DROP TABLE IF EXISTS "rooms" CASCADE;

-- Create rooms table with proper structure
CREATE TABLE IF NOT EXISTS "rooms" (
    "id" text PRIMARY KEY NOT NULL,
    "name" text NOT NULL,
    "description" text,
    "icon" text,
    "created_by" integer NOT NULL,
    "is_default" boolean DEFAULT false,
    "is_active" boolean DEFAULT true,
    "is_broadcast" boolean DEFAULT false,
    "host_id" integer,
    "speakers" text DEFAULT '[]',
    "mic_queue" text DEFAULT '[]',
    "created_at" timestamp DEFAULT now()
);

-- Create room_users table with proper structure
CREATE TABLE IF NOT EXISTS "room_users" (
    "id" serial PRIMARY KEY NOT NULL,
    "user_id" integer NOT NULL,
    "room_id" text NOT NULL,
    "joined_at" timestamp DEFAULT now(),
    UNIQUE("user_id", "room_id")
);

-- Add foreign key constraints
ALTER TABLE "rooms" 
ADD CONSTRAINT "rooms_created_by_users_id_fk" 
FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE;

ALTER TABLE "rooms" 
ADD CONSTRAINT "rooms_host_id_users_id_fk" 
FOREIGN KEY ("host_id") REFERENCES "users"("id") ON DELETE SET NULL;

ALTER TABLE "room_users" 
ADD CONSTRAINT "room_users_user_id_users_id_fk" 
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;

ALTER TABLE "room_users" 
ADD CONSTRAINT "room_users_room_id_rooms_id_fk" 
FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE;

-- Insert default rooms
INSERT INTO rooms (id, name, description, icon, created_by, is_default, is_active, is_broadcast, host_id, speakers, mic_queue)
VALUES 
    ('general', 'الدردشة العامة', 'الغرفة الرئيسية للدردشة', '', 1, true, true, false, null, '[]', '[]'),
    ('broadcast', 'غرفة البث المباشر', 'غرفة خاصة للبث المباشر مع نظام المايك', '', 1, false, true, true, 1, '[]', '[]'),
    ('music', 'أغاني وسهر', 'غرفة للموسيقى والترفيه', '', 1, false, true, false, null, '[]', '[]')
ON CONFLICT (id) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "idx_rooms_is_active" ON "rooms"("is_active");
CREATE INDEX IF NOT EXISTS "idx_rooms_is_broadcast" ON "rooms"("is_broadcast");
CREATE INDEX IF NOT EXISTS "idx_room_users_user_id" ON "room_users"("user_id");
CREATE INDEX IF NOT EXISTS "idx_room_users_room_id" ON "room_users"("room_id");