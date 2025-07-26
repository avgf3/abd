-- Migration: Add rooms tables for broadcast functionality
-- Date: 2025-01-07

-- Create rooms table if it doesn't exist
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

-- Create room_users table if it doesn't exist
CREATE TABLE IF NOT EXISTS "room_users" (
    "id" serial PRIMARY KEY NOT NULL,
    "user_id" integer NOT NULL,
    "room_id" text NOT NULL,
    "joined_at" timestamp DEFAULT now(),
    UNIQUE("user_id", "room_id")
);

-- Add foreign key constraints if they don't exist
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'rooms_created_by_users_id_fk') THEN
        ALTER TABLE "rooms" ADD CONSTRAINT "rooms_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'rooms_host_id_users_id_fk') THEN
        ALTER TABLE "rooms" ADD CONSTRAINT "rooms_host_id_users_id_fk" FOREIGN KEY ("host_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'room_users_user_id_users_id_fk') THEN
        ALTER TABLE "room_users" ADD CONSTRAINT "room_users_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'room_users_room_id_rooms_id_fk') THEN
        ALTER TABLE "room_users" ADD CONSTRAINT "room_users_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE no action ON UPDATE no action;
    END IF;
END $$;

-- Insert default rooms if they don't exist
INSERT INTO rooms (id, name, description, icon, created_by, is_default, is_active, is_broadcast, host_id, speakers, mic_queue)
VALUES 
    ('general', 'الدردشة العامة', 'الغرفة الرئيسية للدردشة', '', 1, true, true, false, null, '[]', '[]'),
    ('broadcast', 'غرفة البث المباشر', 'غرفة خاصة للبث المباشر مع نظام المايك', '', 1, false, true, true, 1, '[]', '[]'),
    ('music', 'أغاني وسهر', 'غرفة للموسيقى والترفيه', '', 1, false, true, false, null, '[]', '[]')
ON CONFLICT (id) DO NOTHING;