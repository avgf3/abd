ALTER TABLE "messages" ADD COLUMN "room_id" text DEFAULT 'general';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "profile_effect" text DEFAULT 'none';