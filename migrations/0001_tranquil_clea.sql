CREATE TABLE IF NOT EXISTS "level_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"level" integer NOT NULL,
	"required_points" integer NOT NULL,
	"title" text NOT NULL,
	"color" text DEFAULT '#FFFFFF',
	"benefits" jsonb,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "level_settings_level_unique" UNIQUE("level")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "points_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"points" integer NOT NULL,
	"reason" text NOT NULL,
	"action" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'points') THEN
        ALTER TABLE "users" ADD COLUMN "points" integer DEFAULT 0;
    END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'level') THEN
        ALTER TABLE "users" ADD COLUMN "level" integer DEFAULT 1;
    END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'total_points') THEN
        ALTER TABLE "users" ADD COLUMN "total_points" integer DEFAULT 0;
    END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'level_progress') THEN
        ALTER TABLE "users" ADD COLUMN "level_progress" integer DEFAULT 0;
    END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'points_history_user_id_users_id_fk') THEN
        ALTER TABLE "points_history" ADD CONSTRAINT "points_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
    END IF;
END $$;