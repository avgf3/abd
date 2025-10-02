DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'room_id') THEN
        ALTER TABLE "messages" ADD COLUMN "room_id" text DEFAULT 'general';
    END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'profile_effect') THEN
        ALTER TABLE "users" ADD COLUMN "profile_effect" text DEFAULT 'none';
    END IF;
END $$;